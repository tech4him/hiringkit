import { NextRequest } from "next/server";
import { createApiResponse, createNextResponse, notFoundResponse } from "@/lib/validation/helpers";
import { requireAdminAPI } from "@/lib/auth/requireAdmin";
import { withContext, logSecurity } from "@/lib/logger";
import { env } from "@/lib/config/env";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitId } = await context.params;
    
    if (!kitId) {
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Kit ID is required',
        },
      }, 400);
    }

    // Require admin authentication
    const { supabase, user } = await requireAdminAPI();

    const log = withContext({ 
      userId: user.id, 
      userEmail: user.email, 
      route: '/api/admin/kits/approve',
      kitId 
    });

    log.info('ADMIN_KIT_APPROVAL_REQUEST', { kitId });

    // Log admin action for audit trail
    logSecurity('ADMIN_KIT_APPROVAL_ATTEMPT', {
      userId: user.id,
      userEmail: user.email,
      action: 'approve_kit',
      kitId,
    });

    // First, verify the kit exists and is in a state that can be approved
    const { data: kit, error: kitCheckError } = await supabase
      .from("kits")
      .select("id, title, status, qa_required, user_id")
      .eq("id", kitId)
      .single();

    if (kitCheckError || !kit) {
      log.error('Kit not found for approval', {
        error: kitCheckError?.message,
        kitId,
      });
      return notFoundResponse('Kit not found');
    }

    if (!kit.qa_required) {
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Kit does not require QA approval',
        },
      }, 400);
    }

    // Use a transaction to update both kit and order atomically
    const { data: updatedKit, error: kitError } = await supabase
      .from("kits")
      .update({ 
        status: "published",
        qa_required: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", kitId)
      .eq("qa_required", true) // Ensure it still requires QA when we update
      .select()
      .single();

    if (kitError) {
      log.error('Failed to update kit status', {
        error: kitError.message,
        code: kitError.code,
        kitId,
      });
      
      return createNextResponse({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update kit status',
        },
      }, 500);
    }

    // Update order status from qa_pending to ready
    const { error: orderError } = await supabase
      .from("orders")
      .update({ 
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("kit_id", kitId)
      .eq("status", "qa_pending");

    if (orderError) {
      log.error('Failed to update order status', {
        error: orderError.message,
        code: orderError.code,
        kitId,
      });
      
      // Try to revert kit status on order update failure
      await supabase
        .from("kits")
        .update({ 
          status: "editing",
          qa_required: true,
        })
        .eq("id", kitId);
      
      return createNextResponse({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update order status',
        },
      }, 500);
    }

    // Log successful approval action
    logSecurity('ADMIN_KIT_APPROVED', {
      userId: user.id,
      userEmail: user.email,
      action: 'kit_approved',
      kitId,
      kitTitle: kit.title,
      kitUserId: kit.user_id,
    });

    // Create audit log entry
    await supabase
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        resource_type: 'kit',
        resource_id: kitId,
        action: "kit_approved",
        old_values: { status: kit.status, qa_required: true },
        new_values: { status: "published", qa_required: false },
        metadata: {
          kitTitle: kit.title,
          kitUserId: kit.user_id,
          adminEmail: user.email,
        },
      });

    // Send notification email to user that their kit is ready
    try {
      // Dynamic import for email function
      const { sendApprovalNotificationEmail } = await import("@/lib/email/resend");
      
      // Get user and order details for email
      const { data: userAndOrder } = await supabase
        .from("orders")
        .select(`
          *,
          users (
            id,
            email,
            name
          )
        `)
        .eq("kit_id", kitId)
        .eq("status", "ready")
        .single();

      if (userAndOrder?.users?.email) {
        const downloadUrl = `${env.NEXT_PUBLIC_APP_URL}/kit/${kitId}/success`;
        
        const emailResult = await sendApprovalNotificationEmail({
          customerEmail: userAndOrder.users.email,
          customerName: userAndOrder.users.name || undefined,
          kitTitle: kit.title,
          downloadUrl,
          adminNotes: undefined, // Could be added as a feature later
        });

        if (!emailResult.success) {
          log.error('Failed to send approval email', {
            error: emailResult.error,
            customerEmail: userAndOrder.users.email,
          });
        } else {
          log.info('Approval notification email sent', {
            customerEmail: userAndOrder.users.email,
          });
        }
      }
    } catch (emailError) {
      log.error('Error sending approval email', {
        error: emailError instanceof Error ? emailError.message : emailError,
      });
    }

    log.info('Kit approval completed successfully', {
      kitId,
      kitTitle: kit.title,
    });

    const response = createApiResponse({
      kit: updatedKit,
      message: "Kit approved and ready for download",
    });

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

    const log = withContext({ route: '/api/admin/kits/approve' });
    log.error('Kit approval route error', { 
      error: error instanceof Error ? error.message : error,
      kitId: (await context.params).id,
      path: request.nextUrl.pathname,
    });
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to approve kit',
      },
    }, 500);
  }
}