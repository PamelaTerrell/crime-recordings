import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MEMBER_ACCESS_STATUSES = new Set(["trialing", "active"]);
const NON_TERMINAL_STRIPE_STATUSES = new Set([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "paused",
]);

type SubscriptionHistoryRow = {
  stripe_customer_id: string | null;
  status: string;
  current_period_end: string | null;
};

type CheckoutAttempt = {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  status: "creating" | "open";
};

function subscriptionHasAccess(
  status: string,
  currentPeriodEnd: string | null,
) {
  if (!MEMBER_ACCESS_STATUSES.has(status)) return false;
  if (!currentPeriodEnd) return true;

  const periodEnd = new Date(currentPeriodEnd);
  if (Number.isNaN(periodEnd.getTime())) return false;

  return periodEnd.getTime() > Date.now();
}

function isNonTerminalStripeSubscription(status: string) {
  return NON_TERMINAL_STRIPE_STATUSES.has(status);
}

function alreadySubscribedResponse() {
  return NextResponse.json(
    {
      error: "You already have an active membership.",
      alreadySubscribed: true,
    },
    { status: 409 },
  );
}

function getSubscriptionId(
  subscription: string | { id: string } | null,
) {
  if (typeof subscription === "string") return subscription;
  return subscription?.id ?? null;
}

async function findCanonicalStripeCustomer(
  customerIds: string[],
) {
  for (const customerId of customerIds) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) return customerId;
  }

  return null;
}

async function customerHasNonTerminalSubscription(
  customerId: string,
) {
  for await (const subscription of stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  })) {
    if (isNonTerminalStripeSubscription(subscription.status)) {
      return true;
    }
  }

  return false;
}

async function checkoutSessionHasNonTerminalSubscription(
  stripeCheckoutSessionId: string,
) {
  const checkoutSession =
    await stripe.checkout.sessions.retrieve(
      stripeCheckoutSessionId,
    );
  const subscriptionId = getSubscriptionId(
    checkoutSession.subscription,
  );

  if (!subscriptionId) {
    throw new Error(
      "Completed Checkout Session has no subscription.",
    );
  }

  const subscription =
    await stripe.subscriptions.retrieve(subscriptionId);

  return isNonTerminalStripeSubscription(subscription.status);
}

async function rejectCurrentCompletedAttempt(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("checkout_attempts")
    .select("stripe_checkout_session_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to inspect completed checkout attempts.",
      { cause: error },
    );
  }

  if (!data?.stripe_checkout_session_id) return false;

  return checkoutSessionHasNonTerminalSubscription(
    data.stripe_checkout_session_id,
  );
}

async function loadLiveCheckoutAttempt(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("checkout_attempts")
    .select("id,user_id,stripe_checkout_session_id,status")
    .eq("user_id", userId)
    .in("status", ["creating", "open"])
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to load the live checkout attempt.",
      { cause: error },
    );
  }

  return data as CheckoutAttempt | null;
}

async function claimCheckoutAttempt(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("checkout_attempts")
    .insert({ user_id: userId, status: "creating" })
    .select("id,user_id,stripe_checkout_session_id,status")
    .single();

  if (!error && data) return data as CheckoutAttempt;

  if (error?.code !== "23505") {
    throw new Error(
      "Unable to claim a checkout attempt.",
      { cause: error },
    );
  }

  return loadLiveCheckoutAttempt(userId);
}

