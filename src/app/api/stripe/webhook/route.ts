import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SUPPORTED_STATUSES = new Set([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

function unixTimestampToIso(
  timestamp: number | null | undefined,
) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

function getStripeId(
  value: string | { id: string } | null,
) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
) {
  const userId =
    subscription.metadata.user_id ||
    fallbackUserId ||
    null;

  if (!userId) {
    throw new Error(
      `Subscription ${subscription.id} is missing its Supabase user ID.`,
    );
  }

  if (!SUPPORTED_STATUSES.has(subscription.status)) {
    throw new Error(
      `Unsupported Stripe subscription status: ${subscription.status}`,
    );
  }

  /*
   * Newer Stripe API versions store billing-period dates
   * on each subscription item rather than at the top level.
   */
  const primaryItem = subscription.items.data[0];

  const currentPeriodStart =
    primaryItem?.current_period_start ?? null;

  const currentPeriodEnd =
    primaryItem?.current_period_end ?? null;

  const stripePriceId =
    primaryItem?.price?.id ?? null;

  const stripeCustomerId = getStripeId(
    subscription.customer,
  );

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: stripePriceId,
        status: subscription.status,
        current_period_start:
          unixTimestampToIso(currentPeriodStart),
        current_period_end:
          unixTimestampToIso(currentPeriodEnd),
        cancel_at_period_end:
          subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "stripe_subscription_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to save subscription: ${error.message}`,
    );
  }
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is not configured.",
      },
      { status: 500 },
    );
  }

  const signature = request.headers.get(
    "stripe-signature",
  );

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error,
    );

    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        if (
          session.mode !== "subscription" ||
          !session.subscription
        ) {
          break;
        }

        const subscriptionId = getStripeId(
          session.subscription,
        );

        if (!subscriptionId) {
          throw new Error(
            "Checkout completed without a subscription ID.",
          );
        }

        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId,
          );

        await syncSubscription(
          subscription,
          session.client_reference_id ??
            session.metadata?.user_id ??
            null,
        );

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const subscription =
          event.data.object as Stripe.Subscription;

        await syncSubscription(subscription);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      `Unable to process Stripe event ${event.type}:`,
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}