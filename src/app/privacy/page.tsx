import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Crime Recordings",
  description:
    "Learn how Crime Recordings collects, uses, stores, and protects information.",
  alternates: {
    canonical: "/privacy",
  },
};

const EFFECTIVE_DATE = "July 22, 2026";
const PRIVACY_EMAIL = "privacy@crimerecordings.com";

export default function PrivacyPage() {
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
          aria-label="Privacy page navigation"
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
            Privacy and information practices
          </p>

          <h1 className="m-0 max-w-5xl font-serif text-[clamp(4rem,10vw,9rem)] font-medium leading-[0.88] tracking-[-0.055em]">
            Privacy Policy
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-9 text-[#b8bcc2] md:text-xl">
            This policy explains how Crime Recordings collects,
            uses, shares, and protects information when you visit
            the website, create an account, purchase a membership,
            or use the archive.
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
              Policy sections
            </p>

            <nav
              className="mt-6 grid gap-3 border-l border-white/10 pl-5 text-sm leading-6 text-[#a8adb5]"
              aria-label="Privacy policy sections"
            >
              <a href="#information-we-collect">
                Information we collect
              </a>
              <a href="#how-we-use-information">
                How we use information
              </a>
              <a href="#payments">Payments</a>
              <a href="#analytics">Analytics and cookies</a>
              <a href="#service-providers">
                Service providers
              </a>
              <a href="#public-record-material">
                Public-record material
              </a>
              <a href="#data-retention">Data retention</a>
              <a href="#security">Security</a>
              <a href="#your-choices">Your choices</a>
              <a href="#children">Children&apos;s privacy</a>
              <a href="#changes">Policy changes</a>
              <a href="#contact">Contact us</a>
            </nav>
          </aside>

          <article className="max-w-4xl space-y-16">
            <section id="information-we-collect">
              <PolicyHeading
                number="01"
                title="Information we collect"
              />

              <PolicyText>
                We may collect information that you provide
                directly when you create an account, purchase a
                membership, contact us, or otherwise interact with
                Crime Recordings.
              </PolicyText>

              <PolicyList
                items={[
                  "Your email address and account identifier.",
                  "A display name or other profile information you choose to provide.",
                  "Membership status and subscription-related records.",
                  "Messages, questions, or requests you send to us.",
                  "Technical information such as browser type, device type, approximate location, pages visited, referring pages, and interaction data.",
                ]}
              />

              <PolicyText>
                We do not intentionally collect Social Security
                numbers, government identification numbers, or
                full payment-card numbers through the Crime
                Recordings website.
              </PolicyText>
            </section>

            <section id="how-we-use-information">
              <PolicyHeading
                number="02"
                title="How we use information"
              />

              <PolicyText>
                We may use collected information to:
              </PolicyText>

              <PolicyList
                items={[
                  "Create, authenticate, and maintain user accounts.",
                  "Provide access to public and members-only recordings.",
                  "Process and administer memberships.",
                  "Maintain account, billing, and subscription status.",
                  "Respond to questions, requests, and support needs.",
                  "Operate, secure, troubleshoot, and improve the website.",
                  "Understand how visitors use the archive.",
                  "Detect fraud, abuse, unauthorized access, or technical problems.",
                  "Comply with legal, accounting, tax, and regulatory obligations.",
                ]}
              />
            </section>

            <section id="payments">
              <PolicyHeading
                number="03"
                title="Payments and memberships"
              />

              <PolicyText>
                Membership payments are processed by Stripe. When
                you begin checkout, Stripe may collect information
                such as your name, email address, billing details,
                payment-method information, transaction amount,
                and information used for fraud prevention.
              </PolicyText>

              <PolicyText>
                Crime Recordings does not receive or store your
                complete credit- or debit-card number. We may
                receive limited payment and subscription
                information from Stripe, including a Stripe
                customer identifier, subscription identifier,
                payment status, billing-period dates, and
                cancellation status.
              </PolicyText>

              <PolicyText>
                Stripe processes information according to its own
                privacy policy and legal obligations.
              </PolicyText>
            </section>

            <section id="analytics">
              <PolicyHeading
                number="04"
                title="Analytics, cookies, and similar technology"
              />

              <PolicyText>
                Crime Recordings may use Google Analytics and
                Vercel Analytics to understand website traffic,
                page visits, general device and browser
                information, referral sources, and how visitors
                interact with the site.
              </PolicyText>

              <PolicyText>
                Analytics services may use cookies, local storage,
                pixels, or similar technologies. Cookies are small
                files or identifiers that help websites recognize
                a browser or device.
              </PolicyText>

              <PolicyText>
                You may be able to limit cookies through your
                browser settings, privacy controls, tracking
                protection, or browser extensions. Blocking
                certain cookies may affect some site features.
              </PolicyText>
            </section>

            <section id="service-providers">
              <PolicyHeading
                number="05"
                title="Service providers"
              />

              <PolicyText>
                We use third-party companies to operate portions
                of Crime Recordings. These providers may process
                information on our behalf when necessary to
                provide their services.
              </PolicyText>

              <div className="mt-7 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2">
                <ProviderCard
                  name="Supabase"
                  description="Account authentication, user profiles, membership records, and database services."
                />

                <ProviderCard
                  name="Stripe"
                  description="Membership checkout, subscription billing, fraud prevention, invoices, and customer billing management."
                />

                <ProviderCard
                  name="Vercel"
                  description="Website hosting, deployment, performance, security, and analytics."
                />

                <ProviderCard
                  name="Cloudflare R2"
                  description="Private storage and delivery of audio and video archive files."
                />

                <ProviderCard
                  name="Google Analytics"
                  description="Website usage measurement and traffic analytics."
                />

                <ProviderCard
                  name="Resend"
                  description="Delivery of authentication and transactional email messages."
                />
              </div>

              <PolicyText>
                We may also disclose information when reasonably
                necessary to comply with law, respond to valid
                legal process, protect the safety or rights of
                others, investigate abuse, or protect Crime
                Recordings and its users.
              </PolicyText>
            </section>

            <section id="public-record-material">
              <PolicyHeading
                number="06"
                title="Public-record and case material"
              />

              <PolicyText>
                Crime Recordings publishes documentary and
                informational material related to criminal cases,
                including recordings and information obtained
                from public agencies, official sources,
                court-related sources, or other lawful sources.
              </PolicyText>

              <PolicyText>
                Information contained in case records may concern
                victims, witnesses, accused persons, convicted
                persons, law-enforcement personnel, attorneys,
                public officials, or other people connected to a
                case. This material is distinct from information
                collected from website members and visitors.
              </PolicyText>

              <PolicyText>
                A person who believes that published material is
                inaccurate, unlawfully disclosed, improperly
                identified, or should be reviewed may contact us
                using the address at the end of this policy.
                Submitting a request does not guarantee removal,
                but we will review reasonable requests.
              </PolicyText>
            </section>

            <section id="data-retention">
              <PolicyHeading
                number="07"
                title="Data retention"
              />

              <PolicyText>
                We retain personal information for as long as
                reasonably necessary to provide accounts and
                memberships, maintain business and transaction
                records, resolve disputes, enforce agreements,
                prevent fraud, and meet legal, tax, accounting,
                and security obligations.
              </PolicyText>

              <PolicyText>
                The length of retention may vary according to the
                type of information and the reason it was
                collected. Some records may remain in backups or
                logs for a limited period after deletion from
                active systems.
              </PolicyText>
            </section>

            <section id="security">
              <PolicyHeading
                number="08"
                title="Security"
              />

              <PolicyText>
                We use reasonable administrative, technical, and
                organizational measures intended to protect
                information from unauthorized access, loss,
                misuse, alteration, or disclosure.
              </PolicyText>

              <PolicyText>
                These measures include authenticated accounts,
                access controls, private media storage, encrypted
                website connections, temporary signed media
                links, and restricted server credentials.
                However, no website, database, transmission, or
                storage system can be guaranteed completely
                secure.
              </PolicyText>
            </section>

            <section id="your-choices">
              <PolicyHeading
                number="09"
                title="Your choices and requests"
              />

              <PolicyText>
                Depending on your location and applicable law,
                you may have the right to request access to,
                correction of, or deletion of certain personal
                information associated with your account.
              </PolicyText>

              <PolicyList
                items={[
                  "You may sign out of your account at any time.",
                  "Members may manage billing details and cancellation through Stripe’s customer portal when available.",
                  "You may adjust browser cookie and tracking settings.",
                  "You may contact us to request correction or deletion of eligible account information.",
                  "We may need to verify your identity before completing a privacy request.",
                ]}
              />

              <PolicyText>
                Certain information may be retained when required
                for billing, fraud prevention, legal compliance,
                recordkeeping, dispute resolution, or security.
              </PolicyText>
            </section>

            <section id="children">
              <PolicyHeading
                number="10"
                title="Children’s privacy"
              />

              <PolicyText>
                Crime Recordings is not directed to children
                under 13, and we do not knowingly collect
                personal information from children under 13. If
                we learn that such information has been collected,
                we will take reasonable steps to delete it.
              </PolicyText>

              <PolicyText>
                Crime-related material may contain mature,
                disturbing, or sensitive subject matter and is
                intended for an adult or appropriately supervised
                audience.
              </PolicyText>
            </section>

            <section id="changes">
              <PolicyHeading
                number="11"
                title="Changes to this policy"
              />

              <PolicyText>
                We may update this Privacy Policy as Crime
                Recordings develops, adds services, changes
                providers, or responds to legal or operational
                requirements.
              </PolicyText>

              <PolicyText>
                The revised policy will be posted on this page
                with an updated effective date. Continued use of
                the website after an update means the revised
                policy applies to future use.
              </PolicyText>
            </section>

            <section id="contact">
              <PolicyHeading
                number="12"
                title="Contact us"
              />

              <PolicyText>
                Questions, privacy requests, or requests concerning
                published case material may be sent to:
              </PolicyText>

              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="mt-6 inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
              >
                {PRIVACY_EMAIL}
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
            className="text-[#e1c58f]"
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </main>
  );
}

type PolicyHeadingProps = {
  number: string;
  title: string;
};

function PolicyHeading({
  number,
  title,
}: PolicyHeadingProps) {
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

type ProviderCardProps = {
  name: string;
  description: string;
};

function ProviderCard({
  name,
  description,
}: ProviderCardProps) {
  return (
    <div className="bg-[#10151b] p-6">
      <h3 className="m-0 font-serif text-2xl font-medium text-[#f4f1e9]">
        {name}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#a8adb5]">
        {description}
      </p>
    </div>
  );
}