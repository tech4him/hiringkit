import { NextRequest } from "next/server";
import { validateQueryParams, createApiResponse, createNextResponse } from "@/lib/validation/helpers";
import { AdminOrdersQuerySchema } from "@/lib/validation/schemas";
import { requireAdminAPI } from "@/lib/auth/requireAdmin";
import { withContext, logSecurity } from "@/lib/logger";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Validate query parameters
    const url = new URL(request.url);
    const validationResult = validateQueryParams(url.searchParams, AdminOrdersQuerySchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { page = 1, limit = 20, status, org_id } = validationResult.data;

    // Require admin authentication
    const { supabase, user } = await requireAdminAPI();

    const log = withContext({ 
      userId: user.id, 
      userEmail: user.email, 
      route: '/api/admin/orders' 
    });

    log.info('ADMIN_ORDERS_LIST_REQUEST', {
      page,
      limit,
      status,
      orgId: org_id,
    });

    // Log admin action for audit trail
    logSecurity('ADMIN_ORDERS_ACCESS', {
      userId: user.id,
      userEmail: user.email,
      action: 'list_orders',
      filters: { status, org_id, page, limit },
    });

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
      log.error('Failed to fetch orders', {
        error: ordersError.message,
        code: ordersError.code,
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

    log.info('ADMIN_ORDERS_LIST_SUCCESS', {
      ordersCount: orders?.length || 0,
      totalRecords: count || 0,
      page,
      totalPages,
    });

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
    // Handle authentication errors specifically
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return createNextResponse({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }, 401);
      }
      
      if (error.message === 'FORBIDDEN') {
        return createNextResponse({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        }, 403);
      }
    }

    const log = withContext({ route: '/api/admin/orders' });
    log.error('Admin orders route error', { error: error instanceof Error ? error.message : error });
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch orders',
      },
    }, 500);
  }
}