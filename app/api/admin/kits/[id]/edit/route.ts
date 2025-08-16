import { NextRequest } from "next/server";
import { requireAdminAPI } from "@/lib/auth/requireAdmin";
import { createNextResponse } from "@/lib/validation/helpers";
import { z } from "zod";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EditKitSchema = z.object({
  edited_json: z.any().optional(),
  qa_notes: z.any().optional(), // Make this more flexible too
}).passthrough(); // Allow additional fields

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const { supabase, user } = await requireAdminAPI();
    
    const { id: kitId } = await params;
    
    if (!kitId) {
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Kit ID is required',
        },
      }, 400);
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('Edit kit request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        },
      }, 400);
    }
    
    const validation = EditKitSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Edit kit validation failed:', validation.error);
      return createNextResponse({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
      }, 400);
    }

    const { edited_json, qa_notes } = validation.data;

    // First, verify the kit exists and user has permission
    const { data: kit, error: fetchError } = await supabase
      .from('kits')
      .select('id, status, user_id')
      .eq('id', kitId)
      .single();
      
    if (fetchError || !kit) {
      return createNextResponse({
        success: false,
        error: {
          code: 'KIT_NOT_FOUND',
          message: 'Kit not found',
        },
      }, 404);
    }

    // Update kit with edited content and notes
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (edited_json) {
      updateData.edited_json = edited_json;
      updateData.status = 'editing'; // Mark as being edited
    }

    if (qa_notes !== undefined) {
      updateData.qa_notes = typeof qa_notes === 'string' ? qa_notes : String(qa_notes || '');
    }

    const { error: updateError } = await supabase
      .from('kits')
      .update(updateData)
      .eq('id', kitId);
    
    if (updateError) {
      console.error('Failed to update kit:', updateError);
      return createNextResponse({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to save kit changes',
        },
      }, 500);
    }

    // Log the edit action
    try {
      await supabase
        .from('audit_log')
        .insert({
          kit_id: kitId,
          user_id: user.id,
          action: 'kit_edited',
          metadata: {
            sections_edited: edited_json ? Object.keys(edited_json) : [],
            qa_notes_updated: qa_notes !== undefined,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (auditError) {
      console.warn('Failed to log kit edit action:', auditError);
    }

    return createNextResponse({
      success: true,
      data: { kitId, updated: Object.keys(updateData) },
      message: 'Kit changes saved successfully',
    });

  } catch (error) {
    console.error('Edit kit error:', error);
    
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
        message: 'Failed to save kit changes',
      },
    }, 500);
  }
}