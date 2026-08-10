import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    default: "Administration | Crime Recordings",
    template: "%s | Crime Recordings Admin",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    console.error("Unable to load admin role:", roleError);
    redirect("/account");
  }

  const role = roleRecord?.role;

  if (!role || !["admin", "editor"].includes(role)) {
    redirect("/account");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-glow" />

        <div className="admin-header-inner">
          <Link
            href="/admin"
            className="admin-brand"
            aria-label="Crime Recordings administration dashboard"
          >
            <div className="admin-brand-mark" aria-hidden="true">
              <span className="admin-brand-c">C</span>
              <span className="admin-brand-r">R</span>
            </div>

            <div className="admin-brand-copy">
              <span className="admin-brand-name">Crime Recordings</span>
              <span className="admin-brand-label">Control Room</span>
            </div>
          </Link>

          <div className="admin-account">
            <div className="admin-account-meta">
              <span className="admin-account-role">
                {role === "admin" ? "Administrator" : "Editor"}
              </span>

              {user.email && (
                <span className="admin-account-email">{user.email}</span>
              )}
            </div>

            <span
              className="admin-status-dot"
              title="Authenticated"
              aria-label="Authenticated"
            />
          </div>
        </div>

        <nav className="admin-nav" aria-label="Administration">
          <Link href="/admin">Dashboard</Link>
          
          <Link href="/admin/cases/new" className="admin-nav-primary">
            + Create Case
          </Link>
          <Link href="/account">My Account</Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-view-site"
          >
            View Site ↗
          </Link>
        </nav>
      </header>

      <div className="admin-content">{children}</div>

      <footer className="admin-footer">
        <span>Crime Recordings Administration</span>
        <span className="admin-footer-divider">•</span>
        <span>Private workspace</span>
      </footer>
    </main>
  );
}