# CLAUDE.md

This file provides **explicit guidance to Claude Code (claude.ai/code)** when working in this repository. The project is a **Node.js/TypeScript SaaS** built on Next.js. Please follow these conventions to keep changes safe, typed, auditable, and production‑ready.

---

## Project Overview

**Hiring Kit in a Day** — A Next.js SaaS application that generates comprehensive hiring kits from role intake information. The app uses AI to create bias‑aware hiring materials including scorecards, job posts, interview packs with rubrics, work samples, reference scripts, process maps, and EEO guardrails.

---

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **AI**: OpenAI API for content generation
- **Payments**: Stripe Checkout & Webhooks
- **Email**: Resend for transactional emails
- **PDF Generation**: Server‑side HTML → PDF rendering
- **State Management**: Zustand
- **UI Components**: Radix UI primitives with custom styling
- **Lint/Format**: ESLint + Prettier (keep defaults unless instructed)

> **Claude**: Do **not** change major versions or add libraries without an explicit task asking you to.

---

## How Claude Code Should Work in This Repo

1. **Prefer diffs.** When editing multiple files, output a single `git diff` (unified) grouped by file. Avoid prose‑only descriptions.
2. **Small, typed steps.** Introduce types first, then implementations. Avoid `any`; use discriminated unions and enums where helpful.
3. **Respect RLS.** Never bypass Supabase Row Level Security. Enforce auth and ownership checks in server routes.
4. **Validate all inputs.** Use Zod (or existing validation utilities) at API boundaries. Parse → transform → narrow types.
5. **Keep server logic on the server.** Only mark a component `use client` if it truly requires client‑side features.
6. **No schema changes without migration.** If tables/columns are added or modified, create a migration and update types.
7. **Idempotent webhooks.** Stripe and other webhooks must be verified and idempotent (same event handled once).
8. **Environment safety.** Do not invent new env vars silently. If adding one, update `.env.example`, docs, and code paths.
9. **Conventional commits.** Use `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` etc., with a concise scope.
10. **Keep secrets secret.** Never log API keys or tokens. Use structured logs without sensitive values.

---

## Common Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack at http://localhost:3000

# Build & Production
npm run build        # Create production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint checks

# Testing
# No test framework configured yet - check package.json before assuming
```

---

## 🚨 PRODUCTION DEPLOYMENT VERIFICATION (CRITICAL)

**Claude Code MUST follow this checklist before declaring production readiness:**

### ✅ Complete Build Verification
```bash
# Run FULL build process - all phases must pass
npm run build 2>&1 | tee build.log

# Verify success with:
echo "Build Status: $(grep -q 'Failed to compile' build.log && echo 'FAILED' || echo 'PASSED')"

# Check for compilation errors (not just warnings):
grep -E "Type error|Failed to compile" build.log
```

### ✅ TypeScript Strict Checking
```bash
# Run TypeScript compiler directly for comprehensive checking
npx tsc --noEmit --strict

