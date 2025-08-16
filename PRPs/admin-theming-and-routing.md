# PRP: Admin UI Theming, Accessibility & Correct Routing Implementation

**Feature:** 0.3.2-feature-admin-theming-and-routing.md  
**Date:** 2025-08-16  
**Confidence Score:** 9/10 (High confidence - clear requirements, existing patterns to follow)

## Executive Summary
Implement comprehensive admin UI improvements focusing on:
1. WCAG AA compliant theming with proper contrast ratios
2. Fix incorrect routing from `/kit/:id` to `/admin/orders/:id`
3. Create detailed Order Detail page with full order management
4. Surface Pro/HITL review workflow

## Implementation Context

### Current State Analysis
- **Accessibility Issues:** Line 279 in `/app/admin/dashboard.tsx` uses dark text on dark backgrounds
- **Routing Bug:** Admin View button incorrectly links to `/kit/${order.kit_id}` (user-facing page)
- **Missing Features:** No admin order detail page exists
- **Authentication:** Solid admin auth pattern exists via `requireAdmin()`

### Files to Reference & Modify
```
MODIFY:
- app/admin/dashboard.tsx (fix routing, improve theming)
- app/globals.css (add admin-specific CSS variables)
- components/ui/button.tsx (ensure proper variants)
- components/ui/badge.tsx (improve contrast)
- components/ui/card.tsx (add hover states)

CREATE:
- app/admin/orders/[id]/page.tsx (order detail page)
- app/admin/layout.tsx (admin-specific layout wrapper)
- components/admin/OrderDetail.tsx (order detail component)
- components/admin/OrderTimeline.tsx (audit log component)
- components/admin/ProReviewActions.tsx (Pro workflow actions)
- lib/database/queries/orders.ts (centralized order queries)
```

## External Documentation & Resources

### Accessibility Standards
- **WCAG AA Compliance:** https://www.w3.org/WAI/WCAG22/quickref/?currentsidebar=%23col_customize&levels=aa
- **Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Shadcn Table Docs:** https://ui.shadcn.com/docs/components/table
- **Shadcn Theming:** https://ui.shadcn.com/docs/theming

### Best Practices
- Use semantic HTML (`<table>`, `<thead>`, `<tbody>`)
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Focus rings must be visible (2px minimum)
- Keyboard navigation must work for all interactive elements

## Implementation Blueprint

### Phase 1: Admin Layout & Theming Foundation

```typescript
// app/admin/layout.tsx - Admin-specific layout wrapper
export default function AdminLayout({ children }) {
  return (
    <div className="admin-theme min-h-screen bg-gray-50">
      {/* Admin navigation header */}
      <AdminHeader />
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}

// app/globals.css - Add admin-specific CSS variables
.admin-theme {
  /* Light theme with proper contrast */
  --background: 0 0% 98%;           /* #FAFAFA - Light gray background */
  --foreground: 0 0% 9%;            /* #171717 - Almost black text */
  --card: 0 0% 100%;                /* White cards */
  --card-foreground: 0 0% 9%;       /* Dark text on cards */
  --primary: 225 69% 35%;           /* Keep brand blue */
  --primary-foreground: 0 0% 100%;  /* White on primary */
  --secondary: 240 5% 96%;          /* Very light gray */
  --secondary-foreground: 0 0% 9%;  /* Dark text */
  --muted: 240 5% 96%;              /* Match secondary */
  --muted-foreground: 0 0% 40%;     /* Medium gray text */
  --accent: 172 49% 46%;            /* Keep brand teal */
  --accent-foreground: 0 0% 100%;   /* White on accent */
  --border: 0 0% 89%;               /* Light border */
  --input: 0 0% 89%;                /* Match border */
  --ring: 225 69% 35%;              /* Focus ring matches primary */
  
  /* Table specific */
  --table-header-bg: 240 5% 96%;
  --table-row-hover: 240 5% 98%;
  --table-row-stripe: 0 0% 99%;
}

/* Ensure proper focus states */
.admin-theme *:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Table improvements */
.admin-table {
  @apply w-full border-collapse;
}

.admin-table thead {
  @apply bg-gray-100 sticky top-0 z-10;
}

.admin-table tbody tr:hover {
  @apply bg-gray-50;
}

.admin-table tbody tr:nth-child(even) {
  @apply bg-gray-50/50;
}
```

### Phase 2: Fix Dashboard Routing & Improve UI

