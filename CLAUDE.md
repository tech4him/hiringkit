# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hiring Kit in a Day - A Next.js SaaS application that generates comprehensive hiring kits from role intake information. The app uses AI to create bias-aware hiring materials including scorecards, job posts, interview packs with rubrics, work samples, reference scripts, process maps, and EEO guardrails.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **AI**: OpenAI API for content generation
- **Payments**: Stripe Checkout & Webhooks
- **Email**: Resend for transactional emails
- **PDF Generation**: Server-side HTML to PDF rendering
- **State Management**: Zustand
- **UI Components**: Radix UI primitives with custom styling

## Common Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack at localhost:3000

# Build & Production
npm run build        # Create production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint checks

# Testing
# No test framework configured yet - check package.json before assuming
```

## Architecture

### Directory Structure
- `/app` - Next.js App Router pages and API routes
  - `/api` - API endpoints for kits, checkout, webhooks
  - `/admin` - Admin interface for QA and order management
  - `/kit` - Kit creation and editing interface
- `/components` - React components
  - `/ui` - Base UI components (button, card, input, etc.)
  - `/kit` - Kit-specific components
  - `/layout` - Layout components
- `/lib` - Core utilities and integrations
  - `/ai` - OpenAI integration for content generation
  - `/pdf` - PDF generation utilities
  - `/stripe` - Stripe payment integration
  - `/supabase` - Database client and utilities
- `/types` - TypeScript type definitions (main data models in `index.ts`)

### Key Data Flow
1. **Intake** → User fills role details → stored as `IntakeData`
2. **Generation** → AI processes intake → creates `KitArtifacts` JSON
3. **Preview** → Gated preview (watermarked, truncated content)
4. **Payment** → Stripe Checkout → webhook updates order status
5. **Export** → Generate PDF (combined or multi-file ZIP)
6. **Delivery** → Email with download link

### Database Schema (Supabase)
Main tables: `orgs`, `users`, `plans`, `orders`, `kits`, `exports`, `export_assets`, `audit_logs`

Key relationships:
- Kits belong to users and optionally orgs
- Orders track payment status for kits
- Exports contain generated PDF URLs

### API Endpoints Pattern
- `POST /api/kits` - Create draft kit
- `POST /api/kits/:id/generate` - AI generation
- `PATCH /api/kits/:id` - Update edits
- `POST /api/checkout` - Initialize Stripe session
- `POST /api/stripe/webhook` - Handle payment confirmation
- `POST /api/kits/:id/export` - Generate PDF export

## Environment Variables

Required environment variables (create `.env.local`):
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- OpenAI: `OPENAI_API_KEY`
- Resend: `RESEND_API_KEY`
- App: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`
- Admin: `ADMIN_EMAILS` (comma-separated)

## AI Generation Guidelines

When implementing AI generation:
- Use structured JSON outputs with strict schemas
- Keep temperature low for consistency
- Include bias-reduction instructions in prompts
- Validate output against `KitArtifacts` type structure
- Each artifact section has token limits to control length

## Preview Gating Strategy

The preview system shows limited content to encourage conversion:
- First page only of each artifact
- Truncated bullets (10-12 words)
- PREVIEW watermark
- Disabled text selection
- Rubrics show only "3 = Meets" level
- Copy attempts trigger paywall modal

## PDF Generation

Server-side HTML to PDF rendering approach:
- Templates use placeholder tokens (`{{org.name}}`, `{{role.title}}`)
- Brand profiles control colors and fonts
- Consistent headers/footers with page breaks
- Two export options: combined PDF or ZIP with separate files

## Development Priorities

Based on PRD/SRD focus areas:
1. Core intake and preview functionality
2. AI generation with Express Mode (minimal input → full kit)
3. Payment integration and order management
4. PDF export with proper formatting
5. Admin interface for QA workflow
6. Email notifications

## Type Safety

All major data structures are defined in `/types/index.ts`. Key types:
- `IntakeData` - User input structure
- `KitArtifacts` - Generated content structure
- `Kit`, `Order`, `User`, `Organization` - Database models
- Enums for statuses: `KitStatus`, `OrderStatus`, `ExportKind`