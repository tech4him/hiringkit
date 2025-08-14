import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/client";
import { validateRequestBody, createApiResponse, createNextResponse, notFoundResponse } from "@/lib/validation/helpers";
import { CheckoutRequestSchema } from "@/lib/validation/schemas";
import { logError, logUserAction } from "@/lib/logger";
import { safeGetCurrentUser, getOrganizationId } from "@/lib/auth/helpers";
import { env } from "@/lib/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia"
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validationResult = await validateRequestBody(request, CheckoutRequestSchema);
    if (!validationResult.success) {
      return createNextResponse(validationResult.error, 400);
    }

    const { kit_id, plan_type, success_url, cancel_url } = validationResult.data;

    logUserAction('CHECKOUT_SESSION_REQUEST', undefined, {
      kitId: kit_id,
      planType: plan_type,
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
      logError(new Error('Kit not found or access denied'), {
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

    const selectedPlan = pricing[plan_type];

    // Get organization ID properly
    const orgId = await getOrganizationId(request, currentUser);
    if (!orgId && !currentUser) {
      // For guest checkout, create a temporary organization
      const { data: guestOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: "Guest Checkout",
        })
        .select()
        .single();

      if (orgError) {
        logError(new Error(orgError.message), {
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
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url,
      cancel_url,
      metadata: {
        kit_id,
        plan_type,
        user_id: kit.user_id || currentUser?.id || 'guest',
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
                plan_type
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
    });

    // Create order record
    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        org_id: orgId || kit.org_id,
        user_id: kit.user_id || currentUser?.id,
        kit_id: kit_id,
        status: "awaiting_payment",
        stripe_session_id: session.id,
        total_cents: selectedPlan.amount
      });

    if (orderError) {
      logError(new Error(orderError.message), {
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
      logUserAction('CHECKOUT_INITIATED', currentUser.id, {
        kitId: kit_id,
        planType: plan_type,
        amount: selectedPlan.amount,
        sessionId: session.id,
      });
    }

    logUserAction('CHECKOUT_SESSION_CREATED', currentUser?.id, {
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
    logError(error as Error, {
      context: 'checkout_route',
      path: request.nextUrl.pathname,
    });
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create checkout session',
      },
    }, 500);
  }
}