# Check exit code (0 = success, >0 = errors)
echo "TypeScript Status: $?"
```

### ❌ NEVER Declare Production Ready If:
- Any "Failed to compile" messages appear
- Any "Type error:" messages exist  
- Build process exits with non-zero code
- Only saw webpack compilation but not TypeScript checking phase

### 🎯 Issue Classification
**✅ Acceptable (Warnings - Non-blocking):**
- ESLint warnings (`Warning: 'variable' is assigned but never used`)
- Webpack performance warnings
- Supabase Edge Runtime warnings (known Next.js issue)

**❌ Blocking (Errors - Must Fix):**
- TypeScript compilation errors (`Type error:`)
- Build process failures (`Failed to compile`)
- Missing dependencies or import errors

### 📋 Deployment Readiness Checklist
Before declaring production readiness:
- [ ] `npm run build` completes successfully without "Failed to compile"
- [ ] No "Type error:" messages in build output
- [ ] All TypeScript compilation errors resolved
- [ ] Core business functionality tested and working
- [ ] Build artifacts successfully generated in `.next/`

**Confidence Assessment Rules:**
- 🔴 **0-4/10**: Build failing, blocking errors present
- 🟡 **5-7/10**: Build passes but has warnings/technical debt  
- 🟢 **8-10/10**: Clean build, comprehensive testing, production ready

> **Claude**: If you introduce tests, prefer **Vitest** for unit tests and **@testing-library/react** for components. Add minimal config and update `package.json` scripts.

---

## Architecture

### Directory Structure
- `/app` — Next.js App Router pages and API routes
  - `/api` — Route handlers for kits, checkout, webhooks
  - `/admin` — Admin interface for QA and order management
  - `/kit` — Kit creation and editing interface
- `/components` — React components
  - `/ui` — Base UI components (button, card, input, etc.)
  - `/kit` — Kit‑specific components
  - `/layout` — Layout components
- `/lib` — Core utilities and integrations
  - `/ai` — OpenAI integration for content generation
  - `/pdf` — PDF generation utilities
  - `/stripe` — Stripe payment integration
  - `/supabase` — Database client and utilities
- `/types` — TypeScript type definitions (main data models in `index.ts`)

### Next.js Conventions (Claude must follow)
- Prefer **Route Handlers** under `/app/api/**/route.ts` for server endpoints.
- Default to **Node runtime** (`export const runtime = 'nodejs'`) for PDF/Stripe/Resend or anything that needs Node APIs.
- Use **caching pragmas**: `export const dynamic = 'force-dynamic'` for personalized data; leverage `revalidate` when safe.
- Keep server actions small and typed; never access secrets from client components.

### Key Data Flow
1. **Intake** → User fills role details → stored as `IntakeData`
2. **Generation** → AI processes intake → creates `KitArtifacts` JSON
3. **Preview** → Gated preview (watermarked, truncated content)
4. **Payment** → Stripe Checkout → webhook updates order status
5. **Export** → Generate PDF (combined or multi‑file ZIP)
6. **Delivery** → Email with download link

### Database Schema (Supabase)
Main tables: `orgs`, `users`, `plans`, `orders`, `kits`, `exports`, `export_assets`, `audit_logs`

Key relationships:
- Kits belong to users and optionally orgs
- Orders track payment status for kits
- Exports contain generated PDF URLs

> **Claude**: Any schema change requires (a) migration SQL, (b) updated types, (c) RLS policy review, (d) seed/update scripts, and (e) endpoint updates. After all requirements are met, execution of said db changes will be done via MCP Access to the DB.

### API Endpoints Pattern
- `POST /api/kits` — Create draft kit
- `POST /api/kits/:id/generate` — AI generation
- `PATCH /api/kits/:id` — Update edits
- `POST /api/checkout` — Initialize Stripe session
- `POST /api/stripe/webhook` — Handle payment confirmation
- `POST /api/kits/:id/export` — Generate PDF export

**Endpoint Checklist (Claude)**
- [ ] Input schema with Zod (`safeParse`)
- [ ] Auth: user/org ownership
- [ ] DB calls typed; no stringly‑typed fields
- [ ] Errors: consistent shape `{ error: { code, message } }`
- [ ] Logs: non‑sensitive context (ids, counts, durations)
- [ ] Unit test stub if adding complex logic

---

## Environment Variables

Create `.env.local` and keep it out of VCS. Required keys:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **OpenAI**: `OPENAI_API_KEY`
- **Resend**: `RESEND_API_KEY`
- **App**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`
- **Admin**: `ADMIN_EMAILS` (comma‑separated)

> **Claude**: When adding a new env var, also update `.env.example` and reference it in this section. Do not hardcode defaults.

---

## AI Generation Guidelines (Claude‑optimized)

- Produce **structured JSON** that conforms to strict TypeScript types.
- Keep **temperature low** for determinism.
- Include **bias‑reduction** instructions in prompts (provided in `/lib/ai`).
- Validate outputs against the `KitArtifacts` type. Reject or repair invalid JSON safely.
- Enforce **per‑section token budgets** to maintain consistent lengths.
- Prefer **Zod schemas** with `z.infer` to tie runtime validation to compile‑time types.

**Pattern**

