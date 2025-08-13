import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia"
});

export async function POST(request: NextRequest) {
  try {
    const { kit_id, plan_type = "solo", success_url, cancel_url } = await request.json();

    if (!kit_id) {
      return NextResponse.json(
        { error: "Kit ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get kit details
    const { data: kit, error: kitError } = await supabase
      .from("kits")
      .select("*")
      .eq("id", kit_id)
      .single();

    if (kitError || !kit) {
      return NextResponse.json(
        { error: "Kit not found" },
        { status: 404 }
      );
    }

    // Define pricing
    const pricing = {
      solo: {
        amount: 4900, // $49.00 in cents
        name: "Solo Kit",
        description: "Complete 9-document hiring kit with instant download"
      },
      pro: {
        amount: 12900, // $129.00 in cents
        name: "Pro Kit + Human Review",
        description: "Complete hiring kit with expert review in 4 business hours"
      }
    };

    const selectedPlan = pricing[plan_type as keyof typeof pricing];
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url,
      cancel_url,
      metadata: {
        kit_id,
        plan_type,
        user_id: kit.user_id
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${selectedPlan.name} - ${kit.title}`,
              description: selectedPlan.description,
              metadata: {
                kit_id,
                plan_type
              }
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    // Create order record
    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        org_id: kit.org_id || "00000000-0000-0000-0000-000000000000", // Default org for now
        user_id: kit.user_id,
        kit_id: kit_id,
        status: "awaiting_payment",
        stripe_session_id: session.id,
        total_cents: selectedPlan.amount
      });

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}