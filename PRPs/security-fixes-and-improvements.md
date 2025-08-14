name: "Security Fixes and Code Improvements - v0.2"
description: |

## Purpose
Comprehensive implementation of security fixes, bug fixes, and code improvements identified in code review. This PRP provides complete context for an AI agent to implement authentication, validation, rate limiting, logging, and PDF generation fixes in a single pass.

## Core Principles
1. **Security First**: Implement authentication and authorization before all else
2. **Type Safety**: Use Zod for runtime validation matching TypeScript types
3. **Progressive Enhancement**: Start with critical security, then improvements
4. **Existing Patterns**: Follow Next.js 15 App Router conventions
5. **Global rules**: Follow all rules in CLAUDE.md

---

## Goal
Transform the codebase from an unauthenticated MVP to a secure, production-ready SaaS application with proper authentication, validation, rate limiting, logging, and reliable PDF generation.

## Why
- **Security**: Protect admin routes, user data, and prevent abuse
- **Reliability**: Ensure idempotent webhooks and validated inputs
- **Maintainability**: Structured logging and consistent validation patterns
- **User Trust**: Proper authentication and authorization per organization

## What
Implement comprehensive security and code quality improvements across the entire API surface.

### Success Criteria
- [x] All admin routes require authentication
- [x] All API inputs validated with Zod schemas
- [x] Rate limiting on all public endpoints
- [x] Stripe webhooks are idempotent
- [x] Environment variables validated at startup
- [x] Structured logging replaces console.log
- [x] PDF generation uses consistent strategy
- [x] TypeScript errors fixed

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://supabase.com/docs/guides/auth/server-side/nextjs
  why: Server-side auth with Next.js App Router, createServerClient pattern
  
- url: https://supabase.com/docs/guides/auth/row-level-security
  why: RLS policies for multi-tenant organizations
  
- url: https://zod.dev/?id=basic-usage
  why: Schema validation, parse vs safeParse, error handling
  
- url: https://github.com/colinhacks/zod#error-handling
  why: Zod error formatting for API responses
  
- url: https://nextjs.org/docs/app/building-your-application/routing/middleware
  why: Next.js middleware for rate limiting and auth
  
- url: https://docs.stripe.com/webhooks/best-practices#handle-duplicate-events
  why: Idempotency for Stripe webhooks
  
- url: https://getpino.io/#/docs/get-started
  why: Structured logging with pino
  
- file: /home/lucast/projects/hiringkit/types/index.ts
  why: Existing TypeScript types to create Zod schemas from
  
- file: /home/lucast/projects/hiringkit/lib/supabase/client.ts
  why: Current Supabase client setup to enhance
  
- file: /home/lucast/projects/hiringkit/app/api/stripe/webhook/route.ts
  why: Current webhook implementation to add idempotency
```

### Current Codebase Structure
```bash
hiringkit/
├── app/
│   ├── api/
│   │   ├── admin/          # NEEDS AUTH
│   │   │   ├── orders/
│   │   │   └── kits/
│   │   ├── checkout/       # NEEDS VALIDATION
│   │   ├── kits/          # NEEDS VALIDATION
│   │   └── stripe/        # NEEDS IDEMPOTENCY
│   └── (pages)/
├── lib/
│   ├── supabase/         # NEEDS AUTH HELPERS
│   ├── pdf/              # NEEDS CONSOLIDATION
│   └── ai/               # NEEDS ERROR HANDLING
├── types/                # SOURCE FOR ZOD SCHEMAS
└── middleware.ts         # TO BE CREATED
```

### Desired Codebase Structure
```bash
hiringkit/
├── app/
│   ├── api/
│   │   ├── admin/          # Protected routes
│   │   ├── checkout/       # Validated inputs
│   │   └── stripe/         # Idempotent webhooks
├── lib/
│   ├── auth/              # NEW - Auth utilities
│   │   ├── middleware.ts   # Auth checking
│   │   └── helpers.ts      # User/org helpers
│   ├── validation/        # NEW - Zod schemas
│   │   ├── schemas.ts      # All validation schemas
│   │   └── helpers.ts      # Validation utilities
│   ├── logger/            # NEW - Structured logging
│   │   └── index.ts        # Pino setup
│   ├── config/            # NEW - Env validation
│   │   └── env.ts          # Validated env vars
│   └── pdf/               # Consolidated PDF
│       └── generator.ts    # Single strategy
├── middleware.ts          # NEW - Rate limiting & auth
└── types/
    └── supabase.ts        # NEW - Generated DB types
```

### Known Gotchas & Critical Information
```typescript
// CRITICAL: Supabase Auth in Next.js 15 App Router
// Must use cookies() from next/headers for auth
// Service role bypasses RLS - use carefully

// CRITICAL: Next.js middleware runs on Edge Runtime
// Cannot use Node.js specific modules in middleware.ts
// Rate limiting must use Edge-compatible solutions

// CRITICAL: Zod schemas must match TypeScript types exactly
// Use z.infer<typeof schema> for type inference
// safeParse returns { success: boolean, data?: T, error?: ZodError }

