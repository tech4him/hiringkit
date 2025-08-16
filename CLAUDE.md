# Project: Hiring Kit - Next.js SaaS Application

## Critical Lessons Learned - Authentication Implementation

### ⚠️ ALWAYS TEST YOUR CODE
- Never assume authentication works without testing the full flow
- Test login → redirect → protected route access
- Verify cookies are being set and read correctly
- Check browser console AND network tab for the complete picture

### 🔒 Authentication Best Practices (MUST FOLLOW)

1. **NEVER use magic links for admin access**
   - Magic links are for convenience, NOT security
   - Admin accounts must be pre-vetted with proper credentials
   - Use password-based authentication for administrative users

2. **Supabase + Next.js Cookie Handling**
   - Client-side MUST use `createBrowserClient` from `@supabase/ssr`
   - Server-side MUST use `createServerClient` with proper cookie handlers
   - Middleware MUST check actual auth status, not just cookie presence
   - Example of CORRECT client setup:
   ```typescript
   import { createBrowserClient } from '@supabase/ssr';
   export const supabase = createBrowserClient(url, anonKey);
   ```

3. **Middleware Authentication Checks**
   - Don't just check for cookie names - verify the actual session
   - Use Supabase client to call `getUser()` for proper validation
   - Return the response object with updated cookies

4. **Common Pitfalls to Avoid**
   - ❌ Using `createClient` directly in browser (no cookie support)
   - ❌ Checking for hardcoded cookie names like 'sb-access-token'
   - ❌ Using `router.push()` immediately after login (session not established)
   - ❌ Assuming email access = admin privileges
   - ❌ Not handling null values in database queries

### 📋 Testing Checklist for Auth Features
Before considering any auth feature complete:
- [ ] Can user log in successfully?
- [ ] Do cookies get set correctly?
- [ ] Does middleware detect authenticated sessions?
- [ ] Do protected routes redirect unauthenticated users?
- [ ] Do authenticated users reach protected content?
- [ ] Are all null checks in place for database fields?
- [ ] Test with fresh browser/incognito mode

## Project-Specific Context

### Admin Authentication
- **Admin Email**: admin@npcrowd.com
- **Admin Password**: AdminPass123!
- **Database**: Supabase project ID: okivqyrgcqcoadtktesb
- Admin role stored in `users.role` column
- RLS policies require `role = 'admin'` for admin access

### Tech Stack
- Next.js 15.4.6 with App Router
- Supabase for auth & database
- TypeScript with strict mode
- Tailwind CSS for styling
- Stripe for payments
- OpenAI for content generation

### Development Commands
```bash
npm run dev    # Start dev server
npm run build  # Build for production
npm run lint   # Run ESLint
```

### Known Issues & Solutions
1. **Hydration mismatches**: Usually caused by browser extensions (LastPass, etc.) - generally harmless
2. **Port 3000 in use**: Dev server auto-switches to 3001
3. **Multiple lockfiles warning**: Can be ignored, uses parent directory lockfile

## Code Quality Standards

### Before Writing Code
1. **Understand existing patterns** - Read similar files first
2. **Check available libraries** - Don't assume, verify in package.json
3. **Test incrementally** - Don't write 500 lines without testing

### After Writing Code
1. **Test the happy path** - Does it work as intended?
2. **Test edge cases** - Null values, empty arrays, missing data
3. **Check browser console** - Look for errors and warnings
4. **Verify network requests** - Are cookies being set? Are requests succeeding?

### Red Flags to Catch
- Any auth system using magic links for admin access
- Client-side Supabase clients without proper cookie handling
- Middleware that only checks cookie existence, not validity
- Missing null checks on database fields that might be null
- Untested authentication flows

## Remember
**"It works on my machine" is not acceptable.**
Test your code. Verify assumptions. Check the browser console.
Authentication is critical - it must be secure AND functional.