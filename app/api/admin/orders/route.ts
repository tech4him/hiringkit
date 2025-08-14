import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { safeRequireAdmin } from "@/lib/auth/helpers";
import { validateQueryParams, createApiResponse, createNextResponse } from "@/lib/validation/helpers";
import { AdminOrdersQuerySchema } from "@/lib/validation/schemas";
import { logAdminAction, logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await safeRequireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    logAdminAction('ADMIN_ORDERS_REQUEST', user.email, { userId: user.id });

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const validationResult = validateQueryParams(searchParams, AdminOrdersQuerySchema);
    
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { status, page = 1, limit = 20 } = validationResult.data;

    // Log admin action
    logAdminAction('FETCH_ORDERS', user.email, {
      filters: { status, page, limit },
    });

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();

    let query = supabase
      .from("orders")
      .select(`
        *,
        kits (
          id,
          title,
          status,
          qa_required
        )
      `)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Filter by status if specified
    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      logError(new Error(error.message), {
        context: 'admin_orders_fetch',
        adminId: user.id,
        filters: { status, page, limit },
      });
      
      return createNextResponse({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch orders',
        },
      }, 500);
    }

    const response = createApiResponse({
      orders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

    logAdminAction('ADMIN_ORDERS_FETCHED', user.email, {
      ordersCount: orders?.length || 0,
      page,
      limit,
    });

    return createNextResponse(response);

  } catch (error) {
    logError(error as Error, {
      context: 'admin_orders_route',
      path: request.nextUrl.pathname,
    });
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
      },
    }, 500);
  }
}