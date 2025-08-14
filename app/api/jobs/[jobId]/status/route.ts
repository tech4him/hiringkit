import { NextRequest, NextResponse } from "next/server";
import { checkJobStatus } from "@/lib/pdf/vercel-optimized";

export async function GET(
  request: NextRequest,
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

    const status = await checkJobStatus(jobId);
    
    return NextResponse.json({
      job_id: jobId,
      ...status
    });

  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "Failed to check job status" },
      { status: 500 }
    );
  }
}