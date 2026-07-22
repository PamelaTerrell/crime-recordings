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
          error: "Please sign in before starting a membership.",
          requiresSignIn: true,
        },
        { status: 401 },
      );
    }

    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    if (!stripePriceId) {
      return NextResponse.json(
        {
          error: "The membership price is not configured.",
        },
        { status: 500 },
      );
    }

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select(
        `
          stripe_customer_id,
          status,
          current_period_end
        `,
      )
      .eq("user_id", user.id)
      .in("status", ["trialing", "active"])
      .order("current_period_end", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingSubscription) {
      return NextResponse.json(
        {
          error: "You already have an active membership.",
          alreadySubscribed: true,
        },
        { status: 409 },
      );
    }

    const { data: previousSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        payment_method_types: ["card"],

        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],

        success_url: `${siteUrl}/account?checkout=success`,
        cancel_url: `${siteUrl}/membership?checkout=canceled`,

        customer:
          previousSubscription?.stripe_customer_id ??
          undefined,

        customer_email:
          previousSubscription?.stripe_customer_id
            ? undefined
            : user.email,

        client_reference_id: user.id,

        metadata: {
          user_id: user.id,
        },

        subscription_data: {
          metadata: {
            user_id: user.id,
          },
        },

        allow_promotion_codes: true,
      });

    if (!checkoutSession.url) {
      return NextResponse.json(
        {
          error: "Stripe did not return a checkout URL.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    console.error(
      "Unable to create Stripe Checkout Session:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout could not be started.",
      },
      { status: 500 },
    );
  }
}