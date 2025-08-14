import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kitId: string }> }
) {
  try {
    const { kitId } = await context.params;
    
    if (!kitId) {
      return NextResponse.json(
        { error: "Kit ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get order details for this kit
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        kits (
          title,
          status,
          qa_required
        )
      `)
      .eq("kit_id", kitId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Determine plan type from total_cents
    const planType = order.total_cents >= 10000 ? "pro" : "solo";

    return NextResponse.json({
      id: order.id,
      status: order.status,
      plan_type: planType,
      total_cents: order.total_cents,
      kit: order.kits,
      created_at: order.created_at
    });

  } catch (error) {
    console.error("Order status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order status" },
      { status: 500 }
    );
  }
}