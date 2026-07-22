import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Please sign in to manage your membership.",
          requiresSignIn: true,
        },
        { status: 401 },
      );
    }

    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .select(
          `
            stripe_customer_id,
            stripe_subscription_id,
            status
          `,
        )
        .eq("user_id", user.id)
        .not("stripe_customer_id", "is", null)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Unable to load Stripe customer information:",
        subscriptionError,
      );

      return NextResponse.json(
        {
          error:
            "Your billing information could not be loaded.",
        },
        { status: 500 },
      );
    }

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No Stripe membership account was found for this user.",
          noMembership: true,
        },
        { status: 404 },
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${siteUrl}/account`,
      });

    return NextResponse.json({
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error(
      "Unable to create Stripe portal session:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The billing portal could not be opened.",
      },
      { status: 500 },
    );
  }
}