// CRITICAL: Stripe webhooks
// Event IDs are unique and can be used for idempotency
// Store processed event IDs in database

// CRITICAL: PDF Generation
// PDFShift for production (uses API key)
// Local Playwright for development (no API calls)
// Check process.env.NODE_ENV to switch strategies
```

## Implementation Blueprint

### Data Models and Validation Schemas

Create Zod schemas matching existing TypeScript types:
```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

// Match existing IntakeData interface
export const IntakeDataSchema = z.object({
  role_title: z.string().min(1).max(100),
  organization: z.string().min(1).max(100),
  mission: z.string().min(10).max(1000),
  // ... complete schema
});

// Kit generation request
export const GenerateKitSchema = z.object({
  express_mode: z.boolean().optional(),
  intake_data: IntakeDataSchema.partial() // For express mode
});

// Stripe webhook event tracking
export const ProcessedEventSchema = z.object({
  event_id: z.string(),
  processed_at: z.date(),
});
```

### List of Tasks (In Order)

```yaml
Task 1: Install Required Dependencies
COMMAND: npm install zod pino pino-pretty @supabase/auth-helpers-nextjs dotenv-safe stripe-event-types
VALIDATE: Check package.json includes all packages

Task 2: Create Environment Validation
CREATE lib/config/env.ts:
  - PATTERN: Use dotenv-safe for validation
  - REQUIRED_VARS: All from .env.example
  - THROW on missing required vars at startup
  - Export typed env object

Task 3: Create Logger Setup
CREATE lib/logger/index.ts:
  - USE: pino with pretty print in dev
  - LEVELS: error, warn, info, debug
  - CONTEXT: Include request ID, user ID when available
  - PATTERN: Export singleton logger instance

Task 4: Create Validation Schemas
CREATE lib/validation/schemas.ts:
  - MIRROR: All interfaces from types/index.ts
  - ADD: Request/response schemas for each endpoint
  - HELPER: createApiResponse wrapper for consistent errors

Task 5: Create Auth Utilities
CREATE lib/auth/middleware.ts:
  - PATTERN: createServerClient with cookies
  - CHECK: User session from Supabase Auth
  - VERIFY: User belongs to organization for org routes
  - ADMIN: Check ADMIN_EMAILS env var

CREATE lib/auth/helpers.ts:
  - getCurrentUser(): Get authenticated user
  - requireAuth(): Throw if not authenticated
  - requireAdmin(): Throw if not admin
  - requireOrgAccess(): Verify org membership

Task 6: Update Supabase Client
MODIFY lib/supabase/client.ts:
  - ADD: createAuthenticatedClient() using cookies
  - DEPRECATE: Direct service role usage
  - ADD: Type-safe client with generated types

