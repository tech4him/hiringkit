# PDF Generation Control Guide

## Overview

This application supports both **real PDF generation** (using PDFShift API) and **mock PDF generation** (for cost savings during development).

## Environment Control

### Production Mode
- **Always uses real PDF generation** with PDFShift API
- Requires `PDFSHIFT_API_KEY` to be configured

### Development Mode
- **Default**: Uses mock PDFs to save API costs
- **With `ENABLE_REAL_PDF_GENERATION=true`**: Uses real PDFs even in development

## Configuration

### Environment Variables

```bash
# Required for real PDF generation
PDFSHIFT_API_KEY=your_pdfshift_api_key

# Optional: Enable real PDF generation in development
ENABLE_REAL_PDF_GENERATION=true
```

### API Costs

**Real PDF Generation:**
- **Combined PDF**: 1 PDFShift credit
- **ZIP Export**: 1 PDFShift credit (optimized with master PDF splitting)
- **Mock PDFs**: 0 credits

## Current Status

✅ **Real PDF Generation is ENABLED**

The system is configured to generate real PDFs using:
- PDFShift API for HTML-to-PDF conversion
- Master PDF generation + local splitting for ZIP exports
- Supabase storage for PDF hosting
- Full HTML template rendering with real kit data

## Testing

To test PDF generation:

1. **Create a kit** through the application
2. **Purchase the kit** (use Stripe test card: `4242 4242 4242 4242`)
3. **Export the kit** from the success page
4. **Download the generated PDF/ZIP** 

## API Endpoints

- `POST /api/kits/[id]/export` - Generate PDF exports
- `GET /api/jobs/[jobId]/status` - Check export job status (for Vercel async processing)

## File Structure

```
lib/pdf/
├── pdfshift.ts          # PDFShift API integration
├── generator-optimized.ts # Main PDF generation logic
├── splitter.ts          # PDF splitting for ZIP exports
└── vercel-optimized.ts  # Async processing for Vercel
```

## Switching Modes

### Enable Real PDFs in Development
```bash
echo "ENABLE_REAL_PDF_GENERATION=true" >> .env.local
```

### Disable Real PDFs (Use Mocks)
```bash
# Remove or comment out the line in .env.local
# ENABLE_REAL_PDF_GENERATION=true
```

## Troubleshooting

### Common Issues

1. **"PDFShift API key not configured"**
   - Add `PDFSHIFT_API_KEY` to your `.env.local`

2. **PDF generation fails with storage errors**
   - Check Supabase configuration and storage bucket permissions

3. **Getting mock PDFs instead of real ones**
   - Verify `ENABLE_REAL_PDF_GENERATION=true` is in `.env.local`
   - Check that `NODE_ENV` is set correctly

### Debug Logs

The system uses Winston logging to track PDF generation:

```json
{
  "ts": "2025-08-15T15:45:00.000Z",
  "level": "info", 
  "msg": "PDF generation started",
  "mode": "real_pdf",
  "credits_used": 1
}
```

## Cost Optimization

The system is optimized to minimize PDFShift credits:

- **Before**: 9+ credits per ZIP export (1 per document)
- **After**: 1 credit per ZIP export (master PDF + local splitting)
- **Savings**: 89% credit reduction for ZIP exports