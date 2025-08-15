name: "Build Issues Comprehensive Fix - Clean Production Build"
description: |

## Purpose
Systematically resolve ALL build issues to achieve 100% clean production build. This includes fixing critical build failures, eliminating Edge Runtime warnings, and cleaning up ESLint violations.

## Core Principles
1. **Root Cause Analysis**: Address underlying causes, not just symptoms
2. **Systematic Approach**: Fix critical build blockers first, then warnings
3. **Follow Project Conventions**: Adhere to patterns established in CLAUDE.md
4. **Production Ready**: Ensure build passes all validation gates
5. **No Breaking Changes**: Preserve existing functionality

---

## Goal
Achieve a 100% clean production build that passes all validation gates without any errors or warnings that could impact production deployment.

## Why
- **Production Readiness**: Current build failure prevents deployment
- **Developer Experience**: Clean builds improve development workflow  
- **Performance**: Proper Edge Runtime configuration improves app performance
- **Code Quality**: ESLint compliance ensures maintainable codebase
- **CI/CD**: Clean builds enable automated deployment pipelines

## What
Fix all categories of build issues identified in the build output:

### Success Criteria
- [ ] `npm run build` completes successfully without "Failed to compile"
- [ ] No "Type error:" messages in build output
- [ ] All TypeScript compilation errors resolved
- [ ] ESLint warnings cleaned up (unused variables)
- [ ] Supabase Edge Runtime warnings eliminated
- [ ] Multiple lockfiles warning resolved
- [ ] Build artifacts successfully generated in `.next/`

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Critical for understanding solutions
- url: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
  why: Official Next.js docs on useSearchParams Suspense boundary requirement
  
- url: https://nextjs.org/docs/app/api-reference/functions/use-search-params
  why: Proper usage patterns for useSearchParams in App Router
  
- url: https://nextjs.org/docs/app/api-reference/edge
  why: Edge Runtime configuration and Node.js API restrictions
  
- url: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
  why: Supabase Next.js integration best practices for Edge Runtime
  
- file: /home/lucast/projects/hiringkit/CLAUDE.md
  why: Project conventions and runtime configuration requirements
  critical: "Default to Node runtime for PDF/Stripe/Resend or anything that needs Node APIs"

- file: /home/lucast/projects/hiringkit/app/kit/page.tsx
  why: Current useSearchParams implementation causing build failure
  
- docfile: PRPs/templates/prp_base.md
  why: Validation patterns and anti-patterns to follow
```

### Current Codebase Structure
```bash
/home/lucast/projects/hiringkit
├── app/
│   ├── api/                    # API routes (need runtime config)
│   │   ├── kits/[id]/export/   # PDF export (Node.js APIs)
│   │   ├── stripe/webhook/     # Stripe (Node.js APIs)
│   │   └── checkout/           # Payment processing
│   ├── kit/
│   │   └── page.tsx           # 🚨 CRITICAL: useSearchParams issue
│   └── layout.tsx
├── lib/
│   ├── pdf/                   # PDF generation (Node.js dependent)
│   ├── auth/                  # 🔧 ESLint unused variables
│   └── supabase/             # 🔧 ESLint unused variables
├── components/
│   └── kit/
└── types/
```

### Build Issues Categorized
```yaml
CRITICAL_BLOCKING:
  - useSearchParams Suspense boundary error in /kit page
  - Build fails with prerender error
  
EDGE_RUNTIME_WARNINGS:
  - process.version usage in @supabase/supabase-js (8 instances)
  - Node.js APIs not supported in Edge Runtime
  