```typescript
// app/admin/dashboard.tsx - Key changes
// Line 279: Fix the View button routing
<Button
  variant="secondary"
  size="sm"
  onClick={() => router.push(`/admin/orders/${order.id}`)} // Changed from /kit/:id
  disabled={!order.id} // Disable if no order ID
>
  <Eye className="h-3 w-3 mr-1" />
  View Details
</Button>

// Improve status badges with better contrast
const getStatusBadge = (status: string) => {
  const badgeStyles = {
    qa_pending: "bg-amber-100 text-amber-900 border-amber-200",
    ready: "bg-emerald-100 text-emerald-900 border-emerald-200",
    paid: "bg-blue-100 text-blue-900 border-blue-200",
    delivered: "bg-gray-100 text-gray-900 border-gray-200",
    awaiting_payment: "bg-red-100 text-red-900 border-red-200",
  };
  
  return (
    <Badge 
      className={cn("border", badgeStyles[status] || "bg-gray-100 text-gray-900")}
    >
      {/* icon + label */}
    </Badge>
  );
};
```

### Phase 3: Create Order Detail Page

```typescript
// app/admin/orders/[id]/page.tsx
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getOrderDetails } from "@/lib/database/queries/orders";
import { OrderDetail } from "@/components/admin/OrderDetail";

export default async function AdminOrderDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { supabase, user } = await requireAdmin();
  
  // Fetch comprehensive order data
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      kits (
        *,
        artifacts_json,
        edited_json,
        intake_json
      ),
      users (
        id,
        email,
        full_name
      ),
      organizations (
        id,
        name,
        brand_logo_url
      )
    `)
    .eq('id', params.id)
    .single();
    
  if (error || !order) {
    notFound();
  }
  
  // Fetch audit log
  const { data: auditLog } = await supabase
    .from("audit_log")
    .select("*")
    .eq('order_id', params.id)
    .order('created_at', { ascending: false });
  
  return (
    <OrderDetail 
      order={order}
      auditLog={auditLog || []}
      currentUser={user}
    />
  );
}

