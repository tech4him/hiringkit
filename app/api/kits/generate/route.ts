import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { generateKitArtifacts } from "@/lib/ai/generate";
import { validateRequestBody, createApiResponse, createNextResponse } from "@/lib/validation/helpers";
import { GenerateKitRequestSchema } from "@/lib/validation/schemas";
// Note: Using console for logging to avoid worker thread issues
import { safeGetCurrentUser } from "@/lib/auth/helpers";
import type { IntakeData, KitArtifacts } from "@/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate request body
    const validationResult = await validateRequestBody(request, GenerateKitRequestSchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { express_mode = false, role_title, organization, mission } = validationResult.data;

    console.log('Kit generation request:', {
      expressMode: express_mode,
      roleTitle: role_title,
      hasOrganization: !!organization,
      hasMission: !!mission,
    });

    // Get current user (optional for MVP)
    const currentUser = await safeGetCurrentUser();
    const userId = currentUser?.id || null;

    if (currentUser) {
      console.log('Generate kit for user:', currentUser.id, {
        expressMode: express_mode,
        roleTitle: role_title,
      });
    }

    // Use admin client for saving (since user might be anonymous)
    const supabase = createAdminClient();

    let finalIntakeData: IntakeData;
    let artifacts: KitArtifacts;

    if (express_mode) {
      // Express mode: AI generates everything from minimal input
      const expressResult = await generateKitArtifacts({
        role_title,
        organization: organization || "Your Organization",
        mission: mission || "",
        express_mode: true
      });

      finalIntakeData = expressResult.intake;
      artifacts = expressResult.artifacts;
    } else {
      // For detailed mode, we need more validation
      if (!organization || !mission) {
        return createNextResponse({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization and mission are required for detailed mode',
          },
        }, 400);
      }

      // Detailed mode: use provided intake data
      finalIntakeData = {
        role_title,
        organization,
        mission,
        reports_to: "",
        department: "",
        location: "",
        employment_type: "full_time",
        outcomes: [],
        responsibilities: [],
        core_skills: [],
        behavioral_competencies: [],
        values: [],
        success_metrics: {
          d90: "",
          d180: "",
          d365: ""
        },
        job_post_intro: "",
        job_post_summary: "",
        must_have: [],
        nice_to_have: [],
        compensation: "",
        how_to_apply: "",
        work_sample_scenario: ""
      };

      artifacts = await generateKitArtifacts(finalIntakeData);
    }

    // Save kit to database
    const { data: kit, error: kitError } = await supabase
      .from("kits")
      .insert({
        user_id: userId,
        org_id: currentUser?.org_id || null,
        title: `${finalIntakeData.role_title} Hiring Kit`,
        status: "generated",
        intake_json: finalIntakeData,
        artifacts_json: artifacts,
        qa_required: false
      })
      .select()
      .single();

    if (kitError) {
      console.error('Kit save error:', kitError.message, {
        context: 'kit_generation_save',
        userId,
        roleTitle: role_title,
        expressMode: express_mode,
      });
      
      return createNextResponse({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to save generated kit',
        },
      }, 500);
    }

    const duration = Date.now() - startTime;
    console.log('Kit generation performance:', {
      userId,
      kitId: kit.id,
      expressMode: express_mode,
      roleTitle: role_title,
    });

    console.log('Kit generated successfully:', {
      kitId: kit.id,
      duration,
      expressMode: express_mode,
    });

    const response = createApiResponse({
      kit,
      intake: finalIntakeData,
      artifacts
    }, `${express_mode ? 'Express' : 'Detailed'} kit generated successfully`);

    return createNextResponse(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Kit generation route error:', error, {
      context: 'kit_generation_route',
      duration,
      path: request.nextUrl.pathname,
    });
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate kit',
      },
    }, 500);
  }
}