import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { safeRequireAdmin } from "@/lib/auth/helpers";
import { createApiResponse, createNextResponse, notFoundResponse } from "@/lib/validation/helpers";
import { logAdminAction, logError, logUserAction } from "@/lib/logger";
import { sendApprovalNotificationEmail } from "@/lib/email/resend";
import { env } from "@/lib/config/env";

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
    const authResult = await safeRequireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    logUserAction('ADMIN_KIT_APPROVAL_REQUEST', user.id, { 
      userEmail: user.email,
      kitId,
    });

    const supabase = createAdminClient();

    // First, verify the kit exists and is in a state that can be approved
    const { data: kit, error: kitCheckError } = await supabase
      .from("kits")
      .select("id, title, status, qa_required, user_id")
      .eq("id", kitId)
      .single();

    if (kitCheckError || !kit) {
      logError(new Error('Kit not found'), {
        context: 'kit_approval_check',
        kitId,
        adminId: user.id,
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
      logError(new Error(kitError.message), {
        context: 'kit_approval_update',
        kitId,
        adminId: user.id,
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
      logError(new Error(orderError.message), {
        context: 'order_approval_update',
        kitId,
        adminId: user.id,
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

    // Log admin action for audit trail
    logAdminAction('KIT_APPROVED', user.email, {
      kitId,
      kitTitle: kit.title,
      kitUserId: kit.user_id,
    });

    // Create audit log entry
    await supabase
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        kit_id: kitId,
        action: "kit_approved",
        payload_json: {
          kitTitle: kit.title,
          previousStatus: kit.status,
          newStatus: "published",
          adminEmail: user.email,
        },
      });

    // Send notification email to user that their kit is ready
    try {
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
          logError(new Error(`Failed to send approval email: ${emailResult.error}`), {
            context: 'approval_email_failed',
            kitId,
            customerEmail: userAndOrder.users.email,
          });
        }
      }
    } catch (emailError) {
      logError(emailError as Error, {
        context: 'approval_email_error',
        kitId,
      });
    }

    logAdminAction('KIT_APPROVED_SUCCESS', user.email, {
      kitId,
      kitTitle: kit.title,
    });

    const response = createApiResponse({
      kit: updatedKit,
      message: "Kit approved and ready for download",
    });

    return createNextResponse(response);

  } catch (error) {
    logError(error as Error, {
      context: 'kit_approval_route',
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