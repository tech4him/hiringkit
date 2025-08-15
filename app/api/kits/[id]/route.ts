import { NextRequest } from "next/server";
import { createNextResponse, createApiResponse, createApiError } from "@/lib/validation/helpers";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitId } = await params;

    if (!kitId) {
      return createNextResponse(
        createApiError('MISSING_KIT_ID', 'Kit ID is required'), 
        400
      );
    }

    // Dynamic imports for server-only functionality
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { safeGetCurrentUser } = await import("@/lib/auth/helpers");

    // Get current user (optional for public kit access)
    const currentUser = await safeGetCurrentUser();
    const supabase = createAdminClient();

    // Get kit with access control
    let kitQuery = supabase
      .from("kits")
      .select("*")
      .eq("id", kitId);

    // If user is authenticated, check ownership or allow if admin
    if (currentUser) {
      if (currentUser.role !== 'admin') {
        kitQuery = kitQuery.eq("user_id", currentUser.id);
      }
    } else {
      // For guest access, allow access to any kit (needed for checkout flow)
      // In production, you might want to add additional security checks
    }

    const { data: kit, error: kitError } = await kitQuery.single();

    if (kitError || !kit) {
      console.log('Kit not found:', {
        kitId,
        userId: currentUser?.id,
        error: kitError?.message,
      });
      
      return createNextResponse(
        createApiError('KIT_NOT_FOUND', 'Kit not found or access denied'), 
        404
      );
    }

    console.log('Kit retrieved successfully:', {
      kitId: kit.id,
      userId: currentUser?.id,
      status: kit.status,
    });

    return createNextResponse(
      createApiResponse(kit, 'Kit retrieved successfully')
    );

  } catch (error) {
    console.error('Kit retrieval error:', error);
    
    return createNextResponse(
      createApiError('SERVER_ERROR', 'Failed to retrieve kit'), 
      500
    );
  }
}