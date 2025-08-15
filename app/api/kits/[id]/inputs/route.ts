import { NextRequest } from "next/server";
import { createNextResponse, createApiResponse, createApiError, validateRequestBody } from "@/lib/validation/helpers";
import { IntakeDataSchema } from "@/lib/validation/schemas";
import { z } from "zod";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request schema for input updates (partial IntakeData)
const UpdateInputsRequestSchema = z.object({
  field_updates: IntakeDataSchema.partial()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id: kitId } = await params;

    if (!kitId) {
      return createNextResponse(
        createApiError('MISSING_KIT_ID', 'Kit ID is required'), 
        400
      );
    }

    // Validate request body
    const validationResult = await validateRequestBody(request, UpdateInputsRequestSchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { field_updates } = validationResult.data;

    // Ensure we have some updates to apply
    if (!field_updates || Object.keys(field_updates).length === 0) {
      return createNextResponse(
        createApiError('NO_UPDATES', 'No field updates provided'), 
        400
      );
    }

    // Dynamic imports for server-only functionality
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { safeGetCurrentUser } = await import("@/lib/auth/helpers");

    // Get current user for access control
    const currentUser = await safeGetCurrentUser();
    const supabase = createAdminClient();

    // Get kit with access control
    let kitQuery = supabase
      .from("kits")
      .select("*")
      .eq("id", kitId);

    if (currentUser && currentUser.role !== 'admin') {
      kitQuery = kitQuery.eq("user_id", currentUser.id);
    }

    const { data: kit, error: kitError } = await kitQuery.single();

    if (kitError || !kit) {
      console.log('Kit not found for input update:', {
        kitId,
        userId: currentUser?.id,
        error: kitError?.message,
      });
      
      return createNextResponse(
        createApiError('KIT_NOT_FOUND', 'Kit not found or access denied'), 
        404
      );
    }

    // Merge field updates with existing intake data
    const updatedIntakeData = {
      ...kit.intake_json,
      ...field_updates
    };

    // Validate the merged intake data
    const intakeValidation = IntakeDataSchema.partial().safeParse(updatedIntakeData);
    if (!intakeValidation.success) {
      console.error('Invalid intake data after merge:', intakeValidation.error, {
        kitId,
        fieldUpdates: Object.keys(field_updates),
      });
      
      return createNextResponse(
        createApiError('VALIDATION_ERROR', 'Invalid intake data after updates'), 
        400
      );
    }

    console.log('Updating kit inputs:', {
      kitId,
      userId: currentUser?.id,
      updatedFields: Object.keys(field_updates),
    });

    // Update kit in database
    const { data: updatedKit, error: updateError } = await supabase
      .from("kits")
      .update({
        intake_json: updatedIntakeData,
        edited_at: new Date().toISOString()
      })
      .eq("id", kitId)
      .select()
      .single();

    if (updateError) {
      console.error('Kit input update error:', updateError, {
        kitId,
        userId: currentUser?.id,
        updatedFields: Object.keys(field_updates),
      });
      
      return createNextResponse(
        createApiError('DATABASE_ERROR', 'Failed to update kit inputs'), 
        500
      );
    }

    const duration = Date.now() - startTime;
    console.log('Kit inputs updated successfully:', {
      kitId,
      userId: currentUser?.id,
      duration,
      updatedFields: Object.keys(field_updates),
    });

    return createNextResponse(
      createApiResponse({
        intake_data: updatedKit.intake_json,
        updated_fields: Object.keys(field_updates)
      }, `Kit inputs updated successfully`)
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Kit input update route error:', error, {
      context: 'kit_input_update_route',
      duration,
      path: request.nextUrl.pathname,
    });
    
    return createNextResponse(
      createApiError('SERVER_ERROR', 'Failed to update kit inputs'), 
      500
    );
  }
}