name: "Admin Authentication & Route Protection Implementation"
description: |

## Purpose
Implementation PRP for securing admin routes with comprehensive authentication, role-based access control, and passwordless login system using existing codebase patterns.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Implement secure admin authentication system that protects /admin routes and /api/admin/* endpoints with passwordless email magic link authentication, role-based access control using existing Supabase infrastructure, and comprehensive audit logging.

## Why
- **Business value**: Enable secure admin access to order management without exposing sensitive operations
- **Integration**: Leverage existing auth infrastructure (lib/auth/middleware.ts, lib/auth/helpers.ts) and Supabase setup
- **Problems this solves**: Currently /admin is accessible to anyone but shows no data due to RLS; need proper admin authentication flow

## What
**User-visible behavior**: 
- Visiting /admin unauthenticated → redirects to /login
- Admins can log in with email magic link
- Admin dashboard shows orders, allows approval/management
- Non-admins get 403 forbidden
- Audit logging for all admin actions

**Technical requirements**:
- Zero service keys in browser bundles
- RLS-based security using user JWT tokens
- Passwordless authentication via Supabase Auth
- ADMIN_EMAILS environment variable for role bootstrapping

### Success Criteria
- [ ] Unauthenticated /admin access redirects to /login
- [ ] Admin email authentication via magic link works
- [ ] Authenticated admins can view and manage orders
- [ ] Non-admin users receive 403 on admin routes
- [ ] No service-role keys exposed in client bundles
- [ ] All admin actions logged to audit_logs table
- [ ] RLS policies allow admin access across all tables

## All Needed Context

### Documentation & References (list all context needed to implement the feature)
```yaml
# MUST READ - Include these in your context window
- url: https://supabase.com/docs/guides/auth/server-side/creating-a-client
  why: SSR auth patterns for Next.js 15 with cookies()
  
- url: https://supabase.com/docs/guides/auth/server-side/middleware
  why: Middleware authentication patterns with createServerClient
  
- url: https://supabase.com/docs/guides/auth/auth-magic-link
  why: Magic link implementation with Supabase Auth
  
- url: https://supabase.com/docs/guides/database/postgres/row-level-security
  why: RLS policy creation for admin access patterns

- file: lib/auth/middleware.ts
  why: Existing auth functions - requireAuthentication, requireAdminAccess, isAdminEmail patterns
  
- file: lib/auth/helpers.ts  
  why: Safe wrapper patterns for auth operations and error handling
  
- file: lib/supabase/client.ts
  why: createAuthenticatedClient() pattern, deprecated createServerClient() usage
  
- file: middleware.ts
  why: Current rate limiting and CORS setup - need to add auth route protection
  
- file: lib/config/env.ts
  why: ADMIN_EMAILS validation and isAdminEmail() helper function
  
- file: lib/logger/index.ts
  why: Logging patterns for audit trails and security events
  
- file: types/index.ts
  why: User, Order, Kit, AuditLog type definitions
  
- file: app/admin/page.tsx
  why: Existing admin UI that needs protection
  
- file: app/api/admin/orders/route.ts
  why: Existing admin API pattern that uses createAdminClient() - needs migration to user auth
```

### Current Codebase tree (relevant files for this feature)
```bash
hiringkit/
├── app/
│   ├── admin/
│   │   └── page.tsx                 # Existing admin UI (needs auth guard)
│   ├── api/
│   │   └── admin/
│   │       ├── orders/route.ts      # Existing admin API (needs auth guard)
│   │       └── kits/[id]/approve/route.ts
│   └── layout.tsx
├── lib/
│   ├── auth/
│   │   ├── middleware.ts            # Existing auth functions
│   │   └── helpers.ts               # Safe auth wrappers
│   ├── supabase/
│   │   └── client.ts                # Supabase client patterns
│   ├── config/
│   │   └── env.ts                   # ADMIN_EMAILS env validation
│   └── logger/
│       └── index.ts                 # Winston logging setup
├── middleware.ts                    # Rate limiting/CORS (needs auth routes)
├── types/index.ts                   # User, Order, AuditLog types
└── components/ui/                   # Button, Card, Input components
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
hiringkit/
├── app/
│   ├── admin/
│   │   └── page.tsx                 # MODIFY: Add requireAdmin() server-side guard
│   ├── api/
│   │   └── admin/
│   │       ├── orders/route.ts      # MODIFY: Replace createAdminClient with user auth
│   │       └── kits/[id]/approve/route.ts # MODIFY: Same as orders
│   ├── login/
│   │   └── page.tsx                 # CREATE: Magic link login form
│   └── auth/
│       └── callback/
│           └── route.ts             # CREATE: Auth callback handler
├── lib/
│   ├── auth/
│   │   ├── requireAdmin.ts          # CREATE: Server-side admin guard
│   │   └── supabase-server.ts       # CREATE: SSR Supabase client for pages
│   └── database/
│       └── migrations/
│           └── 001_admin_policies.sql # CREATE: RLS policies for admin access
└── middleware.ts                    # MODIFY: Add /admin and /api/admin route protection
```

### Known Gotchas of our codebase & Library Quirks
```typescript
// CRITICAL: Current codebase uses deprecated createServerClient() with service role
// Example: app/api/admin/orders/route.ts uses createAdminClient() 
// MUST CHANGE TO: Use createAuthenticatedClient() with user JWT for RLS

// CRITICAL: Next.js 15 with React 19 - cookies() is async
// Example: const cookieStore = await cookies(); // Note the await!

// CRITICAL: Existing middleware.ts only does rate limiting
// Example: Need to add admin route protection without breaking existing CORS/rate limiting

// CRITICAL: ADMIN_EMAILS env var already exists and validated
// Example: env.ADMIN_EMAILS is already parsed as string[] in lib/config/env.ts

// CRITICAL: Existing auth helpers use NextRequest parameter pattern
// Example: requireAdminAccess(request: NextRequest) - follow this pattern

// CRITICAL: Winston logging already configured with context and security logging
// Example: logSecurity() function exists for audit trails

// CRITICAL: TypeScript types already defined for User with role field
// Example: User interface has role: 'user' | 'admin' field

// CRITICAL: No test framework setup in package.json
// Example: Manual testing only - no jest/vitest available
```

## Implementation Blueprint

### Data models and structure

Database changes needed for RLS policies:
```sql
-- RLS policies to allow admin access across all tables
-- Ensure 'role' column exists on users table
-- Create is_admin() helper function for RLS
-- Grant admin read/write on orders, kits, exports tables
-- Create audit_logs table for admin action tracking
```

### list of tasks to be completed to fullfill the PRP in the order they should be completed

```yaml
Task 1: CREATE SQL migration for admin RLS policies
FILE: lib/database/migrations/001_admin_policies.sql
PATTERN: Follow existing migration in migrations/add_webhook_events_table.sql
CONTENT: 
  - Ensure users.role column exists with index
  - CREATE FUNCTION is_admin() returns boolean
  - ALTER TABLE orders ENABLE ROW LEVEL SECURITY + admin policies
  - ALTER TABLE kits ENABLE ROW LEVEL SECURITY + admin policies  
  - ALTER TABLE exports ENABLE ROW LEVEL SECURITY + admin policies
  - CREATE audit_logs table for admin actions

Task 2: CREATE server-side Supabase client helper
FILE: lib/auth/supabase-server.ts
MIRROR: lib/supabase/client.ts createAuthenticatedClient() pattern
MODIFY: Export as createSupabaseServerClient() for page components
KEEP: Same cookie handling and error patterns

Task 3: CREATE requireAdmin server-side guard
FILE: lib/auth/requireAdmin.ts  
MIRROR: lib/auth/middleware.ts requireAdminAccess() pattern
MODIFY: Return { supabase, user } object, use redirect() for page guards
CRITICAL: Import redirect from 'next/navigation', not NextResponse

Task 4: CREATE login page with magic link
FILE: app/login/page.tsx
MIRROR: UI patterns from app/admin/page.tsx (Card, Button components)
PATTERN: Client component with Supabase auth.signInWithOtp()
KEEP: Tailwind classes and component patterns from admin page

Task 5: CREATE auth callback route handler  
FILE: app/auth/callback/route.ts
PATTERN: Standard Supabase auth callback with redirect
MIRROR: API route patterns from app/api/admin/orders/route.ts structure
KEEP: Error handling and logging patterns

Task 6: MODIFY middleware to protect admin routes
FILE: middleware.ts
FIND: Current CORS and rate limiting logic  
ADD: Admin route protection before rate limiting
PRESERVE: Existing rate limiting, CORS, security headers
PATTERN: Check auth cookie presence, redirect to /login if missing

Task 7: MODIFY admin page to use requireAdmin guard
FILE: app/admin/page.tsx
FIND: Current client-side data fetching
REPLACE: Add server-side requireAdmin() call
PRESERVE: Existing UI components and styling
PATTERN: Server component with database queries

Task 8: MODIFY admin API to use user authentication
FILE: app/api/admin/orders/route.ts  
FIND: createAdminClient() usage
REPLACE: createAuthenticatedClient() with user JWT
PRESERVE: Query structure and error handling
ADD: Audit logging for admin actions

Task 9: MODIFY admin kit approval API
FILE: app/api/admin/kits/[id]/approve/route.ts
SAME: Follow same pattern as Task 8
MIRROR: Use requireAdmin() and createAuthenticatedClient()
ADD: Audit log entry for kit approval action
```

### Per task pseudocode as needed added to each task

```typescript
// Task 3: requireAdmin.ts pseudocode
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase-server';

export async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // PATTERN: Check role via RLS-safe query (follows existing pattern)
  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (!userRecord || userRecord.role !== 'admin') {
    // CRITICAL: Use Error throw for API routes, redirect for pages
    throw new Error('FORBIDDEN'); 
  }
  
  return { supabase, user };
}

// Task 4: Login page pseudocode  
'use client';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const supabase = createClient(/* public client */);
  
  async function handleSubmit(e) {
    e.preventDefault();
    // PATTERN: Follow Supabase magic link pattern
    await supabase.auth.signInWithOtp({ 
      email, 
      options: { emailRedirectTo: '/auth/callback' }
    });
    // Show success message
  }
  
  // PATTERN: Use existing Card, Button, Input components
  return <Card><form onSubmit={handleSubmit}>...</form></Card>;
}

