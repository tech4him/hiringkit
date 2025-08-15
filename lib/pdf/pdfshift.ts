import { Kit, KitArtifacts, Scorecard, JobPost, InterviewStages, InterviewStage, InterviewQuestion, RubricRow, WorkSample, ScoringCriteria, ReferenceCheck, ProcessMap, ProcessStep, EEOGuidelines } from "@/types";
import { env, shouldUseRealPDFGeneration } from "@/lib/config/env";
import { logError, logPerformance } from "@/lib/logger";

interface PDFShiftOptions {
  source: string; // HTML content
  landscape?: boolean;
  format?: "A4" | "Letter" | "Legal";
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  css?: string; // Additional CSS
  javascript?: boolean;
  wait_for?: string; // CSS selector to wait for
}

export async function generatePDFWithPDFShift(html: string, options: Partial<PDFShiftOptions> = {}): Promise<Buffer> {
  const startTime = Date.now();
  
  // Use mock PDF only if real PDF generation is disabled
  if (!shouldUseRealPDFGeneration()) {
    logPerformance('PDF_GENERATION_MOCK', Date.now() - startTime, {
      mode: 'development_mock',
      htmlLength: html.length,
      reason: 'ENABLE_REAL_PDF_GENERATION not set to true',
    });
    
    return generateMockPDF();
  }

  const apiKey = env.PDFSHIFT_API_KEY;
  
  if (!apiKey) {
    throw new Error("PDFSHIFT_API_KEY is not configured for production");
  }

  const pdfOptions: PDFShiftOptions = {
    source: html,
    format: "Letter",
    margin: {
      top: "0.75in",
      bottom: "0.75in",
      left: "0.5in",
      right: "0.5in"
    },
    ...options
  };

  try {
    const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pdfOptions)
    });

    if (!response.ok) {
      const error = await response.text();
      logError(new Error(`PDFShift API error: ${response.status} - ${error}`), {
        context: 'pdfshift_api_call',
        status: response.status,
        htmlLength: html.length,
      });
      throw new Error(`PDFShift API error: ${response.status} - ${error}`);
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    
    logPerformance('PDF_GENERATION_PDFSHIFT', Date.now() - startTime, {
      mode: 'production',
      htmlLength: html.length,
      pdfSize: pdfBuffer.length,
    });
    
    return pdfBuffer;
  } catch (error) {
    logError(error as Error, {
      context: 'pdfshift_generation',
      htmlLength: html.length,
    });
    throw error;
  }
}

// Generate mock PDF for development
function generateMockPDF(): Buffer {
  const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(MOCK PDF - DEVELOPMENT MODE) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000190 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
290
%%EOF`;
  
  return Buffer.from(mockPdfContent);
}

export async function generateKitPDF(kit: Kit, artifacts: KitArtifacts): Promise<Buffer> {
  // Generate HTML from kit data
  const html = generateKitHTML(kit, artifacts);
  
  // Convert to PDF using PDFShift
  return generatePDFWithPDFShift(html, {
    format: "Letter"
    // Note: Removed javascript option as it was causing API errors
  });
}

export async function generateArtifactPDF(
  kit: Kit, 
  artifacts: KitArtifacts, 
  artifactType: string
): Promise<Buffer> {
  // Generate HTML for specific artifact
  const html = generateArtifactHTML(kit, artifacts, artifactType);
  
  // Convert to PDF using PDFShift
  return generatePDFWithPDFShift(html, {
    format: "Letter",
    css: getKitCSS()
  });
}

function generateKitHTML(kit: Kit, artifacts: KitArtifacts): string {
  // Generate with section markers for splitting
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${kit.title || "Hiring Kit"}</title>
  <style>
    ${getKitCSS()}
  </style>
</head>
<body>
  <div class="container">
    <!-- SECTION:COVER:START -->
    ${generateCoverPage(kit)}
    <!-- SECTION:COVER:END -->
    
    <!-- SECTION:SCORECARD:START -->
    ${generateScorecard(artifacts.scorecard)}
    <!-- SECTION:SCORECARD:END -->
    
    <!-- SECTION:JOB_POST:START -->
    ${generateJobPost(artifacts.job_post)}
    <!-- SECTION:JOB_POST:END -->
    
    <!-- SECTION:INTERVIEWS:START -->
    ${generateInterviewGuides(artifacts.interview)}
    <!-- SECTION:INTERVIEWS:END -->
    
    <!-- SECTION:WORK_SAMPLE:START -->
    ${generateWorkSample(artifacts.work_sample)}
    <!-- SECTION:WORK_SAMPLE:END -->
    
    <!-- SECTION:REFERENCE:START -->
    ${generateReferenceCheck(artifacts.reference_check)}
    <!-- SECTION:REFERENCE:END -->
    
    <!-- SECTION:PROCESS:START -->
    ${generateProcessMap(artifacts.process_map)}
    <!-- SECTION:PROCESS:END -->
    
    <!-- SECTION:EEO:START -->
    ${generateEEOGuidelines(artifacts.eeo)}
    <!-- SECTION:EEO:END -->
  </div>
</body>
</html>
  `;
}

