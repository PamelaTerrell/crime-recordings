import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import ManageMembershipButton from "./manage-membership-button";

export const metadata = {
  title: "My Account",
};

function formatMembershipStatus(status: string | null | undefined) {
  if (!status) {
    return "No subscription yet";
  }

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: role },
    { data: subscription },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, created_at")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("subscriptions")
      .select(
        `
          status,
          current_period_end,
          cancel_at_period_end,
          stripe_customer_id
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  const membershipStatus = formatMembershipStatus(
    subscription?.status,
  );

  const periodEnd = formatDate(
    subscription?.current_period_end,
  );

  const canManageMembership =
    Boolean(subscription?.stripe_customer_id);

  return (
    <main className="account-page">
      <section className="account-card">
        <Link href="/">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={230}
            height={153}
            priority
            className="account-logo"
          />
        </Link>

        <p className="auth-eyebrow">Member account</p>

        <h1>
          Welcome
          {profile?.display_name
            ? `, ${profile.display_name}`
            : ""}
          .
        </h1>

        <div className="account-details">
          <div>
            <span>Email</span>
            <strong>
              {user.email ?? "Not available"}
            </strong>
          </div>

          <div>
            <span>Account role</span>
            <strong>{role?.role ?? "member"}</strong>
          </div>

          <div>
            <span>Membership</span>
            <strong>{membershipStatus}</strong>
          </div>

          {periodEnd ? (
            <div>
              <span>
                {subscription?.cancel_at_period_end
                  ? "Access ends"
                  : "Current period ends"}
              </span>

              <strong>{periodEnd}</strong>
            </div>
          ) : null}
        </div>

        {canManageMembership ? (
          <section className="mt-10 border border-white/10 bg-[#10151b] p-7 text-left md:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
              Billing and membership
            </p>

            <h2 className="mt-4 font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
              Manage your subscription
            </h2>

            <p className="mt-5 max-w-2xl leading-8 text-[#a8adb5]">
              Update your payment method, review invoices,
              or cancel your membership through Stripe&apos;s
              secure billing portal.
            </p>

            <div className="mt-7">
              <ManageMembershipButton />
            </div>
          </section>
        ) : (
          <section className="mt-10 border border-white/10 bg-[#10151b] p-7 text-left md:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
              Crime Recordings membership
            </p>

            <h2 className="mt-4 font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
              Unlock the complete archive
            </h2>

            <p className="mt-5 max-w-2xl leading-8 text-[#a8adb5]">
              Join for $2.99 per month to access
              members-only audio, video, interviews,
              interrogations, and extended case recordings.
            </p>

            <Link
              href="/membership"
              className="mt-7 inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
            >
              Become a member
            </Link>
          </section>
        )}

        <p className="account-note">
          The complete member archive and listening dashboard
          will appear here as Crime Recordings develops.
        </p>

        <div className="account-actions">
          {(role?.role === "admin" ||
            role?.role === "editor") && (
            <Link
              href="/admin"
              className="admin-primary-link"
            >
              Open admin dashboard
            </Link>
          )}

          <Link href="/" className="secondary-button">
            Return home
          </Link>

          <form action={signOut}>
            <button
              className="account-signout"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}