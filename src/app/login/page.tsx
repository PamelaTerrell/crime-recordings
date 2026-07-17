import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Member Sign In",
  description:
    "Sign in securely to your Crime Recordings member account.",
};

export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-logo-link">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={260}
            height={173}
            priority
            className="auth-logo"
          />
        </Link>

        <p className="auth-eyebrow">Secure member access</p>

        <h1>Sign in to Crime Recordings</h1>

        <p className="auth-introduction">
          Enter your email address and we will send you a secure, single-use
          sign-in link. No password is required.
        </p>

        <LoginForm />

        <p className="auth-fine-print">
          By continuing, you agree to use the archive responsibly and in
          accordance with our future membership terms.
        </p>

        <Link href="/" className="auth-home-link">
          ← Return to the homepage
        </Link>
      </section>
    </main>
  );
}