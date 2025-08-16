import { NextRequest } from "next/server";
import { requireAdminAPI } from "@/lib/auth/requireAdmin";
import { resendOrderEmail } from "@/lib/database/queries/orders";
import { createNextResponse } from "@/lib/validation/helpers";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const { user } = await requireAdminAPI();
    
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

    // Resend the order email (this would typically integrate with your email service)
    const result = await resendOrderEmail(orderId, user.id);
    
    if (!result.success) {
      return createNextResponse({
        success: false,
        error: {
          code: 'EMAIL_FAILED',
          message: 'Failed to resend email',
        },
      }, 500);
    }

    return createNextResponse({
      success: true,
      data: { orderId },
      message: 'Email resent successfully',
    });

  } catch (error) {
    console.error('Resend email error:', error);
    
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
        message: 'Failed to resend email',
      },
    }, 500);
  }
}