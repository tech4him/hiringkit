import type { Kit, KitArtifacts } from "@/types";

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
  // For MVP, we'll return a mock URL
  // In production, this would:
  // 1. Render HTML templates with kit data
  // 2. Use Playwright to convert HTML to PDF
  // 3. Upload to Supabase Storage
  // 4. Return signed URL
  
  const mockPdfUrl = generateMockPdfUrl(kit.id, "combined");
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return mockPdfUrl;
}

async function generateZipExport(kit: Kit, artifacts: KitArtifacts): Promise<{ url: string; assets: Array<{ type: string; url: string }> }> {
  // For MVP, we'll return mock URLs
  // In production, this would:
  // 1. Generate individual PDFs for each artifact
  // 2. Create ZIP file containing all PDFs
  // 3. Upload to Supabase Storage
  // 4. Return signed URLs
  
  const assets = [
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
  
  const zipUrl = generateMockPdfUrl(kit.id, "complete_kit_zip");
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    url: zipUrl,
    assets
  };
}

function generateMockPdfUrl(kitId: string, type: string): string {
  // For MVP, return a mock download URL
  // In production, this would be a real Supabase Storage signed URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/download/mock/${kitId}/${type}.pdf?t=${Date.now()}`;
}

// Mock download endpoint for testing
export async function handleMockDownload(kitId: string, filename: string): Promise<Response> {
  // Generate a simple PDF-like response for testing
  const content = `Mock PDF Content for Kit ${kitId} - ${filename}
  
This is a placeholder PDF file for testing the hiring kit export functionality.

In production, this would be a real PDF containing:
- Professional formatting
- Kit-specific content
- Proper page breaks
- Headers and footers
- Branded design

Generated at: ${new Date().toISOString()}`;

  return new Response(content, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  });
}