async function transitionOpenAttempt(
  attempt: CheckoutAttempt,
  status: "completed" | "expired",
) {
  const { data, error } = await supabaseAdmin
    .from("checkout_attempts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", attempt.id)
    .eq("user_id", attempt.user_id)
    .eq("status", "open")
    .eq(
      "stripe_checkout_session_id",
      attempt.stripe_checkout_session_id,
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to reconcile a checkout attempt.",
      { cause: error },
    );
  }

  return data !== null;
}

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
        { error: "The membership price is not configured." },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `
          stripe_customer_id,
          status,
          current_period_end,
          created_at
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        "Unable to verify the current subscription state.",
        { cause: error },
      );
    }

    const history = (data ?? []) as SubscriptionHistoryRow[];

    if (
      history.some((subscription) =>
        subscriptionHasAccess(
          subscription.status,
          subscription.current_period_end,
        ),
      )
    ) {
      return alreadySubscribedResponse();
    }

    const historicalCustomerIds = [
      ...new Set(
        history.flatMap((subscription) =>
          subscription.stripe_customer_id
            ? [subscription.stripe_customer_id]
            : [],
        ),
      ),
    ];
    const canonicalCustomerId =
      await findCanonicalStripeCustomer(historicalCustomerIds);

    if (
      canonicalCustomerId &&
      (await customerHasNonTerminalSubscription(
        canonicalCustomerId,
      ))
    ) {
      return alreadySubscribedResponse();
    }

    if (await rejectCurrentCompletedAttempt(user.id)) {
      return alreadySubscribedResponse();
    }

    for (let claimNumber = 0; claimNumber < 5; claimNumber += 1) {
      const attempt = await claimCheckoutAttempt(user.id);
      if (!attempt) continue;

      if (attempt.status === "open") {
        if (!attempt.stripe_checkout_session_id) {
          throw new Error(
            "Open checkout attempt has no Checkout Session ID.",
          );
        }

        const existingSession =
          await stripe.checkout.sessions.retrieve(
            attempt.stripe_checkout_session_id,
          );

        if (existingSession.status === "open" && existingSession.url) {
          return NextResponse.json({
            checkoutUrl: existingSession.url,
          });
        }

        if (existingSession.status === "expired") {
          await transitionOpenAttempt(attempt, "expired");
          continue;
        }

        if (existingSession.status === "complete") {
          const subscriptionId = getSubscriptionId(
            existingSession.subscription,
          );
          if (!subscriptionId) {
            throw new Error(
              "Completed Checkout Session has no subscription.",
            );
          }

          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const isCurrent = isNonTerminalStripeSubscription(
            subscription.status,
          );

          await transitionOpenAttempt(attempt, "completed");

          if (isCurrent) return alreadySubscribedResponse();
          continue;
        }

        throw new Error("Checkout Session has an unusable state.");
      }

      const checkoutSession =
        await stripe.checkout.sessions.create(
          {
            mode: "subscription",
            line_items: [{ price: stripePriceId, quantity: 1 }],
            success_url: `${siteUrl}/account?checkout=success`,
            cancel_url: `${siteUrl}/membership?checkout=canceled`,
            customer: canonicalCustomerId ?? undefined,
            customer_email: canonicalCustomerId
              ? undefined
              : user.email,
            client_reference_id: user.id,
            metadata: {
              user_id: user.id,
              checkout_attempt_id: attempt.id,
            },
            subscription_data: {
              metadata: { user_id: user.id },
            },
            allow_promotion_codes: true,
          },
          {
            idempotencyKey:
              `crime-recordings:checkout-session:v1:${attempt.id}`,
          },
        );

      if (!checkoutSession.id || !checkoutSession.url) {
        throw new Error(
          "Stripe returned an unusable Checkout Session.",
        );
      }

      const { data: updatedAttempt, error: updateError } =
        await supabaseAdmin
          .from("checkout_attempts")
          .update({
            stripe_checkout_session_id: checkoutSession.id,
            status: "open",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attempt.id)
          .eq("user_id", user.id)
          .eq("status", "creating")
          .is("stripe_checkout_session_id", null)
          .select("id")
          .maybeSingle();

      if (updateError) {
        throw new Error(
          "Unable to persist the Checkout Session.",
          { cause: updateError },
        );
      }

      if (!updatedAttempt) {
        const convergedAttempt =
          await loadLiveCheckoutAttempt(user.id);

        if (
          convergedAttempt?.id !== attempt.id ||
          convergedAttempt.status !== "open" ||
          convergedAttempt.stripe_checkout_session_id !==
            checkoutSession.id
        ) {
          throw new Error(
            "Checkout attempt did not converge after creation.",
          );
        }
      }

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    }

    throw new Error(
      "Checkout attempt could not reach a stable state.",
    );
  } catch (error) {
    console.error(
      "Unable to create Stripe Checkout Session:",
      error,
    );

    return NextResponse.json(
      { error: "Checkout could not be started. Please try again." },
      { status: 500 },
    );
  }
}
