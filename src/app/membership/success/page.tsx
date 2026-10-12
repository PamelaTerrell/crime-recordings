import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Welcome | Crime Recordings",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function MembershipSuccessPage({
  searchParams,
}: Props) {
  const { session_id: sessionId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let membershipConfirmed = false;
  let paymentProcessing = false;

  if (sessionId && /^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        sessionId,
        { expand: ["subscription"] },
      );

      const belongsToUser =
        session.client_reference_id === user.id &&
        session.metadata?.user_id === user.id;

      if (belongsToUser && session.mode === "subscription") {
        const subscription = session.subscription;

        const status =
          subscription && typeof subscription !== "string"
            ? subscription.status
            : null;

        membershipConfirmed =
          session.status === "complete" &&
          (status === "active" || status === "trialing");

        paymentProcessing =
          !membershipConfirmed &&
          session.status !== "expired";
      }
    } catch (error) {
      console.error(
        "Membership verification failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#080b0f] text-[#f4f1e9]">
      <header className="flex items-center justify-between gap-5 border-b border-white/10 px-5 py-7 md:px-10 lg:px-16">
        <Link href="/" className="font-serif text-2xl font-medium">
          Crime Recordings
        </Link>

        <Link href="/account" className="text-sm text-[#e1c58f]">
          My Account
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-2xl border border-[#c8a66a]/40 bg-[#10151b] p-8 text-center md:p-14">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#9ed6b0]">
            {membershipConfirmed
              ? "Membership confirmed"
              : paymentProcessing
                ? "Membership processing"
                : "Membership verification"}
          </p>

          <h1 className="mt-6 font-serif text-5xl font-medium leading-tight md:text-6xl">
            {membershipConfirmed
              ? "Welcome to Crime Recordings."
              : paymentProcessing
                ? "Your membership is being prepared."
                : "Let's check your membership."}
          </h1>

          <p className="mx-auto mt-7 max-w-lg text-base leading-8 text-[#b8bcc2]">
            {membershipConfirmed
              ? "Your membership is confirmed. Explore members-only recordings, interviews, and extended case material throughout the archive."
              : paymentProcessing
                ? "Stripe is still processing your subscription. Check your account for updates."
                : "We couldn't confirm an active membership from this checkout link. Review your current status in My Account."}
          </p>

          <Link
            href={membershipConfirmed ? "/cases" : "/account"}
            className="mt-10 inline-flex min-h-14 items-center justify-center bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111318] transition hover:bg-[#e1c58f]"
          >
            {membershipConfirmed
              ? "Explore the Case Archive →"
              : "Check My Account →"}
          </Link>

          <p className="mt-7 text-sm text-[#8b929b]">
            {membershipConfirmed
              ? "Manage your subscription anytime from My Account."
              : "If you recently completed payment, allow a moment for your account to update."}
          </p>
        </div>
      </section>
    </main>
  );
}