function generateArtifactHTML(kit: Kit, artifacts: KitArtifacts, artifactType: string): string {
  let content = "";
  
  switch(artifactType) {
    case "scorecard":
      content = generateScorecard(artifacts.scorecard);
      break;
    case "job_post":
      content = generateJobPost(artifacts.job_post);
      break;
    case "interview_stage1":
      content = generateInterviewGuide(artifacts.interview?.stage1, 1);
      break;
    case "interview_stage2":
      content = generateInterviewGuide(artifacts.interview?.stage2, 2);
      break;
    case "interview_stage3":
      content = generateInterviewGuide(artifacts.interview?.stage3, 3);
      break;
    case "work_sample":
      content = generateWorkSample(artifacts.work_sample);
      break;
    case "reference_check":
      content = generateReferenceCheck(artifacts.reference_check);
      break;
    case "process_map":
      content = generateProcessMap(artifacts.process_map);
      break;
    case "eeo":
      content = generateEEOGuidelines(artifacts.eeo);
      break;
    default:
      content = "<p>Unknown artifact type</p>";
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${kit.title || "Hiring Kit"} - ${artifactType}</title>
  <style>
    ${getKitCSS()}
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
  `;
}

function getKitCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
    }
    
    .page {
      page-break-after: always;
      page-break-inside: avoid;
      padding: 0.75in 0.5in;
      min-height: 11in;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Prevent breaking inside key elements */
    .keep-together {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .scorecard-table,
    .rubric-table,
    .process-step,
    .interview-question,
    .reference-question {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Add orphan and widow control */
    p, li {
      orphans: 3;
      widows: 3;
    }
    
    /* Ensure headers stay with content */
    h1, h2, h3, h4 {
      page-break-after: avoid;
      break-after: avoid;
    }
    
    /* Keep lists together when possible */
    ul, ol {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #1F4B99;
    }
    
    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 16px;
      color: #1F4B99;
    }
    
    h3 {
      font-size: 16px;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 12px;
      color: #333;
    }
    
    p {
      margin-bottom: 12px;
    }
    
    ul, ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 11in;
    }
    
    .scorecard-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .scorecard-table th,
    .scorecard-table td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    
    .scorecard-table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    
    .rubric-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    .rubric-table th,
    .rubric-table td {
      border: 1px solid #ddd;
      padding: 10px;
      font-size: 14px;
    }
    
    .rubric-table th {
      background-color: #1F4B99;
      color: white;
    }
    
    .process-step {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e3f2fd;
      color: #1F4B99;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
  `;
}

// Template generation functions
function generateCoverPage(kit: Kit): string {
  if (!kit?.intake_json) {
    return '<div class="page cover-page"><h1>Invalid Kit Data</h1></div>';
  }
  
  const intake = kit.intake_json;
  const organization = intake.organization || "Organization";
  const roleTitle = intake.role_title || "Role";
  
  return `
    <div class="page cover-page">
      <div style="text-align: center; margin-bottom: 60px;">
        <h1 style="font-size: 36px; margin-bottom: 10px; color: #1F4B99;">${roleTitle}</h1>
        <h2 style="font-size: 24px; margin-bottom: 20px; color: #666;">Hiring Kit</h2>
        <p style="font-size: 18px; color: #666;">${organization}</p>
      </div>
      
      <div style="text-align: left; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #1F4B99; margin-bottom: 20px;">What's Included</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 14px;">
          <div>✓ Role Scorecard</div>
          <div>✓ Job Post</div>
          <div>✓ Interview Guide - Stage 1</div>
          <div>✓ Interview Guide - Stage 2</div>
          <div>✓ Interview Guide - Stage 3</div>
          <div>✓ Work Sample Assignment</div>
          <div>✓ Reference Check Script</div>
          <div>✓ Process Map</div>
          <div>✓ EEO Guidelines</div>
        </div>
      </div>
      
      <div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); text-align: center; color: #666; font-size: 12px;">
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <p>Powered by Hiring Kit Platform</p>
      </div>
    </div>
  `;
}

function generateScorecard(scorecard: Scorecard): string {
  if (!scorecard) return "";
  
  return `
    <div class="page">
      <h1>Role Scorecard</h1>
      
      <div class="keep-together" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Mission</h2>
        <p>${scorecard.mission || ""}</p>
      </div>
      
      <h2>Key Outcomes</h2>
      <ul>
        ${(scorecard.outcomes || []).map((outcome: string) => `<li>${outcome}</li>`).join("")}
      </ul>
      
      <h2>Key Responsibilities</h2>
      <ul>
        ${(scorecard.responsibilities || []).map((resp: string) => `<li>${resp}</li>`).join("")}
      </ul>
      
      <h2>Core Competencies</h2>
      ${scorecard.competencies ? `
        <h3>Core Skills</h3>
        <ul>
          ${(scorecard.competencies.core || []).map((skill: string) => `<li>${skill}</li>`).join("")}
        </ul>
        
        <h3>Behavioral Competencies</h3>
        <ul>
          ${(scorecard.competencies.behavioral || []).map((comp: string) => `<li>${comp}</li>`).join("")}
        </ul>
        
        <h3>Values Alignment</h3>
        <ul>
          ${(scorecard.competencies.values || []).map((value: string) => `<li>${value}</li>`).join("")}
        </ul>
      ` : ""}
      
      <h2>Success Metrics</h2>
      ${scorecard.success ? `
        <table class="scorecard-table">
          <tr>
            <th>Timeframe</th>
            <th>Success Criteria</th>
          </tr>
          <tr>
            <td><strong>90 Days</strong></td>
            <td>${scorecard.success.d90 || ""}</td>
          </tr>
          <tr>
            <td><strong>180 Days</strong></td>
            <td>${scorecard.success.d180 || ""}</td>
          </tr>
          <tr>
            <td><strong>365 Days</strong></td>
            <td>${scorecard.success.d365 || ""}</td>
          </tr>
        </table>
      ` : ""}
    </div>
  `;
}

function generateJobPost(jobPost: JobPost): string {
  if (!jobPost) return "";
  
  return `
    <div class="page">
      <h1>Job Post</h1>
      
      <div class="keep-together" style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h2 style="margin-top: 0; color: #1F4B99;">Job Description</h2>
        <p style="font-size: 16px; line-height: 1.6;">${jobPost.intro || ""}</p>
      </div>
      
      <h3>Role Summary</h3>
      <p>${jobPost.summary || ""}</p>
      
      <h3>What You'll Do</h3>
      <ul>
        ${(jobPost.responsibilities || []).map((resp: string) => `<li>${resp}</li>`).join("")}
      </ul>
      
      <h3>What We're Looking For</h3>
      
      <h4>Must-Have Qualifications</h4>
      <ul>
        ${(jobPost.must || []).map((req: string) => `<li>${req}</li>`).join("")}
      </ul>
      
      <h4>Nice-to-Have Qualifications</h4>
      <ul>
        ${(jobPost.nice || []).map((req: string) => `<li>${req}</li>`).join("")}
      </ul>
      
      <h3>Compensation</h3>
      <p>${jobPost.comp || "Competitive compensation package"}</p>
      
      <div class="keep-together" style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #1F4B99;">
        <h4 style="margin-top: 0; color: #1F4B99;">How to Apply</h4>
        <p style="margin-bottom: 0;">${jobPost.apply || "Submit your application through our careers page."}</p>
      </div>
    </div>
  `;
}

function generateInterviewGuides(interview: InterviewStages): string {
  if (!interview) return "";
  
  const stages = [interview.stage1, interview.stage2, interview.stage3].filter(Boolean);
  return stages.map((stage, index) => generateInterviewGuide(stage, index + 1)).join("");
}

function generateInterviewGuide(stage: InterviewStage, stageNumber: number): string {
  if (!stage) return "";
  
  const stageNames = ["Screening & Cultural Fit", "Technical & Experience Deep Dive", "Final Assessment & Team Fit"];
  const stageName = stageNames[stageNumber - 1] || `Stage ${stageNumber}`;
  
  return `
    <div class="page">
      <h1>Interview Guide - Stage ${stageNumber}</h1>
      <h2>${stageName}</h2>
      
      <div style="margin: 20px 0;">
        <span class="badge">Duration: 60 minutes</span>
        <span class="badge">Format: Structured Interview</span>
      </div>
      
      <h3>Interview Questions</h3>
      ${(stage.questions || []).map((q: InterviewQuestion, i: number) => `
        <div class="interview-question" style="margin: 24px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h4 style="color: #1F4B99;">Question ${i + 1}</h4>
          <p style="font-size: 16px; font-weight: 500; margin: 12px 0;">${q.question}</p>
          
          <div style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 12px 0;">
            <strong>Purpose:</strong> ${q.purpose || "Assess candidate competency"}
          </div>
          
          ${q.ideal_response ? `
            <div style="background: #e8f5e8; padding: 12px; border-radius: 4px; margin: 12px 0;">
              <strong>What to look for:</strong> ${q.ideal_response}
            </div>
          ` : ""}
        </div>
      `).join("")}
      
      <h3>Evaluation Rubric</h3>
      ${stage.rubric ? `
        <table class="rubric-table">
          <thead>
            <tr>
              <th width="20%">Rating</th>
              <th>Criteria</th>
            </tr>
          </thead>
          <tbody>
            ${stage.rubric.map((r: RubricRow) => `
              <tr>
                <td><strong>${r.level} - ${r.label}</strong></td>
                <td>${r.description}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : ""}
      
      <div class="keep-together" style="margin-top: 30px; padding: 16px; background: #fff3cd; border-radius: 8px;">
        <h4 style="margin-top: 0;">💡 Interview Tips</h4>
        <ul style="margin-bottom: 0;">
          <li>Give candidates time to think before answering</li>
          <li>Use follow-up questions to probe deeper into responses</li>
          <li>Take detailed notes for each question</li>
          <li>Rate each response immediately after the question</li>
        </ul>
      </div>
    </div>
  `;
}

function generateWorkSample(workSample: WorkSample): string {
  if (!workSample) return "";
  
  return `
    <div class="page">
      <h1>Work Sample Assignment</h1>
      
      <div class="keep-together" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #1F4B99;">Scenario-Based Assessment</h2>
        <p style="font-size: 16px; line-height: 1.6;">${workSample.scenario || ""}</p>
      </div>
      
      <div style="margin: 20px 0;">
        <span class="badge">Time Limit: 3-5 days</span>
        <span class="badge">Estimated Effort: 2-3 hours</span>
        <span class="badge">Format: Written Response</span>
      </div>
      
      <h3>Instructions</h3>
      <ol>
        ${(workSample.instructions || []).map((instruction: string) => `<li>${instruction}</li>`).join("")}
      </ol>
      
      <h3>Evaluation Criteria</h3>
      ${workSample.scoring ? `
        <table class="scorecard-table">
          <thead>
            <tr>
              <th>Criteria</th>
              <th>Weight</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${workSample.scoring.map((s: ScoringCriteria) => `
              <tr>
                <td><strong>${s.criteria}</strong></td>
                <td>${s.weight}%</td>
                <td>${s.description}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : ""}
      
      <div class="keep-together" style="margin-top: 30px; padding: 16px; background: #e3f2fd; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #1F4B99;">Submission Guidelines</h4>
        <ul style="margin-bottom: 0;">
          <li>Submit your response as a structured document (Word/PDF)</li>
          <li>Include clear headings for each section of your response</li>
          <li>Provide specific examples and reasoning for your approach</li>
          <li>Keep your response concise but thorough (2-3 pages maximum)</li>
        </ul>
      </div>
    </div>
  `;
}

function generateReferenceCheck(referenceCheck: ReferenceCheck): string {
  if (!referenceCheck) return "";
  
  return `
    <div class="page">
      <h1>Reference Check Script</h1>
      
      <h2>Introduction Script</h2>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p>"Hi [Reference Name], thank you for taking the time to speak with me about [Candidate Name]. We're considering them for a Partner Support Coordinator role at our organization, and [Candidate Name] listed you as a reference. I have a few questions that should take about 10-15 minutes. Is now a good time?"</p>
      </div>
      
      <h2>Reference Questions</h2>
      ${(referenceCheck.questions || []).map((question: string, i: number) => `
        <div class="reference-question" style="margin: 24px 0; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
          <h3 style="color: #1F4B99;">Question ${i + 1}</h3>
          <p style="font-weight: 500; margin: 12px 0;">${question}</p>
          
          <div style="margin-top: 16px;">
            <p style="font-size: 14px; color: #666; margin: 8px 0;"><strong>Notes:</strong></p>
            <div style="border: 1px solid #ddd; min-height: 60px; padding: 8px; background: #fafafa;"></div>
          </div>
        </div>
      `).join("")}
      
      <h2>Closing Script</h2>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p>"Thank you so much for your time and insights about [Candidate Name]. This information is very helpful for our decision-making process. If we have any follow-up questions, would it be okay to reach out to you again? Have a great day!"</p>
      </div>
      
      <div class="keep-together" style="margin-top: 30px; padding: 16px; background: #fff3cd; border-radius: 8px;">
        <h4 style="margin-top: 0;">📝 Reference Check Tips</h4>
        <ul style="margin-bottom: 0; font-size: 14px;">
          <li>Take detailed notes during the conversation</li>
          <li>Listen for enthusiasm (or lack thereof) in the reference's tone</li>
          <li>Ask follow-up questions if responses seem vague</li>
          <li>Pay attention to what they DON'T say as much as what they do say</li>
          <li>Complete the reference check within 24-48 hours of the interview</li>
        </ul>
      </div>
    </div>
  `;
}

function generateProcessMap(processMap: ProcessMap): string {
  if (!processMap) return "";
  
  return `
    <div class="page">
      <h1>Hiring Process Map</h1>
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #1F4B99;">Process Overview</h2>
        <p style="margin-bottom: 0;">This structured hiring process ensures we find the best candidate while providing a positive experience for all applicants.</p>
      </div>
      
      <h2>Process Steps</h2>
      ${(processMap.steps || []).map((step: ProcessStep, i: number) => `
        <div class="process-step" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; position: relative;">
          <div style="position: absolute; top: -12px; left: 20px; background: #1F4B99; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            Step ${i + 1}
          </div>
          <h3 style="margin-top: 12px; color: #1F4B99;">${step.name}</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 16px 0;">
            <div>
              <strong>Duration:</strong> ${step.duration || "TBD"}
            </div>
            <div>
              <strong>Owner:</strong> ${step.owner || "Hiring Manager"}
            </div>
          </div>
          <p>${step.description || ""}</p>
        </div>
      `).join("")}
      
      <h2>Timeline Summary</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        ${(processMap.pacing || []).map((phase: string) => `
          <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">${phase}</div>
        `).join("")}
      </div>
      
      <div class="keep-together" style="margin-top: 30px; padding: 16px; background: #e8f5e8; border-radius: 8px;">
        <h4 style="margin-top: 0;">✨ Process Success Tips</h4>
        <ul style="margin-bottom: 0; font-size: 14px;">
          <li>Communicate with candidates at each stage to manage expectations</li>
          <li>Document decisions and feedback after each step</li>
          <li>Involve diverse perspectives in the evaluation process</li>
          <li>Be prepared to adjust timelines based on candidate availability</li>
        </ul>
      </div>
    </div>
  `;
}

function generateEEOGuidelines(eeo: EEOGuidelines): string {
  if (!eeo) return "";
  
  return `
    <div class="page">
      <h1>EEO Guidelines & Bias Mitigation</h1>
      
      <div class="keep-together" style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h2 style="margin-top: 0;">⚠️ Important Legal Notice</h2>
        <p style="margin-bottom: 0;">These guidelines help ensure compliance with equal employment opportunity laws and promote fair, unbiased hiring practices.</p>
      </div>
      
      <h2>Core Principles</h2>
      <ul>
        ${(eeo.principles || []).map((principle: string) => `<li>${principle}</li>`).join("")}
      </ul>
      
      <h2>Prohibited Interview Topics</h2>
      <div class="keep-together" style="background: #ffe6e6; padding: 16px; border-radius: 8px; border-left: 4px solid #dc3545;">
        <p><strong>Never ask about or discuss:</strong></p>
        <ul>
          <li>Age, birth date, or graduation dates</li>
          <li>Marital status, family plans, or pregnancy</li>
          <li>Race, ethnicity, national origin, or accent</li>
          <li>Religion, religious practices, or holidays observed</li>
          <li>Sexual orientation or gender identity</li>
          <li>Disability, health conditions, or medical history</li>
          <li>Arrest record (unless conviction is job-related)</li>
          <li>Financial status, credit history, or garnishments</li>
        </ul>
      </div>
      
      <h2>What You CAN Ask</h2>
      <div class="keep-together" style="background: #e8f5e8; padding: 16px; border-radius: 8px; border-left: 4px solid #28a745;">
        <ul>
          <li>Job-related skills and experience</li>
          <li>Ability to perform essential job functions</li>
          <li>Availability to work required schedule</li>
          <li>Authorization to work in the United States</li>
          <li>Educational background relevant to the role</li>
          <li>Professional references and past employment</li>
        </ul>
      </div>
      
      <h2>Bias Mitigation Checklist</h2>
      <div class="keep-together" style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
        <ul style="list-style-type: none; padding-left: 0;">
          <li>☐ Use the same questions for all candidates in the same role</li>
          <li>☐ Focus on job-related competencies and requirements</li>
          <li>☐ Take detailed notes during interviews</li>
          <li>☐ Include diverse perspectives in the hiring panel</li>
          <li>☐ Document the reasons for hiring decisions</li>
          <li>☐ Avoid making assumptions based on appearance or background</li>
        </ul>
      </div>
      
      <div class="keep-together" style="margin-top: 30px; background: #e3f2fd; padding: 16px; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #1F4B99;">Equal Opportunity Statement</h3>
        <p style="margin-bottom: 0; font-style: italic;">${eeo.disclaimer || "We are an equal opportunity employer committed to creating an inclusive environment for all employees."}</p>
      </div>
    </div>
  `;
}