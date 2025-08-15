import type { Kit, KitArtifacts } from "@/types";
import archiver from "archiver";
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
    
    const artifacts = kit.artifacts_json || kit.edited_json;
    
    if (!artifacts) {
      return {
        success: false,
        error: "No kit content found"
      };
    }

    // STEP 1: Check if we already have this export cached
    const cachedExport = await checkCachedExport(kit.id, exportType);
    if (cachedExport) {
      console.log(`📦 Using cached ${exportType} for kit ${kit.id}`);
      return {
        success: true,
        url: cachedExport.url,
        assets: cachedExport.assets
      };
    }

    // STEP 2: Generate new export
    console.log(`🚀 Generating new ${exportType} for kit ${kit.id}`);
    
    if (exportType === "combined_pdf") {
      // Generate a single combined PDF
      const pdfUrl = await generateCombinedPDF(kit, artifacts);
      
      return {
        success: true,
        url: pdfUrl
      };
    } else {
      // Generate separate PDFs and create ZIP (OPTIMIZED)
      const zipResult = await generateZipExportOptimized(kit, artifacts);
      
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

async function checkCachedExport(kitId: string, exportType: "combined_pdf" | "zip"): Promise<{ url: string; assets?: Array<{ type: string; url: string }> } | null> {
  try {
    const supabase = createServerClient();
    
    // Check for existing export in the last 24 hours
    const { data: exports, error } = await supabase
      .from('exports')
      .select(`
        id,
        url,
        created_at,
        export_assets (
          artifact,
          url
        )
      `)
      .eq('kit_id', kitId)
      .eq('kind', exportType)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !exports || exports.length === 0) {
      return null;
    }

    const exportRecord = exports[0];
    
    // Verify the file still exists in storage
    // const supabaseStorage = createServerClient();
    const fileKey = exportRecord.url.split('/').pop();
    
    if (!fileKey) return null;
    
    // For simplicity, we'll trust the database record
    // In production, you might want to verify the file exists
    
    return {
      url: exportRecord.url,
      assets: exportRecord.export_assets?.map((asset: { artifact: string; url: string }) => ({
        type: asset.artifact,
        url: asset.url
      }))
    };
  } catch (error) {
    console.error('Error checking cached export:', error);
    return null;
  }
}

