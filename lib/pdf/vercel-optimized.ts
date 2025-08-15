// Vercel-optimized PDF generation with chunked processing
import type { Kit, KitArtifacts } from "@/types";
import { generateKitPDF } from "./pdfshift";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Vercel-optimized export generation
 * Handles Vercel's 10MB response limit and execution timeouts
 */
export async function generateExportForVercel(
  kit: Kit, 
  exportType: "combined_pdf" | "zip"
): Promise<{ 
  success: boolean; 
  url?: string; 
  jobId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const artifacts = kit.artifacts_json || kit.edited_json;
    
    if (!artifacts) {
      return {
        success: false,
        error: "No kit content found"
      };
    }

    // Check cache first
    const cached = await checkCachedExport(kit.id, exportType);
    if (cached) {
      return {
        success: true,
        url: cached.url,
        message: "Retrieved from cache"
      };
    }

    // For Vercel: Use async generation pattern
    if (exportType === "zip") {
      // ZIP files are large - process asynchronously
      const jobId = await scheduleAsyncGeneration(kit, exportType);
      return {
        success: true,
        jobId,
        message: "Generation started. Check back in 30-60 seconds."
      };
    } else {
      // Combined PDFs are smaller - try direct generation
      try {
        const url = await generateCombinedPDFVercel(kit, artifacts);
        return {
          success: true,
          url,
          message: "Generated successfully"
        };
      } catch {
        // If direct generation fails, fall back to async
        const jobId = await scheduleAsyncGeneration(kit, exportType);
        return {
          success: true,
          jobId,
          message: "Large file detected. Processing asynchronously."
        };
      }
    }

  } catch (error) {
    console.error("Vercel export error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Schedule async generation for large files
 * In production, this would use a queue system like Vercel's background functions
 * or external services like Inngest, QStash, or AWS SQS
 */
async function scheduleAsyncGeneration(kit: Kit, exportType: string): Promise<string> {
  const jobId = `job_${kit.id}_${exportType}_${Date.now()}`;
  
  // Store job status in database
  const supabase = createServerClient();
  await supabase
    .from('export_jobs')
    .insert({
      id: jobId,
      kit_id: kit.id,
      export_type: exportType,
      status: 'queued',
      created_at: new Date().toISOString()
    });

  // In a real implementation, you'd:
  // 1. Add job to a queue (Redis, AWS SQS, etc.)
  // 2. Have a background worker process the job
  // 3. Update the job status when complete
  
  // For MVP, we'll simulate with a delayed process
  // This should be replaced with proper queue infrastructure
  setTimeout(async () => {
    try {
      await processAsyncJob(jobId, kit, exportType);
    } catch (error) {
      console.error(`Async job ${jobId} failed:`, error);
      await updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, 1000); // Start processing after 1 second

  return jobId;
}

/**
 * Process async generation job
 * This would typically run in a separate worker/serverless function
 */
async function processAsyncJob(jobId: string, kit: Kit, exportType: string) {
  const supabase = createServerClient();
  
  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing');

    const artifacts = kit.artifacts_json || kit.edited_json;
    if (!artifacts) {
      throw new Error('Kit artifacts not found');
    }
    let resultUrl: string;

    if (exportType === "combined_pdf") {
      resultUrl = await generateCombinedPDFVercel(kit, artifacts);
    } else {
      // For ZIP, we need the full optimized generation
      const { generatePDF } = await import("./generator-optimized");
      const result = await generatePDF(kit, "zip");
      if (!result.success || !result.url) {
        throw new Error(result.error || "ZIP generation failed");
      }
      resultUrl = result.url;
    }

    // Update job with result
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        result_url: resultUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Async job ${jobId} completed: ${resultUrl}`);

  } catch (error) {
    console.error(`❌ Async job ${jobId} failed:`, error);
    await updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function updateJobStatus(jobId: string, status: string, error?: string) {
  const supabase = createServerClient();
  const updates: { status: string; error_message?: string; completed_at?: string; updated_at?: string } = { 
    status,
    updated_at: new Date().toISOString()
  };
  
  if (error) {
    updates.error_message = error;
  }
  
  await supabase
    .from('export_jobs')
    .update(updates)
    .eq('id', jobId);
}

/**
 * Vercel-optimized combined PDF generation
 * Reduces memory usage and handles timeouts
 */
async function generateCombinedPDFVercel(kit: Kit, artifacts: KitArtifacts): Promise<string> {
  const supabase = createServerClient();
  
  // Check if already exists
  const existing = await checkCachedExport(kit.id, "combined_pdf");
  if (existing) {
    return existing.url;
  }

  console.log("🚀 Generating PDF with PDFShift...");
  
  // Generate with timeout protection
  const pdfBuffer = await Promise.race([
    generateKitPDF(kit, artifacts),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("PDF generation timeout")), 25000) // 25s timeout
    )
  ]);

  console.log(`📦 PDF generated, size: ${Math.round(pdfBuffer.length / 1024)}KB`);

  // Check size limit (Vercel has 10MB response limit)
  if (pdfBuffer.length > 8 * 1024 * 1024) { // 8MB threshold
    console.warn("⚠️ PDF size exceeds safe limit for Vercel, using async processing");
    throw new Error("PDF too large for direct response");
  }

  // Upload to storage
  const fileName = `kits/${kit.id}/combined_${Date.now()}.pdf`;
  const { error } = await supabase.storage
    .from('exports')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '3600'
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error("Failed to store PDF");
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('exports')
    .getPublicUrl(fileName);

  // Save export record
  await supabase
    .from("exports")
    .insert({
      kit_id: kit.id,
      kind: "combined_pdf",
      url: publicUrl
    });

  console.log(`✅ PDF ready: ${publicUrl}`);
  return publicUrl;
}

/**
 * Check for cached exports (same as main generator)
 */
async function checkCachedExport(kitId: string, exportType: string): Promise<{ url: string; assets?: Array<{ type: string; url: string }> } | null> {
  try {
    const supabase = createServerClient();
    
    const { data: exports, error } = await supabase
      .from('exports')
      .select('url, created_at')
      .eq('kit_id', kitId)
      .eq('kind', exportType)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !exports || exports.length === 0) {
      return null;
    }

    return { url: exports[0].url };
  } catch (error) {
    console.error('Cache check error:', error);
    return null;
  }
}

/**
 * Check async job status
 */
export async function checkJobStatus(jobId: string): Promise<{
  status: 'queued' | 'processing' | 'completed' | 'failed';
  url?: string;
  error?: string;
  progress?: number;
}> {
  const supabase = createServerClient();
  
  const { data: job, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return { status: 'failed', error: 'Job not found' };
  }

  return {
    status: job.status,
    url: job.result_url,
    error: job.error_message,
    progress: job.progress || 0
  };
}