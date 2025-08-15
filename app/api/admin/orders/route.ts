import { NextRequest, NextResponse } from "next/server";
// Temporarily disabled to test worker_threads issue
// import { createAdminClient } from "@/lib/supabase/client";
// import { safeRequireAdmin } from "@/lib/auth/helpers";
// import { validateQueryParams, createApiResponse, createNextResponse } from "@/lib/validation/helpers";
// import { AdminOrdersQuerySchema } from "@/lib/validation/schemas";
// import { logAdminAction, logError } from "@/lib/logger";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  // Temporarily simplified to test worker_threads issue
  return NextResponse.json({ 
    message: "Admin orders route temporarily disabled for testing",
    orders: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
  });
}