import { PDFDocument } from 'pdf-lib';

export interface PDFSection {
  name: string;
  type: string;
  startPage: number;
  endPage: number;
}

/**
 * Split a master PDF into individual PDF sections
 * This allows us to generate one PDF with PDFShift and split it locally
 * Saves PDFShift credits: 1 credit instead of 9-10
 */
export async function splitPDF(
  masterPdfBuffer: Buffer,
  sections: PDFSection[]
): Promise<Map<string, Buffer>> {
  const masterPdf = await PDFDocument.load(masterPdfBuffer);
  const results = new Map<string, Buffer>();

  for (const section of sections) {
    try {
      // Create a new PDF document for this section
      const newPdf = await PDFDocument.create();
      
      // Copy the pages for this section
      const pages = await newPdf.copyPages(
        masterPdf,
        Array.from(
          { length: section.endPage - section.startPage + 1 },
          (_, i) => section.startPage - 1 + i // PDF pages are 0-indexed
        )
      );
      
      // Add the pages to the new document
      pages.forEach(page => newPdf.addPage(page));
      
      // Save the new PDF
      const pdfBytes = await newPdf.save();
      results.set(section.type, Buffer.from(pdfBytes));
    } catch (error) {
      console.error(`Error splitting section ${section.name}:`, error);
      // Continue with other sections even if one fails
    }
  }

  return results;
}

/**
 * Extract section metadata from a master PDF
 * Looks for special markers in the PDF to identify section boundaries
 */
export function detectSections(pageCount: number): PDFSection[] {
  // For now, we'll use a simple page-based approach
  // In production, we could embed metadata or use specific markers
  
  // Assuming standard structure:
  // Page 1: Cover
  // Page 2: Quick Start
  // Page 3-4: Scorecard
  // Page 5-6: Job Post
  // Page 7-9: Interview Stage 1
  // Page 10-12: Interview Stage 2
  // Page 13-15: Interview Stage 3
  // Page 16-17: Work Sample
  // Page 18-19: Reference Check
  // Page 20: Process Map
  // Page 21: EEO Guidelines
  
  // This is a simplified example - in reality, we'd make this dynamic
  // based on actual content or use page markers
  
  const sections: PDFSection[] = [
    { name: "1_Cover_and_Quick_Start.pdf", type: "cover", startPage: 1, endPage: 2 },
    { name: "2_Role_Scorecard.pdf", type: "scorecard", startPage: 3, endPage: 4 },
    { name: "3_Job_Post.pdf", type: "job_post", startPage: 5, endPage: 6 },
    { name: "4_Interview_Stage_1.pdf", type: "interview_stage1", startPage: 7, endPage: 9 },
    { name: "5_Interview_Stage_2.pdf", type: "interview_stage2", startPage: 10, endPage: 12 },
    { name: "6_Interview_Stage_3.pdf", type: "interview_stage3", startPage: 13, endPage: 15 },
    { name: "7_Work_Sample.pdf", type: "work_sample", startPage: 16, endPage: 17 },
    { name: "8_Reference_Check.pdf", type: "reference_check", startPage: 18, endPage: 19 },
    { name: "9_Process_Map.pdf", type: "process_map", startPage: 20, endPage: 20 },
    { name: "10_EEO_Guidelines.pdf", type: "eeo", startPage: 21, endPage: 21 }
  ];
  
  // Adjust sections based on actual page count
  // This ensures we don't try to extract pages that don't exist
  return sections.filter(section => section.startPage <= pageCount);
}

/**
 * Alternative approach: Generate a master PDF with clear section markers
 * Then split based on those markers rather than fixed page numbers
 */
export async function smartSplitPDF(
  masterPdfBuffer: Buffer
): Promise<Map<string, Buffer>> {
  const masterPdf = await PDFDocument.load(masterPdfBuffer);
  const pageCount = masterPdf.getPageCount();
  const results = new Map<string, Buffer>();
  
  // Track current section
  let currentSection: string | null = null;
  let sectionPages: number[] = [];
  const sectionMap = new Map<string, number[]>();
  
  // Scan through pages looking for section markers
  // In a real implementation, we'd look for specific text markers
  // For now, we'll use the simple page-based approach
  const sections = detectSections(pageCount);
  
  for (const section of sections) {
    try {
      const newPdf = await PDFDocument.create();
      
      // Validate page range
      const startPage = Math.max(0, section.startPage - 1);
      const endPage = Math.min(pageCount - 1, section.endPage - 1);
      
      if (startPage <= endPage) {
        const pageIndices = Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage + i
        );
        
        const pages = await newPdf.copyPages(masterPdf, pageIndices);
        pages.forEach(page => newPdf.addPage(page));
        
        const pdfBytes = await newPdf.save();
        results.set(section.type, Buffer.from(pdfBytes));
      }
    } catch (error) {
      console.error(`Error processing section ${section.name}:`, error);
    }
  }
  
  return results;
}