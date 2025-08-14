import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/client";
import { headers } from "next/headers";
import { logWebhook, logError } from "@/lib/logger";
import { env } from "@/lib/config/env";
import { sendOrderConfirmationEmail } from "@/lib/email/resend";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia"
});

const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logError(err as Error, {
        context: 'webhook_signature_verification',
        hasSignature: !!signature,
      });
      
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if this event has already been processed (idempotency)
    const { data: existingEvent, error: checkError } = await supabase
      .from("webhook_events")
      .select("event_id, processing_status")
      .eq("event_id", event.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logError(new Error(checkError.message), {
        context: 'webhook_idempotency_check',
        eventId: event.id,
        eventType: event.type,
      });
      
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (existingEvent) {
      if (existingEvent.processing_status === 'completed') {
        logWebhook(event.type, event.id, {
          status: 'already_processed',
          message: 'Event already processed successfully',
        });
        
        return NextResponse.json({ 
          received: true, 
          message: "Event already processed" 
        });
      }
      
      if (existingEvent.processing_status === 'processing') {
        logWebhook(event.type, event.id, {
          status: 'currently_processing',
          message: 'Event is currently being processed',
        });
        
        return NextResponse.json({ 
          received: true, 
          message: "Event is being processed" 
        });
      }
    }

    // Record the event as being processed
    const { error: insertError } = await supabase
      .from("webhook_events")
      .upsert({
        event_id: event.id,
        event_type: event.type,
        metadata: {
          created: event.created,
          livemode: event.livemode,
          pending_webhooks: event.pending_webhooks,
          api_version: event.api_version,
        },
        processing_status: 'processing',
      }, {
        onConflict: 'event_id'
      });

    if (insertError) {
      logError(new Error(insertError.message), {
        context: 'webhook_event_recording',
        eventId: event.id,
        eventType: event.type,
      });
      
      return NextResponse.json(
        { error: "Failed to record event" },
        { status: 500 }
      );
    }

    logWebhook(event.type, event.id, {
      status: 'processing_started',
      livemode: event.livemode,
    });

    try {
      // Process the webhook event
      await processWebhookEvent(event, supabase);

      // Mark event as completed
      await supabase
        .from("webhook_events")
        .update({ 
          processing_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", event.id);

      logWebhook(event.type, event.id, {
        status: 'completed',
        message: 'Event processed successfully',
      });

      return NextResponse.json({ received: true });

    } catch (processingError) {
      // Mark event as failed
      await supabase
        .from("webhook_events")
        .update({ 
          processing_status: 'failed',
          error_message: (processingError as Error).message,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", event.id);

      logError(processingError as Error, {
        context: 'webhook_event_processing',
        eventId: event.id,
        eventType: event.type,
      });

      return NextResponse.json(
        { error: "Event processing failed" },
        { status: 500 }
      );
    }

  } catch (error) {
    logError(error as Error, {
      context: 'webhook_route',
      path: request.nextUrl.pathname,
    });
    
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Separate function to process webhook events
async function processWebhookEvent(event: Stripe.Event, supabase: any) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.payment_status === "paid") {
        // Update order status
        const { error: orderError } = await supabase
          .from("orders")
          .update({ 
            status: session.metadata?.plan_type === "pro" ? "qa_pending" : "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id);

        if (orderError) {
          throw new Error(`Failed to update order: ${orderError.message}`);
        }

        // If it's a Pro plan, mark kit for QA
        if (session.metadata?.plan_type === "pro") {
          const { error: kitError } = await supabase
            .from("kits")
            .update({ 
              qa_required: true,
              status: "editing",
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.metadata.kit_id);

          if (kitError) {
            throw new Error(`Failed to update kit for QA: ${kitError.message}`);
          }
        }

        // Send confirmation email
        try {
          // Get order and kit details for email
          const { data: order } = await supabase
            .from("orders")
            .select(`
              *,
              kits (
                id,
                title,
                user_id
              )
            `)
            .eq("stripe_session_id", session.id)
            .single();

          if (order?.kits && session.customer_details?.email) {
            const emailResult = await sendOrderConfirmationEmail({
              customerEmail: session.customer_details.email,
              customerName: session.customer_details.name || undefined,
              kitTitle: order.kits.title,
              planType: session.metadata?.plan_type as 'solo' | 'pro',
              amount: order.total_cents,
              orderNumber: order.id,
              downloadUrl: session.metadata?.plan_type === 'solo' 
                ? `${env.NEXT_PUBLIC_APP_URL}/kit/${order.kit_id}/success`
                : undefined, // Pro plans wait for approval
            });

            if (!emailResult.success) {
              logError(new Error(`Failed to send confirmation email: ${emailResult.error}`), {
                context: 'email_confirmation_failed',
                orderNumber: order.id,
                customerEmail: session.customer_details.email,
              });
            }
          }
        } catch (emailError) {
          logError(emailError as Error, {
            context: 'email_confirmation_error',
            sessionId: session.id,
          });
        }

        logWebhook('payment_processed', event.id, {
          sessionId: session.id,
          planType: session.metadata?.plan_type,
          kitId: session.metadata?.kit_id,
        });
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Handle async payment success (e.g., bank transfers)
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: session.metadata?.plan_type === "pro" ? "qa_pending" : "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      if (orderError) {
        throw new Error(`Failed to update order for async payment: ${orderError.message}`);
      }
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Handle async payment failure
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      if (orderError) {
        throw new Error(`Failed to update order for failed payment: ${orderError.message}`);
      }
      break;
    }

    default:
      logWebhook('unhandled_event', event.id, {
        eventType: event.type,
        message: `Unhandled event type: ${event.type}`,
      });
  }
}