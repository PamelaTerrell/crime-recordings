import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
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
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRecord } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleRecord?.role;

  if (role !== "admin" && role !== "editor") {
    redirect("/account");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link href="/admin" className="admin-brand">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={220}
            height={147}
            priority
            className="admin-logo"
          />
        </Link>

        <nav className="admin-nav" aria-label="Administration">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/cases/new">Create Case</Link>
          <Link href="/account">My Account</Link>
          <Link href="/">View Site</Link>
        </nav>
      </header>

      <div className="admin-content">{children}</div>
    </main>
  );
}