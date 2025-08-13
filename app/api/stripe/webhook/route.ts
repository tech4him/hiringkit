import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia"
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.payment_status === "paid") {
          // Update order status
          const { error: orderError } = await supabase
            .from("orders")
            .update({ 
              status: session.metadata?.plan_type === "pro" ? "qa_pending" : "paid"
            })
            .eq("stripe_session_id", session.id);

          if (orderError) {
            console.error("Error updating order:", orderError);
            break;
          }

          // If it's a Pro plan, mark kit for QA
          if (session.metadata?.plan_type === "pro") {
            const { error: kitError } = await supabase
              .from("kits")
              .update({ 
                qa_required: true,
                status: "editing"
              })
              .eq("id", session.metadata.kit_id);

            if (kitError) {
              console.error("Error updating kit for QA:", kitError);
            }
          }

          // TODO: Send confirmation email
          console.log("Payment successful for session:", session.id);
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle async payment success (e.g., bank transfers)
        const { error: orderError } = await supabase
          .from("orders")
          .update({ 
            status: session.metadata?.plan_type === "pro" ? "qa_pending" : "paid"
          })
          .eq("stripe_session_id", session.id);

        if (orderError) {
          console.error("Error updating order for async payment:", orderError);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle async payment failure
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "draft" })
          .eq("stripe_session_id", session.id);

        if (orderError) {
          console.error("Error updating order for failed payment:", orderError);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}