Task 7: Create Next.js Middleware
CREATE middleware.ts:
  - RATE_LIMIT: Use in-memory store for Edge runtime
  - PATHS: Match /api/* routes
  - EXEMPT: Public routes like /api/stripe/webhook
  - LOG: Rate limit hits with logger

Task 8: Secure Admin Routes
MODIFY app/api/admin/orders/route.ts:
  - ADD: requireAdmin() check at start
  - VALIDATE: Query params with Zod
  - LOG: Admin actions with context
  - RESPONSE: Consistent error format

MODIFY app/api/admin/kits/[id]/approve/route.ts:
  - SAME pattern as orders route
  - ADD: Audit log for approval

Task 9: Add Input Validation to All Routes
MODIFY app/api/kits/generate/route.ts:
  - PARSE: Request body with GenerateKitSchema
  - AUTH: Get current user (allow anonymous for MVP)
  - LOG: Generation requests and errors
  - RESPONSE: Zod error formatting

MODIFY app/api/checkout/route.ts:
  - VALIDATE: CheckoutRequestSchema
  - AUTH: Optional user (guest checkout)
  - REMOVE: Hardcoded org ID
  - USE: User's org or create guest org

Task 10: Implement Webhook Idempotency
MODIFY app/api/stripe/webhook/route.ts:
  - CHECK: Event ID in database before processing
  - STORE: Event ID after successful processing
  - TRANSACTION: Use database transaction for atomicity
  - LOG: All webhook events with metadata

CREATE migrations/add_webhook_events_table.sql:
  - TABLE: webhook_events (event_id PRIMARY KEY, processed_at)
  - INDEX: On event_id for fast lookups

Task 11: Fix PDF Generation Issues
MODIFY lib/pdf/generator.ts:
  - FIX: interview_stages access (it's interview.stage1, stage2, stage3)
  - CHECK: All optional properties before access
  - STRATEGY: Use PDFShift in production, mock in development
  - REMOVE: Duplicate generator files

MODIFY lib/pdf/pdfshift.ts:
  - FIX: Type errors with proper null checks
  - ADD: Retry logic for API failures
  - LOG: PDF generation metrics

Task 12: Replace Console Logging
GLOBAL REPLACE:
  - FIND: console.log, console.error
  - REPLACE: logger.info, logger.error
  - ADD: Structured context objects
  - KEEP: Stack traces for errors

Task 13: Add Email Notifications
MODIFY app/api/stripe/webhook/route.ts:
  - IMPLEMENT: Send confirmation email on payment
  - USE: Resend API with templates
  - LOG: Email send success/failure

MODIFY app/api/admin/kits/[id]/approve/route.ts:
  - IMPLEMENT: Send approval notification
  - INCLUDE: Download link in email
```

### Integration Points Per Task

```yaml
# Task 2 - Environment Validation
STARTUP:
  - Call validateEnv() in app/layout.tsx
  - Fail fast if missing required vars

# Task 6 - Supabase Auth
DATABASE:
  - Enable RLS on all tables
  - Add policies for user/org access
  - Test with supabase db push

# Task 7 - Middleware
CONFIG:
  - matcher: ['/api/((?!stripe/webhook).*)']  # Exclude webhooks
  - Rate limits: 10 req/min for anonymous, 100 for authenticated

# Task 10 - Webhook Events Table
SUPABASE:
  - Create via Supabase dashboard or migration
  - Add to types/supabase.ts after generation
```

## Validation Loop

### Level 1: Syntax & Type Checking
```bash
# After each task, run:
npm run lint              # ESLint checks
npx tsc --noEmit         # TypeScript compilation

# Expected: No errors. Fix before proceeding.
```

### Level 2: Schema Validation Tests
```typescript
// Create test-validation.ts
import { IntakeDataSchema, GenerateKitSchema } from './lib/validation/schemas';

// Test valid data passes
const validIntake = {
  role_title: "Software Engineer",
  organization: "Acme Corp",
  mission: "Build amazing products that delight users",
  // ... rest of required fields
};

const result = IntakeDataSchema.safeParse(validIntake);
console.log('Valid intake:', result.success); // Should be true

// Test invalid data fails with useful errors
const invalidIntake = { role_title: "" };
const errorResult = IntakeDataSchema.safeParse(invalidIntake);
console.log('Invalid errors:', errorResult.error?.format());
```

```bash
# Run validation tests
npx tsx test-validation.ts

# Expected: Valid passes, invalid shows formatted errors
```

### Level 3: Auth & Middleware Tests
```bash
# Start dev server
npm run dev

# Test rate limiting (should get 429 after 10 requests)
for i in {1..15}; do
  curl -X GET http://localhost:3000/api/admin/orders \
    -H "Content-Type: application/json" \
    -w "\\nStatus: %{http_code}\\n"
done

# Test admin auth (should get 401)
curl -X GET http://localhost:3000/api/admin/orders \
  -H "Content-Type: application/json"

# Expected: 401 Unauthorized (no auth token)
```

### Level 4: Webhook Idempotency Test
```bash
# Send duplicate webhook events
WEBHOOK_PAYLOAD='{"id":"evt_test123","type":"checkout.session.completed"}'

# First request - should process
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: test_sig" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD"

# Second request - should skip (idempotent)
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: test_sig" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD"

# Check logs for "Event already processed" message
```

### Level 5: End-to-End Kit Generation
```bash
# Test kit generation with validation
curl -X POST http://localhost:3000/api/kits/generate \
  -H "Content-Type: application/json" \
  -d '{
    "express_mode": true,
    "role_title": "Product Manager"
  }'

# Should return validated kit with all artifacts
# Check logs for structured output with pino
```

## Final Validation Checklist
- [ ] All TypeScript compiles: `npx tsc --noEmit`
- [ ] No lint errors: `npm run lint`
- [ ] Environment validated on startup
- [ ] Admin routes return 401 without auth
- [ ] Invalid inputs return Zod validation errors
- [ ] Rate limiting triggers after threshold
- [ ] Duplicate webhooks are idempotent
- [ ] Logs use structured format (not console)
- [ ] PDF generation handles null values
- [ ] Emails send on payment and approval

---

## Anti-Patterns to Avoid
- ❌ Don't use service role key in client-facing code
- ❌ Don't skip Zod validation "because TypeScript"
- ❌ Don't store sensitive data in logs
- ❌ Don't process webhooks without signature verification
- ❌ Don't use Node.js modules in middleware.ts
- ❌ Don't ignore nullable types - check explicitly
- ❌ Don't create new PDF strategies - consolidate existing

## Migration Notes
```sql
-- Required database changes
-- Run in Supabase SQL editor

-- Table for webhook idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT,
  metadata JSONB
);

-- Index for fast lookups
CREATE INDEX idx_webhook_events_processed 
  ON webhook_events(processed_at DESC);

-- Enable RLS on all tables
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on requirements)
CREATE POLICY "Users can view their own kits" ON kits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their org's orders" ON orders
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );
```

## Confidence Score: 8/10

**Strengths:**
- Comprehensive context with all needed documentation
- Clear task ordering with dependencies
- Executable validation steps
- Addresses all identified issues

**Considerations:**
- Supabase Auth setup may need UI components
- Rate limiting in Edge runtime has limitations
- Some migrations require database access

This PRP provides sufficient context for one-pass implementation with validation loops for self-correction.