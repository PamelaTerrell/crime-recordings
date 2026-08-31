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

type CheckoutAttemptStatus =
  | "creating"
  | "open"
  | "completed"
  | "expired";

type CheckoutAttempt = {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  status: CheckoutAttemptStatus;
};

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

async function loadCheckoutAttempt(
  attemptId: string,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("checkout_attempts")
    .select(
      "id,user_id,stripe_checkout_session_id,status",
    )
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to load the checkout attempt.",
      { cause: error },
    );
  }

  return data as CheckoutAttempt | null;
}

async function reconcileCheckoutAttempt(
  session: Stripe.Checkout.Session,
  targetStatus: "completed" | "expired",
) {
  const attemptId =
    session.metadata?.checkout_attempt_id?.trim();
  const userId = session.metadata?.user_id?.trim();

  if (!attemptId || !userId) {
    return;
  }

  const attempt = await loadCheckoutAttempt(
    attemptId,
    userId,
  );

  if (!attempt) {
    return;
  }

  if (
    (targetStatus === "completed" &&
      session.status !== "complete") ||
    (targetStatus === "expired" &&
      session.status !== "expired")
  ) {
    throw new Error(
      "Checkout Session state does not match its event.",
    );
  }

  if (
    attempt.stripe_checkout_session_id &&
    attempt.stripe_checkout_session_id !== session.id
  ) {
    return;
  }

  if (
    !attempt.stripe_checkout_session_id &&
    session.client_reference_id !== userId
  ) {
    return;
  }

  if (targetStatus === "expired") {
    if (
      attempt.status === "completed" ||
      attempt.status === "expired"
    ) {
      return;
    }

    if (
      attempt.status !== "creating" &&
      attempt.status !== "open"
    ) {
      return;
    }
  } else if (attempt.status === "completed") {
    return;
  }

  let updateQuery = supabaseAdmin
    .from("checkout_attempts")
    .update({
      stripe_checkout_session_id: session.id,
      status: targetStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id)
    .eq("user_id", attempt.user_id)
    .eq("status", attempt.status);

  updateQuery = attempt.stripe_checkout_session_id
    ? updateQuery.eq(
        "stripe_checkout_session_id",
        session.id,
      )
    : updateQuery.is("stripe_checkout_session_id", null);

  const { data, error } = await updateQuery
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to reconcile the checkout attempt.",
      { cause: error },
    );
  }

  if (data) {
    return;
  }

  const currentAttempt = await loadCheckoutAttempt(
    attemptId,
    userId,
  );

  const sessionMatches =
    currentAttempt?.stripe_checkout_session_id === session.id;

  if (
    sessionMatches &&
    (currentAttempt.status === targetStatus ||
      (targetStatus === "expired" &&
        currentAttempt.status === "completed"))
  ) {
    return;
  }

  throw new Error(
    "Checkout attempt changed during reconciliation.",
  );
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

        await reconcileCheckoutAttempt(
          session,
          "completed",
        );

        break;
      }

      case "checkout.session.expired": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        await reconcileCheckoutAttempt(
          session,
          "expired",
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
