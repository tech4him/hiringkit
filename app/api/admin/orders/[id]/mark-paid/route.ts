import { NextRequest } from "next/server";
import { requireAdminAPI } from "@/lib/auth/requireAdmin";
import { updateOrderStatus } from "@/lib/database/queries/orders";
import { createNextResponse } from "@/lib/validation/helpers";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const { supabase, user } = await requireAdminAPI();
    
    const { id: orderId } = await params;
    
    if (!orderId) {
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Order ID is required',
        },
      }, 400);
    }

    // First, get the current order to check its status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
      
    if (fetchError || !order) {
      return createNextResponse({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      }, 404);
    }

    // Only allow marking as paid if currently awaiting payment
    if (order.status !== 'awaiting_payment') {
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot mark order as paid. Current status: ${order.status}`,
        },
      }, 400);
    }

    // Update order status to paid
    const result = await updateOrderStatus(
      orderId, 
      'paid', 
      user.id,
      order.status
    );
    
    if (!result.success) {
      return createNextResponse({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update order status',
        },
      }, 500);
    }

    return createNextResponse({
      success: true,
      message: 'Order marked as paid successfully',
      data: {
        orderId,
        newStatus: 'paid',
        previousStatus: order.status
      }
    });

  } catch (error) {
    console.error('Mark as paid error:', error);
    
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
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to mark order as paid',
      },
    }, 500);
  }
}