ESLINT_WARNINGS:
  - app/api/kits/[id]/export/route.ts:83 - exportError unused
  - lib/auth/helpers.ts:134 - error unused  
  - lib/pdf/* - multiple data/error unused variables
  - lib/supabase/client.ts - error unused (2 instances)
  
LOCKFILE_CONFLICT:
  - /home/lucast/package-lock.json conflicts with project lockfile
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Next.js 15 App Router Suspense requirements
// useSearchParams MUST be wrapped in Suspense for static rendering
// Component structure matters - hook call timing vs Suspense boundary

// CRITICAL: Supabase Edge Runtime incompatibility  
// @supabase/supabase-js uses process.version (Node.js API)
// Solution: Configure routes for Node.js runtime when using Supabase

// CRITICAL: ESLint unused variables pattern
// Destructured error variables from Supabase/async operations
// Should be prefixed with underscore or handled properly

// GOTCHA: Multiple lockfiles
// Parent directory lockfile conflicts with project lockfile
// npm prioritizes parent directory lockfile over project lockfile
```

## Implementation Blueprint

### Data Models and Structure
No new data models required - this is a build configuration and code cleanup task.

### List of Tasks (In Order)
```yaml
Task 1: Fix Critical useSearchParams Suspense Boundary
MODIFY app/kit/page.tsx:
  - EXTRACT useSearchParams logic into separate client component
  - WRAP extracted component in Suspense boundary
  - PRESERVE existing functionality and state management
  - FOLLOW Next.js 15 App Router patterns

Task 2: Configure API Routes for Node.js Runtime  
MODIFY app/api/kits/[id]/export/route.ts:
  - ADD export const runtime = 'nodejs' at top of file
  - REASON: Uses PDF generation and Supabase service role

MODIFY app/api/stripe/webhook/route.ts:
  - ADD export const runtime = 'nodejs' at top of file  
  - REASON: Uses Stripe SDK and Node.js crypto operations

MODIFY app/api/checkout/route.ts:
  - ADD export const runtime = 'nodejs' at top of file
  - REASON: Uses Stripe SDK

Task 3: Clean Up ESLint Unused Variables
MODIFY app/api/kits/[id]/export/route.ts:
  - FIND: const { data: exportRecord, error: exportError }
  - REPLACE: const { data: exportRecord, error: _exportError }
  - OR: Add proper error handling for exportError

MODIFY lib/auth/helpers.ts:
  - FIND: } catch (error) {
  - REPLACE: } catch (_error) {
  - OR: Add console.warn for development debugging

MODIFY lib/pdf/*.ts files:
  - PREFIX unused variables with underscore
  - OR: Remove if truly unnecessary
  - PATTERN: data -> _data, error -> _error

MODIFY lib/supabase/client.ts:
  - PREFIX unused error variables with underscore
  - MAINTAIN error handling structure for future use

Task 4: Resolve Lockfile Conflicts
VERIFY /home/lucast/package-lock.json purpose:
  - CHECK if needed for global tools
  - RECOMMEND removing if not needed
  - DOCUMENT if removal is not possible

Task 5: Validation and Testing
RUN build validation sequence:
  - npm run build (must succeed)
  - Check for any remaining warnings
  - Verify no Edge Runtime warnings
```

### Per Task Pseudocode

```typescript
// Task 1: Suspense Boundary Fix
// Create SearchParamsHandler component
'use client'
function SearchParamsHandler({ children }: { children: (params: URLSearchParams) => React.ReactNode }) {
  const searchParams = useSearchParams()
  return children(searchParams)
}

// Wrap in main component
function KitPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsHandler>
        {(searchParams) => (
          <KitPageContent searchParams={searchParams} />
        )}
      </SearchParamsHandler>
    </Suspense>
  )
}

// Task 2: Runtime Configuration Pattern
// At top of API route files that need Node.js
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // if personalized data

// Task 3: ESLint Variable Handling Pattern  
// Option A: Prefix with underscore
const { data, error: _error } = await supabaseCall()

// Option B: Proper error handling (preferred)
const { data, error } = await supabaseCall()
if (error) {
  console.error('Supabase operation failed:', error)
  // Handle error appropriately
}
```

### Integration Points
```yaml
SUSPENSE_BOUNDARY:
  - component: app/kit/page.tsx
  - pattern: "Extract hook usage, wrap in Suspense"
  - preserve: "Existing state management and URL parameter logic"
  
RUNTIME_CONFIG:
  - files: ["app/api/kits/[id]/export/route.ts", "app/api/stripe/webhook/route.ts", "app/api/checkout/route.ts"]
  - pattern: "export const runtime = 'nodejs'"
  - reason: "PDF generation, Stripe SDK, Supabase service operations"
  
ESLINT_CLEANUP:
  - strategy: "Prefix unused with underscore OR add proper handling"
  - preserve: "Error handling structure for future enhancement"
  - avoid: "Removing error variables completely"
```

## Validation Loop

### Level 1: Critical Build Success
```bash
# MUST PASS - Build success is the primary goal
npm run build 2>&1 | tee build.log

# Verify no compilation failures
! grep -q "Failed to compile" build.log
echo "Build Status: $(grep -q 'Failed to compile' build.log && echo 'FAILED' || echo 'PASSED')"

# Check for TypeScript errors specifically
! grep -q "Type error:" build.log
```

### Level 2: TypeScript Validation
```bash
# Direct TypeScript checking
npx tsc --noEmit --strict

# Expected: Exit code 0 (success)
echo "TypeScript Status: $?"
```

### Level 3: ESLint Compliance
```bash
# Check for ESLint warnings in modified files
npm run lint 2>&1 | grep -E "(warning|error)"

# Expected: No unused variable warnings in targeted files
```

### Level 4: Runtime Verification
```bash
# Start dev server and verify pages load
timeout 30s npm run dev &
sleep 10

# Test critical page loads without Suspense errors  
curl -I http://localhost:3000/kit
curl -I http://localhost:3000/kit?role=engineer

# Check server logs for runtime errors
```

## Final Validation Checklist
- [ ] `npm run build` exits with code 0
- [ ] No "Failed to compile" messages in build output
- [ ] No "Type error:" messages in build output  
- [ ] No useSearchParams Suspense boundary errors
- [ ] No Edge Runtime Node.js API warnings
- [ ] ESLint unused variable warnings resolved
- [ ] /kit page loads successfully with URL parameters
- [ ] API routes respond correctly (no runtime errors)
- [ ] Build artifacts generated in .next/ directory
- [ ] Lockfile conflict warning resolved or documented

## Success Confidence Assessment

**Expected Confidence Level: 9/10**

**Reasoning:**
- **High**: All issues are well-documented with clear solutions
- **High**: No new features or complex logic required
- **High**: Existing patterns in codebase for reference
- **Medium**: Suspense boundary pattern requires careful component structure
- **High**: Runtime configuration is straightforward
- **High**: ESLint fixes are mechanical changes

**Potential Risks:**
- Suspense boundary implementation might affect component state management
- Runtime configuration changes could impact performance (but following project guidelines)
- Lockfile conflict might require environmental changes outside code

**Mitigation Strategy:**
- Preserve all existing functionality in Suspense refactor
- Follow CLAUDE.md runtime guidelines explicitly  
- Document lockfile resolution steps clearly

---

## Anti-Patterns to Avoid
- ❌ Don't suppress ESLint warnings without fixing root cause
- ❌ Don't use `any` types to bypass TypeScript errors
- ❌ Don't remove error handling completely - prefix or handle properly
- ❌ Don't ignore Edge Runtime warnings - configure runtime correctly
- ❌ Don't break existing URL parameter functionality in Suspense refactor
- ❌ Don't configure edge runtime for routes that need Node.js APIs
- ❌ Don't remove the multiple lockfiles without understanding their purpose