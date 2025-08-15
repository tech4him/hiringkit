import { NextRequest } from "next/server";
import { createNextResponse, createApiResponse, createApiError, validateRequestBody } from "@/lib/validation/helpers";
import { ArtifactTypeSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import type { IntakeData, ArtifactType } from "@/types";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request schema for section regeneration
const RegenerateRequestSchema = z.object({
  intake_overrides: z.record(z.any()).optional(),
  style_settings: z.object({
    industry: z.enum(['general', 'nonprofit', 'education', 'faith_based', 'smb']).optional(),
    seniority: z.enum(['coordinator', 'manager', 'director']).optional(),
    style: z.enum(['formal', 'plain_english', 'friendly']).optional(),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, section: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id: kitId, section } = await params;

    if (!kitId || !section) {
      return createNextResponse(
        createApiError('MISSING_PARAMETERS', 'Kit ID and section are required'), 
        400
      );
    }

    // Validate section against ArtifactType enum
    const sectionValidation = ArtifactTypeSchema.safeParse(section);
    if (!sectionValidation.success) {
      return createNextResponse(
        createApiError('INVALID_SECTION', `Invalid section type: ${section}`), 
        400
      );
    }

    // Validate request body
    const validationResult = await validateRequestBody(request, RegenerateRequestSchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { intake_overrides, style_settings } = validationResult.data;

    // Dynamic imports for server-only functionality
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { generateSectionArtifact } = await import("@/lib/ai/section-generate");
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
      console.log('Kit not found for regeneration:', {
        kitId,
        section,
        userId: currentUser?.id,
        error: kitError?.message,
      });
      
      return createNextResponse(
        createApiError('KIT_NOT_FOUND', 'Kit not found or access denied'), 
        404
      );
    }

    // Check regeneration limits for unpaid users
    const currentRegenCount = kit.regen_counts?.[section] || 0;
    const hasOrder = Boolean(kit.order_id);
    
    if (!hasOrder && currentRegenCount >= 3) {
      console.log('Regeneration limit exceeded:', {
        kitId,
        section,
        currentCount: currentRegenCount,
        hasOrder,
      });
      
      return createNextResponse(
        createApiError('REGEN_LIMIT_EXCEEDED', 'Regeneration limit exceeded. Upgrade to continue.'), 
        429
      );
    }

    // Merge intake data with overrides
    const enhancedIntake: IntakeData = {
      ...kit.intake_json,
      ...intake_overrides
    };

    console.log('Starting section regeneration:', {
      kitId,
      section,
      userId: currentUser?.id,
      regenCount: currentRegenCount,
      hasOrder,
    });

    // Generate new section content
    const newSectionArtifacts = await generateSectionArtifact({
      section: sectionValidation.data as ArtifactType,
      intake: enhancedIntake,
      existingArtifacts: kit.edited_json || kit.artifacts_json,
      styleSettings: style_settings
    });

    // Merge into edited_json preserving other sections
    const currentArtifacts = kit.edited_json || kit.artifacts_json || {};
    const newEditedJson = {
      ...currentArtifacts,
      ...newSectionArtifacts
    };

    // Update regeneration count
    const newRegenCounts = {
      ...kit.regen_counts,
      [section]: currentRegenCount + 1
    };

    // Update kit in database
    const { error: updateError } = await supabase
      .from("kits")
      .update({
        edited_json: newEditedJson,
        regen_counts: newRegenCounts,
        edited_at: new Date().toISOString()
      })
      .eq("id", kitId)
      .select()
      .single();

    if (updateError) {
      console.error('Kit update error during regeneration:', updateError, {
        kitId,
        section,
        userId: currentUser?.id,
      });
      
      return createNextResponse(
        createApiError('DATABASE_ERROR', 'Failed to save regenerated section'), 
        500
      );
    }

    const duration = Date.now() - startTime;
    console.log('Section regeneration completed:', {
      kitId,
      section,
      userId: currentUser?.id,
      duration,
      newRegenCount: currentRegenCount + 1,
    });

    return createNextResponse(
      createApiResponse({
        section: newSectionArtifacts[section as keyof typeof newSectionArtifacts],
        regen_count: currentRegenCount + 1,
        remaining_regens: hasOrder ? 'unlimited' : Math.max(0, 3 - (currentRegenCount + 1))
      }, `Section ${section} regenerated successfully`)
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Section regeneration route error:', error, {
      context: 'section_regeneration_route',
      duration,
      path: request.nextUrl.pathname,
    });
    
    return createNextResponse(
      createApiError('SERVER_ERROR', 'Failed to regenerate section'), 
      500
    );
  }
}