// Task 6: middleware.ts modification pseudocode
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // PATTERN: Add admin route protection BEFORE existing logic
  const adminRoutes = [/^\/admin(\/.*)?$/, /^\/api\/admin\//];
  const isAdminRoute = adminRoutes.some(pattern => pattern.test(pathname));
  
  if (isAdminRoute) {
    // CRITICAL: Only check cookie presence, not role (can't query DB in middleware)
    const hasSession = request.cookies.has('sb-access-token');
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // PRESERVE: Continue with existing CORS and rate limiting
  return existingMiddlewareLogic(request);
}
```

### Integration Points
```yaml
DATABASE:
  - migration: "Run lib/database/migrations/001_admin_policies.sql"
  - policies: "RLS policies for orders, kits, exports tables allowing admin access"
  
CONFIG:
  - env: "ADMIN_EMAILS already exists and validated in lib/config/env.ts"
  - pattern: "isAdminEmail(email) helper already available"
  
ROUTES:
  - protect: "/admin, /api/admin/* routes in middleware.ts"
  - create: "/login for magic link auth, /auth/callback for auth flow"
  
LOGGING:
  - audit: "Use existing logSecurity() for admin actions"
  - pattern: "Follow existing Winston logging patterns in lib/logger/"
```

## Validation Loop

### Level 1: Syntax & Style  
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                         # ESLint with Next.js rules
npx tsc --noEmit                    # TypeScript type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Manual Testing (No test framework available)
```bash
# Start development server
npm run dev

# Test authentication flow
1. Visit http://localhost:3000/admin (should redirect to /login)
2. Enter admin email from ADMIN_EMAILS env var
3. Check email for magic link, click it
4. Should redirect to /admin with data visible
5. Try non-admin email (should get 403 in browser network tab)

# Test API protection  
curl -X GET http://localhost:3000/api/admin/orders
# Expected: 403 without auth cookie

# Test with authenticated admin session
# (Use browser with admin session, copy cookies)
curl -X GET http://localhost:3000/api/admin/orders \
  -H "Cookie: sb-access-token=..."
# Expected: 200 with orders data
```

### Level 3: Database Verification
```bash
# Connect to Supabase and verify RLS
# Check that policies are created:
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('orders', 'kits', 'exports');

# Test RLS with non-admin user:
# (Should return 0 rows for orders query)

# Verify admin can access:
# (Should return all orders for admin user)
```

## Final validation Checklist
- [ ] All linting passes: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit`  
- [ ] Manual auth flow works: login → redirect → admin access
- [ ] API protection working: 403 without auth, 200 with admin auth
- [ ] RLS policies active: non-admin gets 0 rows, admin gets all data
- [ ] No service keys in client bundle: `grep -r "service.*role" app/` returns nothing
- [ ] Audit logs created: admin actions logged to audit_logs table
- [ ] Error handling graceful: proper redirects and error messages

---

## Anti-Patterns to Avoid
- ❌ Don't use createAdminClient() in client-accessible code
- ❌ Don't skip RLS - always use user JWT authentication  
- ❌ Don't hardcode admin emails - use ADMIN_EMAILS env var
- ❌ Don't break existing middleware - preserve CORS and rate limiting
- ❌ Don't forget audit logging - log all admin actions
- ❌ Don't expose service keys - use createAuthenticatedClient() pattern
- ❌ Don't ignore TypeScript errors - fix all type issues

## Success Metrics (Confidence Score: 9/10)

**Why High Confidence:**
- Extensive existing auth infrastructure to build upon
- Clear patterns established in lib/auth/middleware.ts and helpers.ts  
- Supabase SSR integration already working
- Type definitions already complete
- Logging system already configured
- ADMIN_EMAILS environment validation already in place

**Risk Mitigation:**
- Use existing patterns extensively to avoid introducing new bugs
- Progressive implementation with validation at each step
- Comprehensive manual testing plan (no test framework available)
- RLS as security foundation (not just middleware protection)

This PRP provides all necessary context for successful one-pass implementation by following established codebase patterns and leveraging existing infrastructure.