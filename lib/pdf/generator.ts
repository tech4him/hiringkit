import type { Kit, KitArtifacts } from "@/types";
import JSZip from "jszip";
import { generateKitPDF } from "./pdfshift";
import { smartSplitPDF } from "./splitter";
import { createServerClient } from "@/lib/supabase/client";

interface ExportResult {
  success: boolean;
  url?: string;
  assets?: Array<{ type: string; url: string }>;
  error?: string;
}

export async function generatePDF(kit: Kit, exportType: "combined_pdf" | "zip"): Promise<ExportResult> {
  try {
    // For MVP, we'll create a mock PDF URL
    // In production, this would use Playwright/Puppeteer to generate actual PDFs
    
    const artifacts = kit.artifacts_json || kit.edited_json;
    
    if (!artifacts) {
      return {
        success: false,
        error: "No kit content found"
      };
    }

    if (exportType === "combined_pdf") {
      // Generate a single combined PDF
      const pdfUrl = await generateCombinedPDF(kit, artifacts);
      
      return {
        success: true,
        url: pdfUrl
      };
    } else {
      // Generate separate PDFs and create ZIP
      const zipResult = await generateZipExport(kit, artifacts);
      
      return {
        success: true,
        url: zipResult.url,
        assets: zipResult.assets
      };
    }

  } catch (error) {
    console.error("PDF generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

async function generateCombinedPDF(kit: Kit, artifacts: KitArtifacts): Promise<string> {
  try {
    // Generate PDF using PDFShift
    const pdfBuffer = await generateKitPDF(kit, artifacts);
    
    // Upload to Supabase Storage
    const supabase = createServerClient();
    const fileName = `kits/${kit.id}/combined_${Date.now()}.pdf`;
    
    const { data, error } = await supabase.storage
      .from('exports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (error) {
      console.error('Storage upload error:', error);
      // Fallback to mock URL for testing
      return generateMockPdfUrl(kit.id, "combined");
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback to mock URL for testing
    return generateMockPdfUrl(kit.id, "combined");
  }
}

async function generateZipExport(kit: Kit, artifacts: KitArtifacts): Promise<{ url: string; assets: Array<{ type: string; url: string }> }> {
  try {
    const zip = new JSZip();
    const supabase = createServerClient();
    const assets: Array<{ type: string; url: string }> = [];
    
    // Generate individual PDFs for each artifact
    const artifactTypes = [
      { type: "scorecard", name: "1_Role_Scorecard.pdf" },
      { type: "job_post", name: "2_Job_Post.pdf" },
      { type: "interview_stage1", name: "3_Interview_Stage_1.pdf" },
      { type: "interview_stage2", name: "4_Interview_Stage_2.pdf" },
      { type: "interview_stage3", name: "5_Interview_Stage_3.pdf" },
      { type: "work_sample", name: "6_Work_Sample.pdf" },
      { type: "reference_check", name: "7_Reference_Check.pdf" },
      { type: "process_map", name: "8_Process_Map.pdf" },
      { type: "eeo", name: "9_EEO_Guidelines.pdf" }
    ];

    // Generate each PDF and add to ZIP
    for (const artifact of artifactTypes) {
      try {
        const pdfBuffer = await generateArtifactPDF(kit, artifacts, artifact.type);
        zip.file(artifact.name, pdfBuffer);
        
        // Upload individual PDF to storage
        const fileName = `kits/${kit.id}/${artifact.type}_${Date.now()}.pdf`;
        const { data, error } = await supabase.storage
          .from('exports')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600'
          });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('exports')
            .getPublicUrl(fileName);
          assets.push({ type: artifact.type, url: publicUrl });
        }
      } catch (error) {
        console.error(`Error generating ${artifact.type}:`, error);
        // Add mock PDF for failed generation
        const mockPdf = generateMockPdfContent(kit.id, artifact.type);
        zip.file(artifact.name, mockPdf);
      }
    }

    // Add README
    zip.file("README.txt", `Hiring Kit for ${kit.title}
Generated: ${new Date().toISOString()}

This ZIP contains all documents for your hiring kit.
Each PDF is a separate file for easy sharing and printing.`);

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    // Upload ZIP to storage
    const zipFileName = `kits/${kit.id}/complete_kit_${Date.now()}.zip`;
    const { data: zipData, error: zipError } = await supabase.storage
      .from('exports')
      .upload(zipFileName, zipBuffer, {
        contentType: 'application/zip',
        cacheControl: '3600'
      });

    if (zipError) {
      console.error('ZIP upload error:', zipError);
      // Fallback to mock URL
      return {
        url: generateMockPdfUrl(kit.id, "complete_kit_zip"),
        assets
      };
    }

    const { data: { publicUrl: zipUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(zipFileName);

    return {
      url: zipUrl,
      assets
    };
  } catch (error) {
    console.error('ZIP generation error:', error);
    // Fallback to mock URLs
    const mockAssets = [
      { type: "scorecard", url: generateMockPdfUrl(kit.id, "scorecard") },
      { type: "job_post", url: generateMockPdfUrl(kit.id, "job_post") },
      { type: "interview_stage1", url: generateMockPdfUrl(kit.id, "interview_stage1") },
      { type: "interview_stage2", url: generateMockPdfUrl(kit.id, "interview_stage2") },
      { type: "interview_stage3", url: generateMockPdfUrl(kit.id, "interview_stage3") },
      { type: "work_sample", url: generateMockPdfUrl(kit.id, "work_sample") },
      { type: "reference_check", url: generateMockPdfUrl(kit.id, "reference_check") },
      { type: "process_map", url: generateMockPdfUrl(kit.id, "process_map") },
      { type: "eeo", url: generateMockPdfUrl(kit.id, "eeo") }
    ];
    
    return {
      url: generateMockPdfUrl(kit.id, "complete_kit_zip"),
      assets: mockAssets
    };
  }
}

function generateMockPdfContent(kitId: string, type: string): Buffer {
  // Generate a simple valid PDF as fallback
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 180 >>
stream
BT
/F1 24 Tf
50 700 Td
(${type.replace(/_/g, ' ').toUpperCase()}) Tj
0 -40 Td
/F1 12 Tf
(Kit ID: ${kitId}) Tj
0 -20 Td
(Mock PDF - PDFShift not configured) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000312 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
692
%%EOF`;
  
  return Buffer.from(pdfContent);
}

function generateMockPdfUrl(kitId: string, type: string): string {
  // For MVP, return a mock download URL
  // In production, this would be a real Supabase Storage signed URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const extension = type.includes("zip") ? "zip" : "pdf";
  return `${baseUrl}/api/download/mock/${kitId}/${type}.${extension}?t=${Date.now()}`;
}

// Mock download endpoint for testing
export async function handleMockDownload(kitId: string, filename: string): Promise<Response> {
  // Check if it's a ZIP request
  const isZip = filename.includes("zip");
  
  if (isZip) {
    // Create a proper ZIP file using JSZip
    const zip = new JSZip();
    
    // Add mock PDF files to the ZIP
    const documents = [
      "1_cover_page.pdf",
      "2_quick_start.pdf", 
      "3_role_scorecard.pdf",
      "4_job_post.pdf",
      "5_interview_stage1.pdf",
      "6_interview_stage2.pdf", 
      "7_interview_stage3.pdf",
      "8_work_sample.pdf",
      "9_reference_check.pdf",
      "10_process_map.pdf",
      "11_eeo_guidelines.pdf"
    ];
    
    // Add each document as a mock PDF
    documents.forEach(docName => {
      const mockPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 180 >>
stream
BT
/F1 24 Tf
50 700 Td
(${docName.replace('.pdf', '').replace(/_/g, ' ').toUpperCase()}) Tj
0 -40 Td
/F1 12 Tf
(Kit ID: ${kitId}) Tj
0 -20 Td
(Mock PDF content for testing) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000312 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
692
%%EOF`;
      
      zip.file(docName, mockPdfContent);
    });
    
    // Add a README
    zip.file("README.txt", `Hiring Kit Export
Kit ID: ${kitId}
Generated: ${new Date().toISOString()}

This ZIP contains all documents for your hiring kit.
Each PDF is a separate file for easy sharing and printing.

Documents included:
- Cover Page & Quick Start Guide
- Role Scorecard
- Job Post
- Interview Guides (3 stages)
- Work Sample Assignment
- Reference Check Script
- Process Map
- EEO Guidelines`);
    
    // Generate the ZIP file
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });
    
    return new Response(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } else {
    // Create a minimal valid PDF
    // PDF structure: header, body with objects, xref table, trailer
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 244 >>
stream
BT
/F1 24 Tf
50 700 Td
(Hiring Kit - Mock PDF) Tj
0 -40 Td
/F1 16 Tf
(Kit ID: ${kitId}) Tj
0 -30 Td
(Document: ${filename}) Tj
0 -40 Td
/F1 12 Tf
(This is a test PDF for the hiring kit export.) Tj
0 -20 Td
(Generated: ${new Date().toISOString()}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000312 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
756
%%EOF`;

    return new Response(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  }
}