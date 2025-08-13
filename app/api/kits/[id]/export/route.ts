import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generatePDF } from "@/lib/pdf/generator";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitId } = await context.params;
    const { export_type = "combined_pdf" } = await request.json();
    
    if (!kitId) {
      return NextResponse.json(
        { error: "Kit ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get kit and check if user has paid
    const { data: kit, error: kitError } = await supabase
      .from("kits")
      .select(`
        *,
        orders (
          status,
          total_cents
        )
      `)
      .eq("id", kitId)
      .single();

    if (kitError || !kit) {
      return NextResponse.json(
        { error: "Kit not found" },
        { status: 404 }
      );
    }

    // Check if kit has been paid for
    const paidOrder = kit.orders?.find((order: any) => 
      ["paid", "ready", "delivered"].includes(order.status)
    );

    if (!paidOrder) {
      return NextResponse.json(
        { error: "Kit must be purchased before export" },
        { status: 403 }
      );
    }

    // Generate PDF(s)
    const exportResult = await generatePDF(kit, export_type);

    if (!exportResult.success) {
      return NextResponse.json(
        { error: exportResult.error || "PDF generation failed" },
        { status: 500 }
      );
    }

    // Save export record
    const { data: exportRecord, error: exportError } = await supabase
      .from("exports")
      .insert({
        kit_id: kitId,
        kind: export_type,
        url: exportResult.url
      })
      .select()
      .single();

    if (exportError) {
      console.error("Error saving export record:", exportError);
      // Continue anyway since PDF was generated
    }

    // If it's a ZIP export, save individual asset records
    if (export_type === "zip" && exportResult.assets) {
      const assetRecords = exportResult.assets.map((asset: any) => ({
        export_id: exportRecord?.id,
        artifact: asset.type,
        url: asset.url
      }));

      const { error: assetsError } = await supabase
        .from("export_assets")
        .insert(assetRecords);

      if (assetsError) {
        console.error("Error saving asset records:", assetsError);
      }
    }

    // Update order status to delivered
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("kit_id", kitId)
      .eq("status", "ready")
      .or("status.eq.paid");

    if (orderUpdateError) {
      console.error("Error updating order status:", orderUpdateError);
    }

    return NextResponse.json({
      download_url: exportResult.url,
      export_type,
      assets: exportResult.assets || null
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export kit" },
      { status: 500 }
    );
  }
}