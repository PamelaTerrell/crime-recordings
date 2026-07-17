import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "My Account",
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: role }, { data: subscription }] =
    await Promise.all([
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
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

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
            <strong>{user.email ?? "Not available"}</strong>
          </div>

          <div>
            <span>Account role</span>
            <strong>{role?.role ?? "member"}</strong>
          </div>

          <div>
            <span>Membership</span>
            <strong>{subscription?.status ?? "No subscription yet"}</strong>
          </div>
        </div>

        <p className="account-note">
          The complete member archive and listening dashboard will appear here
          as Crime Recordings develops.
        </p>

        <div className="account-actions">
  {(role?.role === "admin" || role?.role === "editor") && (
    <Link href="/admin" className="admin-primary-link">
      Open admin dashboard
    </Link>
  )}

  <Link href="/" className="secondary-button">
    Return home
  </Link>

  <form action={signOut}>
    <button className="account-signout" type="submit">
      Sign out
    </button>
  </form>
</div>
      </section>
    </main>
  );
}