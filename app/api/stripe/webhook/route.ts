import { NextRequest, NextResponse } from "next/server";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isNode = () => typeof process !== 'undefined' && !!process.versions?.node;

export async function POST(request: NextRequest) {
  try {
    // Only import server-only libs inside the handler, after we're on Node
    if (!isNode()) {
      return NextResponse.json(
        { error: "Server environment required" },
        { status: 500 }
      );
    }

    // Dynamic imports for server-only functionality
    const Stripe = (await import("stripe")).default;
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { headers } = await import("next/headers");
    // Removed logger import to prevent worker_threads error
    const { env } = await import("@/lib/config/env");
    const { sendOrderConfirmationEmail } = await import("@/lib/email/resend");

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      // Disable worker threads - use Node.js single-threaded async
      httpAgent: undefined,
      timeout: 60000,
    });

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('webhook_signature_verification error:', err, {
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
      console.error(new Error(checkError.message), {
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
        console.log(event.type, event.id, {
          status: 'already_processed',
          message: 'Event already processed successfully',
        });
        
        return NextResponse.json({ 
          received: true, 
          message: "Event already processed" 
        });
      }
      
      if (existingEvent.processing_status === 'processing') {
        console.log(event.type, event.id, {
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
      console.error(new Error(insertError.message), {
        context: 'webhook_event_recording',
        eventId: event.id,
        eventType: event.type,
      });
      
      return NextResponse.json(
        { error: "Failed to record event" },
        { status: 500 }
      );
    }

    console.log(event.type, event.id, {
      status: 'processing_started',
      livemode: event.livemode,
    });

    try {
      // Process the webhook event
      await processWebhookEvent(event, supabase, env, sendOrderConfirmationEmail);

      // Mark event as completed
      await supabase
        .from("webhook_events")
        .update({ 
          processing_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", event.id);

      console.log(event.type, event.id, {
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

      console.error(processingError as Error, {
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
    console.error('webhook_route error:', error);
    
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Separate function to process webhook events
async function processWebhookEvent(
  event: unknown, 
  supabase: unknown, 
  env: unknown, 
  sendOrderConfirmationEmail: unknown
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedEvent = event as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSupabase = supabase as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedEnv = env as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSendOrderConfirmationEmail = sendOrderConfirmationEmail as any;
  switch (typedEvent.type) {
    case "checkout.session.completed": {
      const session = typedEvent.data.object;
      
      if (session.payment_status === "paid") {
        // Update order status
        const { error: orderError } = await typedSupabase
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
          const { error: kitError } = await typedSupabase
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
          const { data: order } = await typedSupabase
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
            const emailResult = await typedSendOrderConfirmationEmail({
              customerEmail: session.customer_details.email,
              customerName: session.customer_details.name || undefined,
              kitTitle: order.kits.title,
              planType: session.metadata?.plan_type as 'solo' | 'pro',
              amount: order.total_cents,
              orderNumber: order.id,
              downloadUrl: session.metadata?.plan_type === 'solo' 
                ? `${typedEnv.NEXT_PUBLIC_APP_URL}/kit/${order.kit_id}/success`
                : undefined, // Pro plans wait for approval
            });

            if (!emailResult.success) {
              console.error('email_confirmation_failed error:', new Error(`Failed to send confirmation email: ${emailResult.error}`), {
                context: 'email_confirmation_failed',
                orderNumber: order.id,
                customerEmail: session.customer_details.email,
              });
            }
          }
        } catch (emailError) {
          console.error('email_confirmation_error:', emailError as Error, {
            context: 'email_confirmation_error',
            sessionId: session.id,
          });
        }

        console.log('payment_processed', typedEvent.id, {
          sessionId: session.id,
          planType: session.metadata?.plan_type,
          kitId: session.metadata?.kit_id,
        });
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = typedEvent.data.object;
      
      // Handle async payment success (e.g., bank transfers)
      const { error: orderError } = await typedSupabase
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
      const session = typedEvent.data.object;
      
      // Handle async payment failure
      const { error: orderError } = await typedSupabase
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
      console.log('unhandled_event', typedEvent.id, {
        eventType: typedEvent.type,
        message: `Unhandled event type: ${typedEvent.type}`,
      });
  }
}