async function generateCombinedPDF(kit: Kit, artifacts: KitArtifacts): Promise<string> {
  try {
    // Generate PDF using PDFShift
    const pdfBuffer = await generateKitPDF(kit, artifacts);
    
    // Upload to Supabase Storage
    const supabase = createServerClient();
    const fileName = `kits/${kit.id}/combined_${Date.now()}.pdf`;
    
    const { error } = await supabase.storage
      .from('exports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload PDF to storage: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName);

    console.log(`✅ Combined PDF generated using 1 PDFShift credit`);
    return publicUrl;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

// OPTIMIZED: Generate ONE master PDF, then split locally
async function generateZipExportOptimized(kit: Kit, artifacts: KitArtifacts): Promise<{ url: string; assets: Array<{ type: string; url: string }> }> {
  try {
    const supabase = createServerClient();
    const assets: Array<{ type: string; url: string }> = [];
    
    console.log("🚀 OPTIMIZED: Generating master PDF for splitting...");
    const masterPdfBuffer = await generateKitPDF(kit, artifacts);
    
    console.log("✂️ Splitting master PDF into individual documents...");
    const splitPdfs = await smartSplitPDF(masterPdfBuffer);
    
    // Define the file names for each section
    const sectionNames = {
      cover: "1_Cover_and_Quick_Start.pdf",
      scorecard: "2_Role_Scorecard.pdf", 
      job_post: "3_Job_Post.pdf",
      interview_stage1: "4_Interview_Stage_1.pdf",
      interview_stage2: "5_Interview_Stage_2.pdf",
      interview_stage3: "6_Interview_Stage_3.pdf",
      work_sample: "7_Work_Sample.pdf",
      reference_check: "8_Reference_Check.pdf",
      process_map: "9_Process_Map.pdf",
      eeo: "10_EEO_Guidelines.pdf"
    };

    console.log(`📄 Processing ${splitPdfs.size} split PDFs...`);
    
    // Create ZIP using archiver
    const zip = archiver('zip', { zlib: { level: 9 } });
    const zipChunks: Buffer[] = [];
    
    // Collect ZIP data
    zip.on('data', (chunk: Buffer) => zipChunks.push(chunk));
    
    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      zip.on('end', () => resolve(Buffer.concat(zipChunks)));
      zip.on('error', reject);
    });
    
    // Add each split PDF to the ZIP and upload to storage
    for (const [type, pdfBuffer] of splitPdfs) {
      const fileName = sectionNames[type as keyof typeof sectionNames] || `${type}.pdf`;
      
      try {
        // Add to ZIP
        zip.append(pdfBuffer, { name: fileName });
        
        // Upload individual PDF to storage for potential individual downloads
        const storageFileName = `kits/${kit.id}/${type}_${Date.now()}.pdf`;
        const { error } = await supabase.storage
          .from('exports')
          .upload(storageFileName, pdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600'
          });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('exports')
            .getPublicUrl(storageFileName);
          assets.push({ type, url: publicUrl });
        }
      } catch (error) {
        console.error(`Error processing ${type}:`, error);
        throw new Error(`Failed to process ${type} PDF: ${error}`);
      }
    }

    // Add README with credit savings info
    const readmeContent = `Hiring Kit for ${kit.title || 'Untitled Kit'}
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
- EEO Guidelines

💰 Credits Used: 1 PDFShift credit (optimized from 9+ credits)
⚡ Generated using master PDF splitting for efficiency`;
    
    zip.append(readmeContent, { name: 'README.txt' });

    console.log("📦 Creating ZIP archive...");
    zip.finalize();
    const zipBuffer = await zipPromise;
    
    // Upload ZIP to storage
    const zipFileName = `kits/${kit.id}/complete_kit_${Date.now()}.zip`;
    const { error: zipError } = await supabase.storage
      .from('exports')
      .upload(zipFileName, zipBuffer, {
        contentType: 'application/zip',
        cacheControl: '3600'
      });

    if (zipError) {
      console.error('ZIP upload error:', zipError);
      throw new Error(`Failed to upload ZIP to storage: ${zipError.message}`);
    }

    const { data: { publicUrl: zipUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(zipFileName);

    console.log(`✅ ZIP generated successfully using 1 PDFShift credit (saved 8+ credits!)`);
    return {
      url: zipUrl,
      assets
    };
  } catch (error) {
    console.error('Optimized ZIP generation error:', error);
    throw error;
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
(Mock PDF - Optimization fallback) Tj
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
    // Create a proper ZIP file using archiver
    const zip = archiver('zip', { zlib: { level: 9 } });
    const zipChunks: Buffer[] = [];
    
    // Collect ZIP data
    zip.on('data', (chunk: Buffer) => zipChunks.push(chunk));
    
    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      zip.on('end', () => resolve(Buffer.concat(zipChunks)));
      zip.on('error', reject);
    });
    
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
      
      zip.append(mockPdfContent, { name: docName });
    });
    
    // Add a README
    const readmeContent = `Hiring Kit Export
Kit ID: ${kitId}
Generated: ${new Date().toISOString()}

This ZIP contains all documents for your hiring kit.
Each PDF is a separate file for easy sharing and printing.

💰 OPTIMIZED: Uses only 1 PDFShift credit instead of 9+

Documents included:
- Cover Page & Quick Start Guide
- Role Scorecard
- Job Post
- Interview Guides (3 stages)
- Work Sample Assignment
- Reference Check Script
- Process Map
- EEO Guidelines`;
    
    zip.append(readmeContent, { name: 'README.txt' });
    
    // Generate the ZIP file
    zip.finalize();
    const zipContent = await zipPromise;
    
    return new Response(zipContent as BodyInit, {
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
(Hiring Kit - OPTIMIZED PDF) Tj
0 -40 Td
/F1 16 Tf
(Kit ID: ${kitId}) Tj
0 -30 Td
(Document: ${filename}) Tj
0 -40 Td
/F1 12 Tf
(Generated with PDFShift + Local Splitting) Tj
0 -20 Td
(Credits Used: 1 (saved 8+)) Tj
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