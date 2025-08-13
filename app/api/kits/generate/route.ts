import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateKitArtifacts } from "@/lib/ai/generate";
import type { IntakeData, KitArtifacts } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { express_mode = false, ...intakeData } = body;

    // Validate required fields
    if (!intakeData.role_title?.trim()) {
      return NextResponse.json(
        { error: "Role title is required" },
        { status: 400 }
      );
    }

    // For express mode, we need minimal data
    if (express_mode && !intakeData.role_title) {
      return NextResponse.json(
        { error: "Role title is required for express mode" },
        { status: 400 }
      );
    }

    // For detailed mode, validate additional required fields
    if (!express_mode && (!intakeData.organization?.trim() || !intakeData.mission?.trim())) {
      return NextResponse.json(
        { error: "Organization and mission are required for detailed mode" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // For demo purposes, we'll use null user_id 
    // In production, this would come from the authenticated user session
    const tempUserId = null;

    let finalIntakeData: IntakeData;
    let artifacts: KitArtifacts;

    if (express_mode) {
      // Express mode: AI generates everything from minimal input
      const expressResult = await generateKitArtifacts({
        role_title: intakeData.role_title,
        organization: intakeData.organization || "Your Organization",
        mission: intakeData.mission || "",
        express_mode: true
      });

      finalIntakeData = expressResult.intake;
      artifacts = expressResult.artifacts;
    } else {
      // Detailed mode: use provided intake data
      finalIntakeData = {
        role_title: intakeData.role_title,
        organization: intakeData.organization,
        reports_to: intakeData.reports_to || "",
        department: intakeData.department || "",
        location: intakeData.location || "",
        employment_type: intakeData.employment_type || "full_time",
        mission: intakeData.mission,
        outcomes: intakeData.outcomes || [],
        responsibilities: intakeData.responsibilities || [],
        core_skills: intakeData.core_skills || [],
        behavioral_competencies: intakeData.behavioral_competencies || [],
        values: intakeData.values || [],
        success_metrics: intakeData.success_metrics || {
          d90: "",
          d180: "",
          d365: ""
        },
        job_post_intro: intakeData.job_post_intro || "",
        job_post_summary: intakeData.job_post_summary || "",
        must_have: intakeData.must_have || [],
        nice_to_have: intakeData.nice_to_have || [],
        compensation: intakeData.compensation || "",
        how_to_apply: intakeData.how_to_apply || "",
        work_sample_scenario: intakeData.work_sample_scenario || ""
      };

      artifacts = await generateKitArtifacts(finalIntakeData);
    }

    // Save kit to database
    const { data: kit, error: kitError } = await supabase
      .from("kits")
      .insert({
        user_id: tempUserId,
        title: `${finalIntakeData.role_title} Hiring Kit`,
        status: "generated",
        intake_json: finalIntakeData,
        artifacts_json: artifacts,
        qa_required: false
      })
      .select()
      .single();

    if (kitError) {
      console.error("Error saving kit:", kitError);
      return NextResponse.json(
        { error: "Failed to save kit" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      kit,
      intake: finalIntakeData,
      artifacts
    });

  } catch (error) {
    console.error("Kit generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate kit" },
      { status: 500 }
    );
  }
}