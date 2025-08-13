import { NextRequest, NextResponse } from "next/server";
import { handleMockDownload } from "@/lib/pdf/generator";

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