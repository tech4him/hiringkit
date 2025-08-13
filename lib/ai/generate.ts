import OpenAI from "openai";
import type { IntakeData, KitArtifacts } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface GenerateKitOptions extends Partial<IntakeData> {
  express_mode?: boolean;
}

export async function generateKitArtifacts(
  options: GenerateKitOptions
): Promise<{ intake: IntakeData; artifacts: KitArtifacts }> {
  
  if (options.express_mode) {
    return generateExpressKit(options);
  }
  
  return generateDetailedKit(options as IntakeData);
}

async function generateExpressKit(options: GenerateKitOptions): Promise<{ intake: IntakeData; artifacts: KitArtifacts }> {
  const { role_title, organization = "Your Organization", mission = "" } = options;

  const systemPrompt = `You are a hiring operations specialist who creates comprehensive, bias-aware hiring materials. Your goal is to generate a complete hiring kit from minimal input.

  CRITICAL REQUIREMENTS:
  - Output ONLY valid JSON (no explanations or markdown)
  - Use bias-aware, inclusive language
  - Be specific and actionable
  - Follow the exact schema provided
  - Ensure all arrays have 3-5 items minimum
  - Create realistic, professional content
  
  You must generate both a complete intake data structure AND the hiring kit artifacts.`;

  const userPrompt = `Generate a complete hiring kit for:
  
  Role: ${role_title}
  Organization: ${organization}
  ${mission ? `Mission Context: ${mission}` : ""}
  
  Output a JSON object with this exact structure:
  {
    "intake": {
      "role_title": string,
      "organization": string,
      "reports_to": string,
      "department": string,
      "location": string,
      "employment_type": "full_time" | "part_time" | "contract" | "internship",
      "mission": string,
      "outcomes": string[],
      "responsibilities": string[],
      "core_skills": string[],
      "behavioral_competencies": string[],
      "values": string[],
      "success_metrics": {
        "d90": string,
        "d180": string,
        "d365": string
      },
      "job_post_intro": string,
      "job_post_summary": string,
      "must_have": string[],
      "nice_to_have": string[],
      "compensation": string,
      "how_to_apply": string,
      "work_sample_scenario": string
    },
    "artifacts": {
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
      },
      "job_post": {
        "intro": string,
        "summary": string,
        "responsibilities": string[],
        "must": string[],
        "nice": string[],
        "comp": string,
        "apply": string
      },
      "interview": {
        "stage1": {
          "questions": [{"question": string, "purpose": string, "ideal_response": string}],
          "rubric": [{"level": 1|2|3|4|5, "label": string, "description": string}]
        },
        "stage2": {
          "questions": [{"question": string, "purpose": string, "ideal_response": string}],
          "rubric": [{"level": 1|2|3|4|5, "label": string, "description": string}]
        },
        "stage3": {
          "questions": [{"question": string, "purpose": string, "ideal_response": string}],
          "rubric": [{"level": 1|2|3|4|5, "label": string, "description": string}]
        }
      },
      "work_sample": {
        "scenario": string,
        "instructions": string[],
        "scoring": [{"criteria": string, "weight": number, "description": string}]
      },
      "reference_check": {
        "questions": string[]
      },
      "process_map": {
        "steps": [{"name": string, "description": string, "duration": string, "owner": string}],
        "pacing": string[]
      },
      "eeo": {
        "principles": string[],
        "disclaimer": string
      }
    }
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Parse the JSON response
    const result = JSON.parse(content);
    
    return {
      intake: result.intake,
      artifacts: result.artifacts
    };

  } catch (error) {
    console.error("AI generation error:", error);
    
    // Fallback with sample data
    return generateFallbackKit(options);
  }
}

async function generateDetailedKit(intake: IntakeData): Promise<{ intake: IntakeData; artifacts: KitArtifacts }> {
  const systemPrompt = `You are a hiring operations specialist. Create comprehensive, bias-aware hiring artifacts based on the provided intake data.

  CRITICAL REQUIREMENTS:
  - Output ONLY valid JSON
  - Use the provided intake data as the foundation
  - Ensure consistency across all artifacts
  - Use bias-aware, inclusive language
  - Be specific and actionable`;

  const userPrompt = `Generate hiring kit artifacts based on this intake data:

  ${JSON.stringify(intake, null, 2)}
  
  Output JSON with this structure:
  {
    "scorecard": { /* same structure as express mode */ },
    "job_post": { /* same structure as express mode */ },
    "interview": { /* same structure as express mode */ },
    "work_sample": { /* same structure as express mode */ },
    "reference_check": { /* same structure as express mode */ },
    "process_map": { /* same structure as express mode */ },
    "eeo": { /* same structure as express mode */ }
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const artifacts = JSON.parse(content);
    
    return {
      intake,
      artifacts
    };

  } catch (error) {
    console.error("AI generation error:", error);
    return generateFallbackKit({ ...intake, express_mode: false });
  }
}

