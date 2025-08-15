import { NextRequest, NextResponse } from "next/server";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isNode = () => typeof process !== 'undefined' && !!process.versions?.node;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitId } = await context.params;

    // Only import server-only libs inside the handler, after we're on Node
    if (!isNode()) {
      return NextResponse.json(
        { error: "Server environment required" },
        { status: 500 }
      );
    }

    // Dynamic imports for server-only functionality
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { generatePDF } = await import("@/lib/pdf/generator-optimized");
    const { generateExportForVercel } = await import("@/lib/pdf/vercel-optimized");
    
    const { export_type = "combined_pdf" } = await request.json();
    
    if (!kitId) {
      return NextResponse.json(
        { error: "Kit ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

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
    const paidOrder = kit.orders?.find((order: { status: string }) => 
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
    if ('jobId' in exportResult && exportResult.jobId) {
      return NextResponse.json({
        status: "processing",
        job_id: exportResult.jobId,
        message: 'message' in exportResult ? exportResult.message : 'Processing export',
        export_type,
        check_url: `/api/jobs/${exportResult.jobId}/status`
      });
    }

    // Immediate result (cached or small file)
    if (exportResult.url) {
      // Save export record only if not cached
      if ('message' in exportResult && exportResult.message !== "Retrieved from cache") {
        const { data: exportRecord } = await supabase
          .from("exports")
          .insert({
            kit_id: kitId,
            kind: export_type,
            url: exportResult.url
          })
          .select()
          .single();

        // If it's a ZIP export, save individual asset records
        if (export_type === "zip" && 'assets' in exportResult && exportResult.assets && Array.isArray(exportResult.assets) && exportRecord) {
          const assetRecords = (exportResult.assets as { type: string; url: string }[]).map((asset) => ({
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
        assets: 'assets' in exportResult ? exportResult.assets : null,
        cached: 'message' in exportResult && exportResult.message === "Retrieved from cache"
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