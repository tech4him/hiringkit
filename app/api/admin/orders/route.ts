import { NextRequest } from "next/server";
import { validateQueryParams, createApiResponse, createNextResponse } from "@/lib/validation/helpers";
import { AdminOrdersQuerySchema } from "@/lib/validation/schemas";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isNode = () => typeof process !== 'undefined' && !!process.versions?.node;

export async function GET(request: NextRequest) {
  try {
    // Validate query parameters
    const url = new URL(request.url);
    const validationResult = validateQueryParams(url.searchParams, AdminOrdersQuerySchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { page = 1, limit = 20, status, org_id } = validationResult.data;

    // Only import server-only libs inside the handler, after we're on Node
    if (!isNode()) {
      return createNextResponse({
        success: false,
        error: {
          code: 'SERVER_REQUIRED',
          message: 'Server environment required for admin operations',
        },
      }, 500);
    }

    // Dynamic imports for server-only functionality
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { safeRequireAdmin } = await import("@/lib/auth/helpers");

    // Require admin authentication
    const authResult = await safeRequireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    console.log('ORDERS_LIST_REQUEST:', {
      userEmail: user.email,
      page,
      limit,
      status,
      orgId: org_id,
    });

    const supabase = createAdminClient();

    // Build query with filters
    let query = supabase
      .from("orders")
      .select(`
        *,
        kits (
          id,
          title,
          status
        ),
        users (
          id,
          email,
          full_name
        ),
        organizations (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      console.error('admin_orders_fetch error:', ordersError.message, {
        context: 'admin_orders_fetch',
        userId: user.id,
        page,
        limit,
      });
      
      return createNextResponse({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch orders',
        },
      }, 500);
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response = createApiResponse({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    }, 'Orders retrieved successfully');

    return createNextResponse(response);

  } catch (error) {
    console.error('admin_orders_route error:', error);
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch orders',
      },
    }, 500);
  }
}