import { NextRequest, NextResponse } from "next/server";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isNode = () => typeof process !== 'undefined' && !!process.versions?.node;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Only import server-only libs inside the handler, after we're on Node
    if (isNode()) {
      const { checkJobStatus } = await import("@/lib/pdf/vercel-optimized");
      const status = await checkJobStatus(jobId);
      
      return NextResponse.json({
        job_id: jobId,
        ...status
      });
    }

    return NextResponse.json(
      { error: "Server environment required" },
      { status: 500 }
    );

  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "Failed to check job status" },
      { status: 500 }
    );
  }
}