function generateFallbackKit(options: GenerateKitOptions): { intake: IntakeData; artifacts: KitArtifacts } {
  const { role_title = "Marketing Manager", organization = "Your Organization" } = options;

  const intake: IntakeData = {
    role_title,
    organization,
    reports_to: "VP Marketing",
    department: "Marketing",
    location: "Remote / Hybrid",
    employment_type: "full_time",
    mission: `Drive brand awareness and lead generation through integrated marketing campaigns across digital and traditional channels.`,
    outcomes: [
      "Increase qualified lead pipeline by 25% within 90 days",
      "Launch 3 successful marketing campaigns per quarter",
      "Improve brand awareness metrics by 30% in target market",
      "Establish marketing automation workflows"
    ],
    responsibilities: [
      "Develop and execute comprehensive marketing strategies",
      "Manage digital marketing campaigns across multiple channels",
      "Collaborate with sales team to optimize lead conversion",
      "Analyze marketing performance and ROI metrics",
      "Create compelling content for various marketing materials"
    ],
    core_skills: [
      "Digital marketing expertise (SEO, SEM, social media)",
      "Marketing automation platforms (HubSpot, Marketo)",
      "Data analysis and performance measurement",
      "Content creation and copywriting",
      "Project management and cross-functional collaboration"
    ],
    behavioral_competencies: [
      "Strategic thinking and planning",
      "Creative problem-solving",
      "Data-driven decision making",
      "Strong communication and presentation skills",
      "Adaptability to changing market conditions"
    ],
    values: [
      "Customer-centric approach",
      "Continuous learning and improvement",
      "Collaborative team spirit",
      "Ethical marketing practices",
      "Results-oriented mindset"
    ],
    success_metrics: {
      d90: "Launch first integrated campaign, establish key metrics tracking, and generate 50+ qualified leads",
      d180: "Optimize campaigns based on performance data, increase lead quality score by 20%, and implement marketing automation",
      d365: "Achieve annual lead generation targets, establish thought leadership content strategy, and mentor junior team members"
    },
    job_post_intro: `Join our growing team as a ${role_title} and help shape our marketing strategy.`,
    job_post_summary: `We're seeking a data-driven ${role_title} to lead our marketing efforts and drive sustainable growth.`,
    must_have: [
      "3+ years of marketing experience in B2B environment",
      "Bachelor's degree in Marketing, Business, or related field",
      "Proven experience with digital marketing campaigns",
      "Strong analytical skills and experience with marketing metrics",
      "Excellent written and verbal communication skills"
    ],
    nice_to_have: [
      "Experience with marketing automation platforms",
      "Previous startup or high-growth company experience",
      "Knowledge of additional languages",
      "Graphic design or video editing skills",
      "Industry certifications (Google Ads, HubSpot, etc.)"
    ],
    compensation: "Competitive salary commensurate with experience, plus equity and comprehensive benefits",
    how_to_apply: "Send your resume and a brief cover letter explaining why you're excited about this role.",
    work_sample_scenario: "You're launching a new product feature. Create a 3-month marketing campaign strategy with a $15K monthly budget targeting small business owners."
  };

  const artifacts: KitArtifacts = {
    scorecard: {
      mission: intake.mission,
      outcomes: intake.outcomes,
      responsibilities: intake.responsibilities,
      competencies: {
        core: intake.core_skills,
        behavioral: intake.behavioral_competencies,
        values: intake.values
      },
      success: intake.success_metrics
    },
    job_post: {
      intro: intake.job_post_intro!,
      summary: intake.job_post_summary!,
      responsibilities: intake.responsibilities,
      must: intake.must_have,
      nice: intake.nice_to_have,
      comp: intake.compensation!,
      apply: intake.how_to_apply!
    },
    interview: {
      stage1: {
        questions: [
          {
            question: "Walk me through your most successful marketing campaign. What metrics did you use to measure success?",
            purpose: "Assess practical experience and data-driven approach",
            ideal_response: "Candidate provides specific campaign details, metrics used, and demonstrates analytical thinking"
          },
          {
            question: "How do you approach developing a marketing strategy for a new product or service?",
            purpose: "Evaluate strategic thinking and process",
            ideal_response: "Shows systematic approach including market research, target audience analysis, and channel selection"
          },
          {
            question: "Describe a time when a marketing campaign didn't perform as expected. How did you handle it?",
            purpose: "Assess problem-solving skills and adaptability",
            ideal_response: "Demonstrates ability to analyze failure, iterate quickly, and learn from mistakes"
          }
        ],
        rubric: [
          { level: 1, label: "Below Expectations", description: "Vague responses, lacks specific examples or metrics" },
          { level: 2, label: "Partially Meets", description: "Some relevant experience but limited detail or analysis" },
          { level: 3, label: "Meets Expectations", description: "Clear examples with metrics, shows analytical thinking" },
          { level: 4, label: "Exceeds", description: "Detailed examples with strong metrics and strategic insights" },
          { level: 5, label: "Outstanding", description: "Exceptional examples demonstrating innovation and leadership" }
        ]
      },
      stage2: {
        questions: [
          {
            question: "How would you measure the ROI of different marketing channels for our business?",
            purpose: "Deep technical assessment of analytical skills",
            ideal_response: "Demonstrates understanding of attribution models, lifetime value, and multi-touch measurement"
          },
          {
            question: "Present a marketing strategy for entering a new market segment.",
            purpose: "Evaluate strategic planning and presentation skills",
            ideal_response: "Structured approach with research, positioning, tactics, and success metrics"
          }
        ],
        rubric: [
          { level: 1, label: "Below Expectations", description: "Limited technical knowledge or strategic thinking" },
          { level: 2, label: "Partially Meets", description: "Basic understanding but lacks depth or practical application" },
          { level: 3, label: "Meets Expectations", description: "Solid technical skills with practical examples" },
          { level: 4, label: "Exceeds", description: "Advanced skills with innovative approaches" },
          { level: 5, label: "Outstanding", description: "Expert-level knowledge with strategic vision" }
        ]
      },
      stage3: {
        questions: [
          {
            question: "How do you ensure your marketing practices are inclusive and avoid bias?",
            purpose: "Assess commitment to inclusive marketing and cultural awareness",
            ideal_response: "Shows understanding of inclusive design principles and diverse audience considerations"
          },
          {
            question: "Describe how you would collaborate with our sales and product teams.",
            purpose: "Evaluate cross-functional collaboration skills",
            ideal_response: "Demonstrates experience with cross-team alignment and shared goal setting"
          }
        ],
        rubric: [
          { level: 1, label: "Below Expectations", description: "Limited awareness of team dynamics or inclusive practices" },
          { level: 2, label: "Partially Meets", description: "Basic collaboration skills but limited inclusive marketing knowledge" },
          { level: 3, label: "Meets Expectations", description: "Good team collaboration and awareness of inclusive practices" },
          { level: 4, label: "Exceeds", description: "Strong collaboration skills with proactive inclusive approach" },
          { level: 5, label: "Outstanding", description: "Exceptional leadership in inclusive marketing and team alignment" }
        ]
      }
    },
    work_sample: {
      scenario: intake.work_sample_scenario!,
      instructions: [
        "Identify target customer segments and create buyer personas",
        "Develop key messaging and value propositions",
        "Outline campaign tactics across 3-4 marketing channels",
        "Create a monthly budget allocation breakdown",
        "Define success metrics and measurement plan",
        "Present your strategy in a 10-slide presentation format"
      ],
      scoring: [
        { criteria: "Strategic Thinking", weight: 30, description: "Quality of market analysis and strategic approach" },
        { criteria: "Creativity", weight: 25, description: "Innovative tactics and compelling messaging" },
        { criteria: "Budget Management", weight: 20, description: "Realistic budget allocation and ROI considerations" },
        { criteria: "Measurement Plan", weight: 15, description: "Appropriate metrics and tracking methodology" },
        { criteria: "Presentation Quality", weight: 10, description: "Clear communication and professional presentation" }
      ]
    },
    reference_check: {
      questions: [
        "Can you confirm the candidate's role and responsibilities during their time with your organization?",
        "How would you describe the candidate's performance in managing marketing campaigns?",
        "What were the candidate's greatest strengths in their marketing role?",
        "Were there any areas where the candidate needed additional support or development?",
        "How did the candidate collaborate with other teams, particularly sales and product?",
        "Would you rehire this candidate if you had an appropriate role available?",
        "Is there anything else you think would be helpful for us to know about this candidate?"
      ]
    },
    process_map: {
      steps: [
        { name: "Application Review", description: "Screen applications against must-have requirements", duration: "2-3 days", owner: "Hiring Manager" },
        { name: "Initial Screening", description: "Phone/video screening interview with Stage 1 questions", duration: "30 minutes", owner: "Hiring Manager" },
        { name: "Work Sample", description: "Candidate completes marketing strategy exercise", duration: "1 week", owner: "Candidate" },
        { name: "Deep Dive Interview", description: "Technical interview with Stage 2 questions", duration: "60 minutes", owner: "Hiring Manager + Marketing Lead" },
        { name: "Culture Interview", description: "Values and team fit assessment with Stage 3 questions", duration: "45 minutes", owner: "Team Members" },
        { name: "Reference Checks", description: "Contact 2-3 professional references", duration: "2-3 days", owner: "Hiring Manager" },
        { name: "Final Decision", description: "Team debrief and hiring decision", duration: "1 day", owner: "Hiring Committee" },
        { name: "Offer & Negotiation", description: "Extend offer and finalize terms", duration: "3-5 days", owner: "Hiring Manager + HR" }
      ],
      pacing: [
        "Week 1: Application review and initial screening",
        "Week 2: Work sample completion and review",
        "Week 3: Deep dive and culture interviews",
        "Week 4: Reference checks and final decision"
      ]
    },
    eeo: {
      principles: [
        "All candidates will be evaluated solely on job-related qualifications and abilities",
        "Interview questions will focus on skills, experience, and job performance indicators",
        "Avoid questions about protected characteristics (age, race, gender, religion, etc.)",
        "Provide consistent interview process and evaluation criteria for all candidates",
        "Document all hiring decisions with objective, job-related reasoning",
        "Ensure diverse interview panels when possible to reduce unconscious bias"
      ],
      disclaimer: "This hiring process is designed to promote fair and equal employment opportunities. All employment decisions will be made without regard to race, color, religion, sex, sexual orientation, gender identity, national origin, age, disability, or veteran status. This document provides guidance only and does not constitute legal advice. Consult with your legal counsel for specific compliance requirements."
    }
  };

  return { intake, artifacts };
}