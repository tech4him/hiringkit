import { NextRequest } from "next/server";
import { validateRequestBody, createApiResponse, createNextResponse, notFoundResponse } from "@/lib/validation/helpers";
import { CheckoutRequestSchema } from "@/lib/validation/schemas";

// Ensure this route runs on Node.js, not Edge
export const runtime = 'nodejs';
// Prevent static optimization/prerender from trying to execute it at build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isNode = () => typeof process !== 'undefined' && !!process.versions?.node;

/**
 * Create a Stripe checkout session for a kit purchase
 * 
 * Handles both authenticated and guest user checkout flows:
 * - For authenticated users: Uses their existing organization
 * - For guest users: Creates a temporary "Guest Checkout" organization
 * - Validates that both org_id and user_id are never null before order creation
 * - Ensures database constraint compliance for the orders table
 * 
 * @param request - NextRequest with checkout parameters
 * @returns Stripe checkout session URL or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validationResult = await validateRequestBody(request, CheckoutRequestSchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { kit_id, plan_type, success_url, cancel_url } = validationResult.data;

    // Only import server-only libs inside the handler, after we're on Node
    if (!isNode()) {
      return createNextResponse({
        success: false,
        error: {
          code: 'SERVER_REQUIRED',
          message: 'Server environment required for checkout',
        },
      }, 500);
    }

    // Dynamic imports for server-only functionality
    const Stripe = (await import("stripe")).default;
    const { createAdminClient } = await import("@/lib/supabase/client");
    const { safeGetCurrentUser, getOrganizationId } = await import("@/lib/auth/helpers");
    const { env } = await import("@/lib/config/env");

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia"
    });

    console.log('CHECKOUT_SESSION_REQUEST:', {
      kitId: kit_id,
      planType: plan_type,
      successUrl: success_url,
      cancelUrl: cancel_url,
    });

    // Get current user (optional for guest checkout)
    const currentUser = await safeGetCurrentUser();

    const supabase = createAdminClient();

    // Get kit details with access control
    let kitQuery = supabase
      .from("kits")
      .select("*")
      .eq("id", kit_id);

    // If user is authenticated, check ownership or allow if admin
    if (currentUser) {
      // Admin can checkout any kit, otherwise check ownership
      if (currentUser.role !== 'admin') {
        kitQuery = kitQuery.eq("user_id", currentUser.id);
      }
    }

    const { data: kit, error: kitError } = await kitQuery.single();

    if (kitError || !kit) {
      console.error('Kit not found or access denied:', {
        context: 'checkout_kit_access',
        kitId: kit_id,
        userId: currentUser?.id,
      });
      return notFoundResponse('Kit not found');
    }

    // Define pricing
    const pricing = {
      solo: {
        amount: 4900, // $49.00 in cents
        name: "Solo Kit",
        description: "Complete 9-document hiring kit with instant download"
      },
      pro: {
        amount: 12900, // $129.00 in cents
        name: "Pro Kit + Human Review",
        description: "Complete hiring kit with expert review in 4 business hours"
      }
    };

    const selectedPlan = pricing[plan_type as keyof typeof pricing];

    // Get organization ID properly
    let finalOrgId = await getOrganizationId(request, currentUser || undefined);
    
    /**
     * Guest Checkout Organization Creation
     * 
     * For users who aren't authenticated, we create a temporary organization
     * to satisfy database constraints. This organization ID will be used
     * in the order record to prevent NULL constraint violations.
     */
    if (!finalOrgId && !currentUser) {
      const { data: guestOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: "Guest Checkout",
        })
        .select()
        .single();

      if (orgError) {
        console.error('guest_org_creation error:', orgError.message, {
          context: 'guest_org_creation',
          kitId: kit_id,
        });
        return createNextResponse({
          success: false,
          error: {
            code: 'ORG_CREATION_ERROR',
            message: 'Failed to create guest organization',
          },
        }, 500);
      }
      
      finalOrgId = guestOrg.id; // ✅ Use the created guest org ID
      console.log('GUEST_ORG_CREATED:', {
        kitId: kit_id,
        guestOrgId: guestOrg.id,
        guestOrgName: guestOrg.name,
      });
    }

    // Ensure we always have an org_id - fallback to kit's org_id if available
    if (!finalOrgId) {
      finalOrgId = kit.org_id;
    }

    // Validate that we have a required org_id
    if (!finalOrgId) {
      console.error('No organization ID available for checkout:', {
        context: 'checkout_org_validation',
        kitId: kit_id,
        userId: currentUser?.id,
        kitOrgId: kit.org_id,
      });
      return createNextResponse({
        success: false,
        error: {
          code: 'ORG_REQUIRED_ERROR',
          message: 'Organization required for checkout',
        },
      }, 400);
    }

    // For guest checkout: user_id can be null, but we need it for orders table
    // Use kit's user_id if available, otherwise current user, otherwise null (guest)
    const finalUserId = kit.user_id || currentUser?.id || null;

    // Validate required fields before proceeding to Stripe
    const validationErrors = [];
    if (!kit_id) validationErrors.push('Kit ID required');
    if (!finalOrgId) validationErrors.push('Organization required');
    // Note: finalUserId can be null for guest checkouts

    if (validationErrors.length > 0) {
      console.error('Checkout validation failed:', {
        context: 'checkout_validation',
        errors: validationErrors,
        kitId: kit_id,
        orgId: finalOrgId,
        userId: finalUserId,
      });
      return createNextResponse({
        success: false,
        error: {
          code: 'CHECKOUT_VALIDATION_ERROR',
          message: validationErrors.join(', ')
        }
      }, 400);
    }

    console.log('CHECKOUT_VALIDATION_PASSED:', {
      userId: currentUser?.id,
      kitId: kit_id,
      finalOrgId,
      finalUserId,
      planType: plan_type,
    });

    // Create Stripe checkout session
    const sessionParams = {
      payment_method_types: ["card"],
      mode: "payment",
      success_url,
      cancel_url,
      metadata: {
        kit_id,
        plan_type: plan_type as string,
        user_id: finalUserId || '', // ✅ Use user ID or empty string for guest
        org_id: finalOrgId,         // ✅ Add org ID to metadata for webhooks
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${selectedPlan.name} - ${kit.title}`,
              description: selectedPlan.description,
              metadata: {
                kit_id,
                plan_type: plan_type as string
              }
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      customer_email: currentUser?.email,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await stripe.checkout.sessions.create(sessionParams as any);

    // Create order record with validated IDs
    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        org_id: finalOrgId,    // ✅ Always valid - validated above
        user_id: finalUserId,  // ✅ Can be null for guest checkouts
        kit_id: kit_id,
        status: "awaiting_payment",
        stripe_session_id: session.id,
        total_cents: selectedPlan.amount
      });

    if (orderError) {
      console.error('checkout_order_creation error:', orderError.message, {
        context: 'checkout_order_creation',
        kitId: kit_id,
        userId: currentUser?.id,
        sessionId: session.id,
      });
      
      return createNextResponse({
        success: false,
        error: {
          code: 'ORDER_CREATION_ERROR',
          message: 'Failed to create order',
        },
      }, 500);
    }

    if (currentUser) {
      console.log('CHECKOUT_INITIATED:', {
        userId: currentUser.id,
        kitId: kit_id,
        planType: plan_type,
        amount: selectedPlan.amount,
        sessionId: session.id,
      });
    }

    console.log('CHECKOUT_SESSION_CREATED:', {
      userId: currentUser?.id,
      kitId: kit_id,
      sessionId: session.id,
      planType: plan_type,
      amount: selectedPlan.amount,
    });

    const response = createApiResponse({
      url: session.url,
      session_id: session.id,
    }, 'Checkout session created successfully');

    return createNextResponse(response);

  } catch (error) {
    console.error('checkout_route error:', error);
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create checkout session',
      },
    }, 500);
  }
}