import type { Metadata } from "next";
import Link from "next/link";
import CheckoutButton from "./checkout-button";

export const metadata: Metadata = {
  title: "Membership | Crime Recordings",
  description:
    "Join Crime Recordings for full access to members-only case audio, video, interviews, interrogations, and public-record media.",
  alternates: {
    canonical: "/membership",
  },
};

const MEMBERSHIP_FEATURES = [
  "Full members-only case recordings",
  "Extended interviews and interrogations",
  "Complete audio and video archives",
  "New case material as it is published",
  "Secure streaming from the Crime Recordings archive",
];

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-[#080b0f] text-[#f4f1e9]">
      <header className="flex min-h-24 items-center justify-between gap-6 border-b border-white/10 px-5 py-5 md:px-10 lg:px-16">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-tight"
        >
          Crime Recordings
        </Link>

        <nav className="flex items-center gap-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
          <Link
            href="/cases"
            className="transition hover:text-[#e1c58f]"
          >
            Cases
          </Link>

          <Link
            href="/login"
            className="transition hover:text-[#e1c58f]"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="px-5 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:gap-24">
          <div>
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
              Crime Recordings membership
            </p>

            <h1 className="m-0 max-w-5xl font-serif text-[clamp(4rem,9vw,8rem)] font-medium leading-[0.9] tracking-[-0.055em]">
              Go beyond the public excerpts.
            </h1>

            <p className="mt-8 max-w-3xl text-lg leading-9 text-[#b8bcc2] md:text-xl">
              Access complete members-only recordings and explore
              the documented media behind each case.
            </p>

            <div className="mt-14 border-t border-white/10">
              {MEMBERSHIP_FEATURES.map((feature, index) => (
                <div
                  key={feature}
                  className="grid grid-cols-[45px_minmax(0,1fr)] gap-5 border-b border-white/10 py-5"
                >
                  <span className="font-serif text-xl text-[#c8a66a]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <p className="m-0 text-base leading-7 text-[#d8d9dc]">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="border border-[#c8a66a]/40 bg-[#10151b] p-7 md:p-9 lg:sticky lg:top-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
              Introductory membership
            </p>

            <div className="mt-7 flex items-end gap-3">
              <span className="font-serif text-7xl leading-none text-[#f4f1e9]">
                $2.99
              </span>

              <span className="pb-2 text-sm uppercase tracking-[0.12em] text-[#a8adb5]">
                per month
              </span>
            </div>

            <p className="mt-7 text-base leading-8 text-[#a8adb5]">
              Membership renews monthly until canceled. Your access
              continues while your subscription remains active.
            </p>

            <div className="mt-8">
              <CheckoutButton />
            </div>

            <p className="mt-6 text-xs leading-6 text-[#747b84]">
              Secure checkout and recurring billing are processed
              through Stripe.
            </p>
          </aside>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-5 border-t border-white/10 px-5 py-10 text-sm text-[#747b84] md:flex-row md:px-10 lg:px-16">
        <p className="m-0">
          Crime Recordings · Public-record documentary archive
        </p>

        <Link
          href="/cases"
          className="text-[#e1c58f] transition hover:text-[#f4f1e9]"
        >
          Browse cases
        </Link>
      </footer>
    </main>
  );
}