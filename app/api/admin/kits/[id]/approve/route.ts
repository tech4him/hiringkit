import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitId } = await context.params;
    
    if (!kitId) {
      return NextResponse.json(
        { error: "Kit ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Update kit status
    const { error: kitError } = await supabase
      .from("kits")
      .update({ 
        status: "published",
        qa_required: false
      })
      .eq("id", kitId);

    if (kitError) {
      console.error("Error updating kit:", kitError);
      return NextResponse.json(
        { error: "Failed to update kit" },
        { status: 500 }
      );
    }

    // Update order status from qa_pending to ready
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "ready" })
      .eq("kit_id", kitId)
      .eq("status", "qa_pending");

    if (orderError) {
      console.error("Error updating order:", orderError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // TODO: Send notification email to user that their kit is ready

    return NextResponse.json({ 
      success: true,
      message: "Kit approved and ready for download" 
    });

  } catch (error) {
    console.error("Kit approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve kit" },
      { status: 500 }
    );
  }
}