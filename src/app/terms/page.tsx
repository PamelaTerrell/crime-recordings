import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Crime Recordings",
  description:
    "Review the terms governing access to Crime Recordings, memberships, subscriptions, and archive content.",
  alternates: {
    canonical: "/terms",
  },
};

const EFFECTIVE_DATE = "July 22, 2026";
const SUPPORT_EMAIL = "support@crimerecordings.com";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#080b0f] text-[#f4f1e9]">
      <header className="flex min-h-24 items-center justify-between gap-6 border-b border-white/10 px-5 py-5 md:px-10 lg:px-16">
        <Link href="/" aria-label="Crime Recordings home">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={210}
            height={140}
            priority
            className="h-auto w-40 md:w-52"
          />
        </Link>

        <nav
          className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]"
          aria-label="Terms page navigation"
        >
          <Link
            href="/cases"
            className="transition hover:text-[#e1c58f]"
          >
            Case Archive
          </Link>

          <Link
            href="/membership"
            className="transition hover:text-[#e1c58f]"
          >
            Membership
          </Link>

          <Link
            href="/account"
            className="transition hover:text-[#e1c58f]"
          >
            My Account
          </Link>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
            Website and membership agreement
          </p>

          <h1 className="m-0 max-w-5xl font-serif text-[clamp(4rem,10vw,9rem)] font-medium leading-[0.88] tracking-[-0.055em]">
            Terms of Service
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-9 text-[#b8bcc2] md:text-xl">
            These Terms of Service govern your access to and use
            of Crime Recordings, including public pages,
            accounts, memberships, audio, video, case
            information, and related services.
          </p>

          <p className="mt-6 text-sm text-[#747b84]">
            Effective date: {EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      <section className="px-5 py-16 md:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-24">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
              Agreement sections
            </p>

            <nav
              className="mt-6 grid gap-3 border-l border-white/10 pl-5 text-sm leading-6 text-[#a8adb5]"
              aria-label="Terms of service sections"
            >
              <a href="#acceptance">Acceptance</a>
              <a href="#eligibility">Eligibility</a>
              <a href="#accounts">Accounts</a>
              <a href="#memberships">Memberships and billing</a>
              <a href="#cancellation">Cancellation</a>
              <a href="#refunds">Refunds</a>
              <a href="#content">Archive content</a>
              <a href="#license">Permitted use</a>
              <a href="#prohibited-use">Prohibited use</a>
              <a href="#sensitive-content">Sensitive content</a>
              <a href="#accuracy">Accuracy and context</a>
              <a href="#availability">Availability</a>
              <a href="#third-parties">Third-party services</a>
              <a href="#disclaimer">Disclaimers</a>
              <a href="#liability">Limitation of liability</a>
              <a href="#indemnification">Indemnification</a>
              <a href="#termination">Termination</a>
              <a href="#governing-law">Governing law</a>
              <a href="#changes">Changes</a>
              <a href="#contact">Contact</a>
            </nav>
          </aside>

          <article className="max-w-4xl space-y-16">
            <section id="acceptance">
              <SectionHeading
                number="01"
                title="Acceptance of these terms"
              />

              <PolicyText>
                By accessing or using Crime Recordings, creating
                an account, or purchasing a membership, you agree
                to these Terms of Service and our Privacy Policy.
              </PolicyText>

              <PolicyText>
                If you do not agree to these terms, do not use the
                website, create an account, or purchase a
                membership.
              </PolicyText>
            </section>

            <section id="eligibility">
              <SectionHeading
                number="02"
                title="Eligibility"
              />

              <PolicyText>
                You must be legally capable of entering into a
                binding agreement to create an account or purchase
                a membership.
              </PolicyText>

              <PolicyText>
                Crime Recordings contains mature subject matter,
                including criminal investigations, violence,
                death, disturbing statements, and other sensitive
                material. The service is intended for adults and
                appropriately supervised users.
              </PolicyText>
            </section>

            <section id="accounts">
              <SectionHeading
                number="03"
                title="Accounts and account security"
              />

              <PolicyText>
                You are responsible for maintaining the security
                of your account and the email account used to sign
                in. You agree to provide accurate information and
                to notify us if you believe your account has been
                accessed without authorization.
              </PolicyText>

              <PolicyList
                items={[
                  "Do not share your account or sign-in link with another person.",
                  "Do not permit another person to use your membership.",
                  "Do not attempt to access another user’s account.",
                  "Keep your email account and devices reasonably secure.",
                  "Notify us promptly about suspected unauthorized access.",
                ]}
              />

              <PolicyText>
                We may suspend access while investigating suspected
                fraud, misuse, unauthorized sharing, or security
                concerns.
              </PolicyText>
            </section>

            <section id="memberships">
              <SectionHeading
                number="04"
                title="Memberships and recurring billing"
              />

              <PolicyText>
                Crime Recordings may offer paid memberships that
                provide access to designated members-only audio,
                video, case files, and other archive material.
              </PolicyText>

              <PolicyText>
                The current introductory membership price is
                displayed on the membership and checkout pages.
                Unless otherwise stated, memberships renew
                automatically each month until canceled.
              </PolicyText>

              <PolicyText>
                By subscribing, you authorize Stripe to charge
                your selected payment method for the recurring
                membership price and any applicable taxes at the
                beginning of each billing period until
                cancellation.
              </PolicyText>

              <PolicyText>
                We may change membership prices or features for
                future billing periods. When required, we will
                provide advance notice before a price change takes
                effect.
              </PolicyText>
            </section>

            <section id="cancellation">
              <SectionHeading
                number="05"
                title="Cancellation"
              />

              <PolicyText>
                You may cancel your membership through the Stripe
                customer portal available from your Crime
                Recordings account, when that feature is
                available, or by contacting customer support.
              </PolicyText>

              <PolicyText>
                Unless otherwise stated during cancellation,
                cancellation takes effect at the end of the
                current paid billing period. You will ordinarily
                retain membership access until that date.
              </PolicyText>

              <PolicyText>
                Deleting your Crime Recordings account does not
                necessarily cancel a Stripe subscription. You
                should cancel through the billing portal or
                contact support before requesting account
                deletion.
              </PolicyText>
            </section>

            <section id="refunds">
              <SectionHeading
                number="06"
                title="Refunds"
              />

              <PolicyText>
                Membership charges are generally nonrefundable
                once a billing period begins, except where
                required by law or when we determine that a refund
                is appropriate because of duplicate billing, a
                technical error, or another exceptional
                circumstance.
              </PolicyText>

              <PolicyText>
                Canceling prevents future renewals but does not
                automatically refund the current billing period.
                Refund requests may be sent to customer support
                and will be reviewed individually.
              </PolicyText>
            </section>

            <section id="content">
              <SectionHeading
                number="07"
                title="Archive and documentary content"
              />

              <PolicyText>
                Crime Recordings presents documentary,
                educational, and informational material concerning
                criminal cases. Material may include recordings,
                court-related information, law-enforcement
                records, official statements, emergency calls,
                interviews, interrogations, dispatch recordings,
                body-camera footage, surveillance footage, and
                related context.
              </PolicyText>

              <PolicyText>
                The inclusion of a person, allegation, arrest,
                charge, statement, or recording does not by itself
                establish guilt. When applicable, individuals are
                presumed innocent unless and until convicted in a
                court of law.
              </PolicyText>

              <PolicyText>
                Crime Recordings is not a law-enforcement agency,
                court, law firm, news organization, or government
                records custodian.
              </PolicyText>
            </section>

            <section id="license">
              <SectionHeading
                number="08"
                title="Limited permission to use the service"
              />

              <PolicyText>
                Subject to these terms, Crime Recordings grants you
                a limited, personal, revocable, nonexclusive, and
                nontransferable right to access the website and
                stream content made available to you.
              </PolicyText>

              <PolicyText>
                Membership provides access, not ownership. No
                intellectual-property rights are transferred to
                you.
              </PolicyText>
            </section>

            <section id="prohibited-use">
              <SectionHeading
                number="09"
                title="Prohibited use"
              />

              <PolicyText>
                You may not:
              </PolicyText>

              <PolicyList
                items={[
                  "Copy, download, record, reproduce, republish, sell, sublicense, or redistribute archive recordings except where expressly permitted.",
                  "Share members-only links, signed media URLs, account access, or downloaded material.",
                  "Circumvent access controls, authentication, paywalls, signed URLs, or technical restrictions.",
                  "Scrape, crawl, harvest, index, or systematically extract site content without written permission.",
                  "Use the service to harass, threaten, stalk, intimidate, identify, or target victims, witnesses, family members, officials, or other individuals.",
                  "Misrepresent archive material or present edited portions in a materially misleading way.",
                  "Upload malicious code, interfere with the service, probe for vulnerabilities, or attempt unauthorized access.",
                  "Use content for unlawful discrimination, fraud, identity theft, doxxing, retaliation, or other unlawful conduct.",
                  "Use Crime Recordings branding, logos, or content in a way that suggests endorsement or affiliation without permission.",
                ]}
              />
            </section>

            <section id="sensitive-content">
              <SectionHeading
                number="10"
                title="Sensitive and disturbing content"
              />

              <PolicyText>
                Some recordings and case information may be
                graphic, upsetting, offensive, emotionally
                difficult, or unsuitable for certain audiences.
                Content warnings may be provided when practical,
                but we cannot guarantee that every disturbing
                detail will be identified in advance.
              </PolicyText>

              <PolicyText>
                You are responsible for deciding whether the
                service is appropriate for you and for supervising
                access by minors or other vulnerable individuals.
              </PolicyText>
            </section>

            <section id="accuracy">
              <SectionHeading
                number="11"
                title="Accuracy, completeness, and context"
              />

              <PolicyText>
                We aim to organize material carefully and provide
                useful context, but public records and source
                material may contain errors, omissions,
                inconsistencies, disputed claims, redactions, or
                incomplete information.
              </PolicyText>

              <PolicyText>
                Crime Recordings does not guarantee that every
                recording, description, date, transcript,
                identification, summary, or case detail is
                complete, current, or error-free.
              </PolicyText>

              <PolicyText>
                Reasonable correction or review requests may be
                submitted through customer support. A request does
                not guarantee revision or removal.
              </PolicyText>
            </section>

            <section id="availability">
              <SectionHeading
                number="12"
                title="Availability and service changes"
              />

              <PolicyText>
                We may add, remove, edit, restrict, replace, or
                reorganize content and features at any time.
              </PolicyText>

              <PolicyText>
                Recordings may become temporarily or permanently
                unavailable because of technical problems, legal
                requests, source restrictions, storage issues,
                safety concerns, editorial review, or changes in
                our services.
              </PolicyText>

              <PolicyText>
                We do not guarantee uninterrupted access or that a
                particular case or recording will remain available
                for the entire term of a membership.
              </PolicyText>
            </section>

            <section id="third-parties">
              <SectionHeading
                number="13"
                title="Third-party services and links"
              />

              <PolicyText>
                Crime Recordings relies on third-party providers,
                including Stripe, Supabase, Vercel, Cloudflare,
                Google, and email-delivery providers.
              </PolicyText>

              <PolicyText>
                We may also link to government pages, courts,
                agencies, news reports, documents, or other
                third-party websites. We do not control and are
                not responsible for third-party content,
                availability, security, or privacy practices.
              </PolicyText>
            </section>

            <section id="disclaimer">
              <SectionHeading
                number="14"
                title="Disclaimers"
              />

              <PolicyText>
                Crime Recordings is provided on an “as is” and “as
                available” basis to the fullest extent permitted
                by law.
              </PolicyText>

              <PolicyText>
                We disclaim warranties of merchantability,
                fitness for a particular purpose,
                noninfringement, accuracy, availability, and
                uninterrupted or error-free operation.
              </PolicyText>

              <PolicyText>
                Content is provided for documentary,
                informational, and educational purposes. It is not
                legal advice, investigative advice, medical
                advice, mental-health advice, or professional
                advice of any kind.
              </PolicyText>
            </section>

            <section id="liability">
              <SectionHeading
                number="15"
                title="Limitation of liability"
              />

              <PolicyText>
                To the fullest extent permitted by law, Crime
                Recordings, Stabile USA, and their owners,
                operators, contractors, contributors, and service
                providers will not be liable for indirect,
                incidental, special, consequential, exemplary, or
                punitive damages, or for loss of data, profits,
                revenue, goodwill, or access arising from use of
                the service.
              </PolicyText>

              <PolicyText>
                To the fullest extent permitted by law, the total
                liability arising from or related to the service
                will not exceed the greater of the amount you paid
                to Crime Recordings during the six months before
                the event giving rise to the claim or fifty U.S.
                dollars.
              </PolicyText>

              <PolicyText>
                Some jurisdictions do not allow certain
                limitations, so portions of this section may not
                apply to you.
              </PolicyText>
            </section>

            <section id="indemnification">
              <SectionHeading
                number="16"
                title="Indemnification"
              />

              <PolicyText>
                To the extent permitted by law, you agree to
                defend, indemnify, and hold harmless Crime
                Recordings, Stabile USA, and their owners,
                operators, contractors, and service providers from
                claims, liabilities, losses, damages, and
                reasonable expenses arising from your unlawful use
                of the service, violation of these terms, or
                infringement of another person’s rights.
              </PolicyText>
            </section>

            <section id="termination">
              <SectionHeading
                number="17"
                title="Suspension and termination"
              />

              <PolicyText>
                We may suspend, restrict, or terminate an account
                or membership when we reasonably believe a user
                has violated these terms, shared access,
                attempted unauthorized copying, created a security
                risk, engaged in fraud, or used the service
                unlawfully.
              </PolicyText>

              <PolicyText>
                We may also discontinue the service or a portion of
                it. Provisions that by their nature should survive
                termination—including ownership, restrictions,
                disclaimers, liability limitations, and dispute
                provisions—will continue to apply.
              </PolicyText>
            </section>

            <section id="governing-law">
              <SectionHeading
                number="18"
                title="Governing law"
              />

              <PolicyText>
                These terms are governed by the laws of the State
                of Georgia, without regard to conflict-of-law
                principles, except where applicable law requires
                otherwise.
              </PolicyText>

              <PolicyText>
                Any dispute not subject to another legally
                required process will be brought in a court of
                competent jurisdiction located in Georgia, and
                the parties consent to that jurisdiction and
                venue.
              </PolicyText>
            </section>

            <section id="changes">
              <SectionHeading
                number="19"
                title="Changes to these terms"
              />

              <PolicyText>
                We may update these Terms of Service as the service
                develops, pricing changes, new features are added,
                or legal and operational requirements change.
              </PolicyText>

              <PolicyText>
                Updated terms will be posted on this page with a
                revised effective date. Continued use after the
                effective date of revised terms constitutes
                acceptance of those changes.
              </PolicyText>
            </section>

            <section id="contact">
              <SectionHeading
                number="20"
                title="Contact"
              />

              <PolicyText>
                Questions about these terms, billing,
                cancellation, account access, or archive material
                may be sent to:
              </PolicyText>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-6 inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
              >
                {SUPPORT_EMAIL}
              </a>

              <p className="mt-6 text-sm leading-7 text-[#747b84]">
                Crime Recordings is a Stabile USA project.
              </p>
            </section>
          </article>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-6 border-t border-white/10 px-5 py-10 text-sm text-[#747b84] md:flex-row md:items-center md:px-10 lg:px-16">
        <p className="m-0">
          © {new Date().getFullYear()} Crime Recordings — A
          Stabile USA Project
        </p>

        <nav className="flex flex-wrap gap-x-6 gap-y-3">
          <Link
            href="/"
            className="transition hover:text-[#e1c58f]"
          >
            Home
          </Link>

          <Link
            href="/cases"
            className="transition hover:text-[#e1c58f]"
          >
            Cases
          </Link>

          <Link
            href="/membership"
            className="transition hover:text-[#e1c58f]"
          >
            Membership
          </Link>

          <Link
            href="/privacy"
            className="transition hover:text-[#e1c58f]"
          >
            Privacy
          </Link>

          <Link href="/terms" className="text-[#e1c58f]">
            Terms
          </Link>
        </nav>
      </footer>
    </main>
  );
}

type SectionHeadingProps = {
  number: string;
  title: string;
};

function SectionHeading({
  number,
  title,
}: SectionHeadingProps) {
  return (
    <div className="border-t border-white/10 pt-8">
      <p className="m-0 font-serif text-2xl text-[#c8a66a]">
        {number}
      </p>

      <h2 className="mt-4 font-serif text-4xl font-medium leading-tight md:text-5xl">
        {title}
      </h2>
    </div>
  );
}

type PolicyTextProps = {
  children: React.ReactNode;
};

function PolicyText({ children }: PolicyTextProps) {
  return (
    <p className="mt-6 text-base leading-8 text-[#b8bcc2] md:text-lg md:leading-9">
      {children}
    </p>
  );
}

type PolicyListProps = {
  items: string[];
};

function PolicyList({ items }: PolicyListProps) {
  return (
    <ul className="mt-7 grid gap-4">
      {items.map((item) => (
        <li
          key={item}
          className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-base leading-8 text-[#b8bcc2]"
        >
          <span
            aria-hidden="true"
            className="pt-0.5 text-[#c8a66a]"
          >
            →
          </span>

          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}