// components/admin/OrderDetail.tsx
export function OrderDetail({ order, auditLog, currentUser }) {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">
                Created {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(order.status)}
              <Badge variant={order.total_cents >= 10000 ? "default" : "secondary"}>
                {order.total_cents >= 10000 ? "Pro" : "Solo"} Plan
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-2">Customer</h3>
            <div className="space-y-1 text-sm">
              <p>{order.users?.full_name || "N/A"}</p>
              <p className="text-muted-foreground">{order.users?.email}</p>
            </div>
          </div>
          
          {/* Organization */}
          <div>
            <h3 className="font-semibold mb-2">Organization</h3>
            <p className="text-sm">{order.organizations?.name || "N/A"}</p>
          </div>
          
          {/* Payment */}
          <div>
            <h3 className="font-semibold mb-2">Payment</h3>
            <p className="text-2xl font-bold">${(order.total_cents / 100).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Kit Details */}
      {order.kits && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Hiring Kit Details</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Role Title</Label>
                <p>{order.kits.intake_json?.role_title}</p>
              </div>
              
              {/* Downloads Section */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => downloadPDF(order.kit_id)}
                  disabled={order.kits.status !== 'published'}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => downloadZip(order.kit_id)}
                  disabled={order.kits.status !== 'published'}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Pro Review Actions */}
      {order.total_cents >= 10000 && order.status === 'qa_pending' && (
        <ProReviewActions order={order} />
      )}
      
      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Admin Actions</h2>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => resendEmail(order.id)}>
            <Mail className="h-4 w-4 mr-2" />
            Resend Email
          </Button>
          
          {order.status === 'awaiting_payment' && (
            <Button 
              variant="secondary"
              onClick={() => markAsPaid(order.id)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          
          <Button 
            variant="secondary"
            onClick={() => addNote(order.id)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </CardContent>
      </Card>
      
      {/* Timeline/Audit Log */}
      <OrderTimeline events={auditLog} />
    </div>
  );
}
```

### Phase 4: Database Queries Module

```typescript
// lib/database/queries/orders.ts
import { createServerClient } from '@/lib/supabase/server';

export async function getOrderDetails(orderId: string) {
  const supabase = createServerClient();
  
  return await supabase
    .from('orders')
    .select(`
      *,
      kits (*),
      users (id, email, full_name),
      organizations (id, name, brand_logo_url)
    `)
    .eq('id', orderId)
    .single();
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus,
  userId: string
) {
  const supabase = createServerClient();
  
  // Update order
  const { error: orderError } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
    
  // Add audit log entry
  const { error: auditError } = await supabase
    .from('audit_log')
    .insert({
      order_id: orderId,
      user_id: userId,
      action: `status_changed_to_${status}`,
      metadata: { previous_status: oldStatus, new_status: status }
    });
    
  return { success: !orderError && !auditError };
}
```

## Implementation Tasks (In Order)

1. **Create admin layout wrapper** with proper theming classes
2. **Update globals.css** with admin-specific CSS variables ensuring WCAG AA contrast
3. **Fix dashboard.tsx routing** - change `/kit/:id` to `/admin/orders/:id`
4. **Improve status badges** with proper contrast colors
5. **Create order detail page** at `/admin/orders/[id]/page.tsx`
6. **Build OrderDetail component** with comprehensive order information
7. **Create ProReviewActions component** for Pro/HITL workflow
8. **Implement OrderTimeline component** for audit log display
9. **Add database query functions** for centralized data access
10. **Create API routes** for admin actions (resend email, mark paid, add note)
11. **Add loading and error states** for all async operations
12. **Implement keyboard navigation** for tables and actions
13. **Add responsive design** for mobile/tablet views
14. **Test all WCAG AA requirements** using automated tools

## Validation Gates

```bash
# 1. Type checking must pass
npm run typecheck || npx tsc --noEmit

# 2. Linting must pass
npm run lint || npx eslint . --ext .ts,.tsx

# 3. Build must succeed
npm run build

# 4. Accessibility audit (using axe-core)
# Run in browser console on admin pages:
# await import('https://unpkg.com/axe-core@latest/axe.min.js').then(() => axe.run().then(results => console.log(results)))

# 5. Manual testing checklist:
echo "
MANUAL TESTING CHECKLIST:
[ ] Admin dashboard loads with proper light theme
[ ] All text has minimum 4.5:1 contrast ratio
[ ] View button navigates to /admin/orders/:id
[ ] Order detail page shows all required information
[ ] Download buttons work for published kits
[ ] Pro orders show review actions
[ ] Admin actions (resend, mark paid) work
[ ] Keyboard navigation works throughout
[ ] Focus indicators are visible
[ ] Mobile responsive (test at 390px width)
[ ] No hardcoded localhost URLs
"

# 6. Run development server and verify
npm run dev
# Navigate to http://localhost:3000/admin
# Test all flows end-to-end
```

## Error Handling & Edge Cases

### Handle These Scenarios:
1. **Missing kit reference:** Disable View button with tooltip
2. **Deleted kit:** Show "Kit deleted" message in order detail
3. **Missing user data:** Display "Anonymous" or user ID fallback
4. **Failed API calls:** Show user-friendly error with retry option
5. **Unauthorized access:** Redirect to /unauthorized
6. **Network errors:** Implement retry logic with exponential backoff

## Security Considerations

1. **Always use requireAdmin()** for authentication
2. **Validate all inputs** with Zod schemas
3. **Log all admin actions** to audit_log table
4. **Never expose sensitive data** in client-side code
5. **Use CSRF protection** for state-changing operations

## Performance Optimizations

1. **Use React.memo** for expensive components
2. **Implement virtual scrolling** for long order lists
3. **Lazy load** order detail sections
4. **Cache** frequently accessed data
5. **Use optimistic updates** for better UX

## Success Metrics

- **Contrast ratio:** All elements ≥ 4.5:1 (AA standard)
- **Load time:** Order detail page < 500ms
- **Keyboard navigation:** 100% of actions accessible
- **Error rate:** < 0.1% for admin operations
- **Time to find order:** < 15 seconds

## Rollback Plan

If issues arise:
1. Revert git commits
2. Clear browser cache
3. Restart Next.js server
4. Restore previous database state if schema changed

## Additional Resources

- **Next.js App Router Docs:** https://nextjs.org/docs/app
- **Supabase RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security
- **Tailwind CSS Utilities:** https://tailwindcss.com/docs
- **React Accessibility:** https://react.dev/reference/react-dom/components/common#accessibility-attributes

## Common Pitfalls to Avoid

1. ❌ Using `window.location` instead of Next.js router
2. ❌ Hardcoding color values instead of CSS variables
3. ❌ Forgetting to handle loading/error states
4. ❌ Not testing with keyboard navigation
5. ❌ Ignoring mobile responsive design
6. ❌ Skipping audit log entries for admin actions
7. ❌ Using client-side auth checks only

## Implementation Notes

- Start with theming to ensure all subsequent work has proper contrast
- Test routing changes immediately to catch issues early
- Build order detail page incrementally, starting with basic info
- Add Pro features only after core functionality works
- Continuously test accessibility with automated tools

---

**Confidence Score: 9/10**

High confidence due to:
- Clear requirements in feature file
- Existing patterns to follow in codebase
- Well-defined UI component library (shadcn)
- Strong authentication system already in place
- Comprehensive type definitions available

Minor uncertainty around:
- Exact audit_log table schema (may need creation)
- Specific Pro/HITL workflow details (may need clarification)