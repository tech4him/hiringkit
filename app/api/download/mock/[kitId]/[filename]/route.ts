import { NextRequest, NextResponse } from "next/server";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isNode = () => typeof process !== 'undefined' && !!process.versions?.node;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kitId: string; filename: string }> }
) {
  try {
    const { kitId, filename } = await context.params;
    
    if (!kitId || !filename) {
      return NextResponse.json(
        { error: "Kit ID and filename are required" },
        { status: 400 }
      );
    }

    // Only import server-only libs inside the handler, after we're on Node
    if (!isNode()) {
      return NextResponse.json(
        { error: "Server environment required" },
        { status: 500 }
      );
    }

    // Dynamic import for server-only functionality
    const { handleMockDownload } = await import("@/lib/pdf/generator-optimized");

    // For MVP, return mock PDF content
    return await handleMockDownload(kitId, filename);

  } catch (error) {
    console.error("Mock download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}