```ts
// /lib/ai/schemas.ts
import { z } from "zod";

export const KitArtifactsSchema = z.object({
  jobPost: z.string().min(50),
  scorecard: z.object({
    competencies: z.array(z.object({
      name: z.string(),
      indicators: z.array(z.string().min(3)).min(3)
    })).min(5)
  }),
  // ...
});

export type KitArtifacts = z.infer<typeof KitArtifactsSchema>;
```

---

## Preview Gating Strategy

- First page only of each artifact
- Truncated bullets (10–12 words)
- `PREVIEW` watermark
- Disabled text selection
- Rubrics show only "**3 = Meets**" level
- Copy attempts trigger paywall modal

> **Claude**: Keep gating logic server‑enforced where possible to avoid client bypass.

---

## PDF Generation

- Server‑side HTML → PDF templates
- Use placeholder tokens (e.g., `{{org.name}}`, `{{role.title}}`)
- Brand profiles control colors and fonts
- Consistent headers/footers and page breaks
- Two export options: combined PDF or ZIP with separate files
- For long jobs, ensure route is **Node runtime** and consider streaming/progress events for UX (if implemented).

---

## SaaS‑Specific Concerns (Claude must enforce)

- **Plans & entitlements**: Check current plan before generation/export beyond preview.
- **Usage limits**: (If implemented) enforce per‑period quotas server‑side.
- **RBAC**: Admin routes must verify admin emails/roles; never rely on client flags.
- **Audit logs**: Log key state transitions (kit created, generated, exported, paid).
- **Rate limiting**: Apply to public APIs and auth‑free endpoints if introduced.
- **Idempotency**: Use idempotency keys for Stripe‑adjacent operations if needed.

---

## Security & Compliance Checklist

- [ ] Verify Stripe signatures for `POST /api/stripe/webhook`
- [ ] Enforce org/user ownership on all kit/order/export reads & writes
- [ ] Avoid leaking PII or secrets in logs
- [ ] Validate and sanitize HTML used for PDF templates
- [ ] Respect RLS for Supabase; avoid service role key in client code
- [ ] Use `POST` for mutations; avoid CSRF risks in public routes
- [ ] Handle failure paths with safe fallbacks and user‑friendly messages

---

## Development Priorities

From PRD/SRD focus areas:
1. Core intake and preview functionality
2. AI generation with **Express Mode** (minimal input → full kit)
3. Payment integration and order management
4. PDF export with proper formatting
5. Admin interface for QA workflow
6. Email notifications

---

## Type Safety

Major data structures are in `/types/index.ts`. Key types:
- `IntakeData` — User input structure
- `KitArtifacts` — Generated content structure
- `Kit`, `Order`, `User`, `Organization` — Database models
- Enums: `KitStatus`, `OrderStatus`, `ExportKind`

> **Claude**: Keep types the single source of truth. If you change a type, fix all compile errors before continuing.

---

## Optional Enhancements Claude May Propose (but not implement without a task)

- Add **Vitest** and minimal unit tests for critical utilities
- Introduce **pino** for structured logging (server only)
- Add **feature flags** for gradual rollouts
- Introduce **background job queue** for long‑running PDF/AI tasks
- Add **basic rate limiting** middleware for public endpoints

When proposing, include scope, migration impact, and a short implementation plan.

---

## Guardrails — Things Not To Do

- ❌ No breaking schema changes without migration + docs
- ❌ No new third‑party services without approval
- ❌ No client‑side access to secrets or service role keys
- ❌ No silent changes to env vars or config defaults
- ❌ No refactors that mix unrelated concerns in a single PR

---

## Handy Prompts (Use inside Claude Code)

- “**Search the repo and show a diff** to add Zod validation to `/app/api/kits/[id]/generate/route.ts` and wire it to `KitArtifactsSchema`. Keep edits minimal.”
- “**Propose a migration** to add `plan` limits for exports. Provide SQL and TypeScript changes as a single diff, with RLS notes.”
- “**Harden the Stripe webhook** for idempotency and logging. Output a unified diff and explain any new types or helpers you introduce.”

---

**Thank you!** These conventions help us maintain a safe, typed, and auditable Next.js/TypeScript SaaS.
