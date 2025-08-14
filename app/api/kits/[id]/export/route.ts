import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generatePDF } from "@/lib/pdf/generator-optimized";
import { generateExportForVercel } from "@/lib/pdf/vercel-optimized";

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

    // Generate PDF(s) - Use Vercel-optimized approach
    const isVercel = process.env.VERCEL === '1';
    const exportResult = isVercel 
      ? await generateExportForVercel(kit, export_type)
      : await generatePDF(kit, export_type);

    if (!exportResult.success) {
      return NextResponse.json(
        { error: exportResult.error || "PDF generation failed" },
        { status: 500 }
      );
    }

    // Handle async processing for Vercel
    if (exportResult.jobId) {
      return NextResponse.json({
        status: "processing",
        job_id: exportResult.jobId,
        message: exportResult.message,
        export_type,
        check_url: `/api/jobs/${exportResult.jobId}/status`
      });
    }

    // Immediate result (cached or small file)
    if (exportResult.url) {
      // Save export record only if not cached
      if (exportResult.message !== "Retrieved from cache") {
        const { data: exportRecord, error: exportError } = await supabase
          .from("exports")
          .insert({
            kit_id: kitId,
            kind: export_type,
            url: exportResult.url
          })
          .select()
          .single();

        // If it's a ZIP export, save individual asset records
        if (export_type === "zip" && exportResult.assets && exportRecord) {
          const assetRecords = exportResult.assets.map((asset: any) => ({
            export_id: exportRecord.id,
            artifact: asset.type,
            url: asset.url
          }));

          await supabase
            .from("export_assets")
            .insert(assetRecords);
        }
      }

      // Update order status to delivered
      await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("kit_id", kitId)
        .in("status", ["ready", "paid"]);

      return NextResponse.json({
        download_url: exportResult.url,
        export_type,
        assets: exportResult.assets || null,
        cached: exportResult.message === "Retrieved from cache"
      });
    }

    // Fallback
    return NextResponse.json(
      { error: "Unexpected export result" },
      { status: 500 }
    );

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export kit" },
      { status: 500 }
    );
  }
}