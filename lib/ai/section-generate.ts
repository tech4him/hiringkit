import OpenAI from "openai";
import type { IntakeData, KitArtifacts, ArtifactType } from "@/types";
import { env } from "@/lib/config/env";

// Configure OpenAI SDK following existing pattern
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 60000,
});

interface StyleSettings {
  industry?: 'general' | 'nonprofit' | 'education' | 'faith_based' | 'smb';
  seniority?: 'coordinator' | 'manager' | 'director';
  style?: 'formal' | 'plain_english' | 'friendly';
}

interface GenerateSectionOptions {
  section: ArtifactType;
  intake: IntakeData;
  existingArtifacts?: Partial<KitArtifacts>;
  styleSettings?: StyleSettings;
}

export async function generateSectionArtifact(
  options: GenerateSectionOptions
): Promise<Partial<KitArtifacts>> {
  const { section, intake, styleSettings } = options;

  // Build enhanced prompt based on style settings
  const styleContext = buildStyleContext(styleSettings);
  const sectionPrompt = buildSectionPrompt(section, intake, styleContext);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: sectionPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const result = JSON.parse(content);
    
    // Return only the requested section
    return {
      [section]: result[section] || result
    };

  } catch (error) {
    console.error('AI Section Generation Error:', error, {
      context: 'ai_section_generation',
      section,
      roleTitle: intake.role_title,
    });
    
    // Return fallback section content
    return generateFallbackSection(section, intake);
  }
}

function getSystemPrompt(): string {
  return `You are a hiring operations specialist who creates comprehensive, bias-aware hiring materials. 

CRITICAL REQUIREMENTS:
- Output ONLY valid JSON (no explanations or markdown)
- Use bias-aware, inclusive language throughout
- Be specific and actionable
- Follow the exact schema provided
- Ensure consistency with provided context
- Create realistic, professional content`;
}

function buildStyleContext(styleSettings?: StyleSettings): string {
  if (!styleSettings) return '';

  let context = '\n\nSTYLE GUIDANCE:\n';
  
  if (styleSettings.industry) {
    const industryGuidance = {
      nonprofit: 'Use mission-driven language, emphasize impact and community service',
      education: 'Focus on learning outcomes, student success, and educational excellence',
      faith_based: 'Include values-based language, community focus, and mission alignment',
      smb: 'Use practical, results-oriented language, emphasize growth and efficiency',
      general: 'Use professional, clear language suitable for various industries'
    };
    context += `Industry: ${industryGuidance[styleSettings.industry]}\n`;
  }

  if (styleSettings.seniority) {
    const seniorityGuidance = {
      coordinator: 'Focus on execution, collaboration, and supporting team initiatives',
      manager: 'Emphasize leadership, team management, and strategic execution',
      director: 'Highlight strategic thinking, vision-setting, and cross-functional leadership'
    };
    context += `Seniority: ${seniorityGuidance[styleSettings.seniority]}\n`;
  }

  if (styleSettings.style) {
    const styleGuidance = {
      formal: 'Use professional, formal tone with traditional business language',
      plain_english: 'Use clear, simple language that avoids jargon and complex terms',
      friendly: 'Use warm, approachable tone while maintaining professionalism'
    };
    context += `Tone: ${styleGuidance[styleSettings.style]}\n`;
  }

  return context;
}

function buildSectionPrompt(
  section: ArtifactType, 
  intake: IntakeData, 
  styleContext: string
): string {
  const baseContext = `
Role Information:
- Title: ${intake.role_title}
- Organization: ${intake.organization}
- Mission: ${intake.mission}
- Key Outcomes: ${intake.outcomes?.join(', ')}
- Key Responsibilities: ${intake.responsibilities?.join(', ')}
- Core Skills: ${intake.core_skills?.join(', ')}
${styleContext}`;

  switch (section) {
    case 'scorecard':
      return `${baseContext}

Generate a role scorecard section with this structure:
{
  "scorecard": {
    "mission": string,
    "outcomes": string[],
    "responsibilities": string[],
    "competencies": {
      "core": string[],
      "behavioral": string[],
      "values": string[]
    },
    "success": {
      "d90": string,
      "d180": string,
      "d365": string
    }
  }
}

Focus on clear, measurable outcomes and well-defined success metrics.`;

    case 'job_post':
      return `${baseContext}

Job Post Requirements:
- Must-have: ${intake.must_have?.join(', ')}
- Nice-to-have: ${intake.nice_to_have?.join(', ')}
- Compensation: ${intake.compensation || 'Competitive'}

Generate a job post section with this structure:
{
  "job_post": {
    "intro": string,
    "summary": string,
    "responsibilities": string[],
    "must": string[],
    "nice": string[],
    "comp": string,
    "apply": string
  }
}

Create an engaging, inclusive job description that attracts diverse candidates.`;

    case 'interview_stage1':
    case 'interview_stage2':
    case 'interview_stage3':
      const stageNumber = section.slice(-1);
      const stageContext = {
        '1': 'screening and initial assessment',
        '2': 'deep-dive technical and experience evaluation',
        '3': 'culture fit and final assessment'
      }[stageNumber];

      return `${baseContext}

Generate interview questions for stage ${stageNumber} (${stageContext}) with this structure:
{
  "${section}": {
    "questions": [
      {
        "question": string,
        "purpose": string,
        "ideal_response": string
      }
    ],
    "rubric": [
      {
        "level": 1|2|3|4|5,
        "label": string,
        "description": string
      }
    ]
  }
}

Create 3-4 thoughtful questions with clear evaluation criteria.`;

    case 'work_sample':
      return `${baseContext}

Work Sample Scenario: ${intake.work_sample_scenario || 'Create a realistic scenario for this role'}

Generate a work sample with this structure:
{
  "work_sample": {
    "scenario": string,
    "instructions": string[],
    "scoring": [
      {
        "criteria": string,
        "weight": number,
        "description": string
      }
    ]
  }
}

Create a practical, 1-hour exercise that tests core competencies.`;

    default:
      return `${baseContext}

Generate the ${section} section following the standard hiring kit format. Be specific and actionable.`;
  }
}

function generateFallbackSection(section: ArtifactType, intake: IntakeData): Partial<KitArtifacts> {
  // Simplified fallback - in production, you'd want more robust fallbacks
  const fallbacks: Partial<KitArtifacts> = {
    scorecard: {
      mission: intake.mission,
      outcomes: intake.outcomes.slice(0, 3),
      responsibilities: intake.responsibilities.slice(0, 5),
      competencies: {
        core: intake.core_skills.slice(0, 5),
        behavioral: intake.behavioral_competencies?.slice(0, 3) || [],
        values: intake.values?.slice(0, 3) || []
      },
      success: {
        d90: "Establish role foundations and initial deliverables",
        d180: "Demonstrate competency and contribute to team goals", 
        d365: "Achieve full productivity and mentor others"
      }
    },
    job_post: {
      intro: `Join our team as a ${intake.role_title}`,
      summary: `We're seeking a ${intake.role_title} to help drive our mission forward.`,
      responsibilities: intake.responsibilities.slice(0, 5),
      must: intake.must_have.slice(0, 5),
      nice: intake.nice_to_have.slice(0, 3),
      comp: intake.compensation || "Competitive salary and benefits",
      apply: "Send your resume and cover letter explaining your interest."
    }
  };

  return { [section]: fallbacks[section as keyof typeof fallbacks] };
}