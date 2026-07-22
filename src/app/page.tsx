import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PublicMediaPlayer from "@/app/cases/[slug]/public-media-player";

const RECORDING_TYPES = [
  "Interviews",
  "Interrogations",
  "Emergency Calls",
  "Dispatch Audio",
  "Body-Camera Video",
  "Courtroom Recordings",
  "Official Statements",
];

const PLATFORM_FEATURES = [
  {
    number: "01",
    title: "Original recordings",
    description:
      "Watch and listen to recordings obtained from official agencies and public-records sources.",
  },
  {
    number: "02",
    title: "Case context",
    description:
      "Understand when the recording occurred, who is speaking, and how it relates to the case.",
  },
  {
    number: "03",
    title: "Complete access",
    description:
      "Watch selected recordings publicly and explore extended case media through the full archive.",
  },
];

async function getHomepageFeaturedVideo() {
  const supabase = await createClient();

  const { data: recording, error: recordingError } =
    await supabase
      .from("recordings")
      .select(
        `
          id,
          case_id,
          title,
          mime_type,
          access_level,
          is_published,
          is_featured
        `,
      )
      .eq("is_published", true)
      .eq("is_featured", true)
      .eq("access_level", "public")
      .like("mime_type", "video/%")
      .limit(1)
      .maybeSingle();

  if (recordingError || !recording) {
    return null;
  }

  const { data: caseItem, error: caseError } =
    await supabase
      .from("cases")
      .select(
        `
          id,
          title,
          slug,
          summary,
          incident_date,
          location_city,
          location_state,
          location_country,
          case_status
        `,
      )
      .eq("id", recording.case_id)
      .eq("case_status", "published")
      .maybeSingle();

  if (caseError || !caseItem) {
    return null;
  }

  return {
    recording,
    caseItem,
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not listed";
  }

  const parsedDate = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

export default async function Home() {
  const featuredResult = await getHomepageFeaturedVideo();

  const featuredRecording =
    featuredResult?.recording ?? null;

  const featuredCase =
    featuredResult?.caseItem ?? null;

  const featuredLocation = featuredCase
    ? [
        featuredCase.location_city,
        featuredCase.location_state,
        featuredCase.location_country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <main>
      <header className="site-header">
        <Link
          className="brand"
          href="/"
          aria-label="Crime Recordings home"
        >
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={270}
            height={180}
            priority
            className="site-logo"
          />
        </Link>

        <nav
          className="site-nav"
          aria-label="Primary navigation"
        >
          <a href="#about">About</a>

          <Link href="/cases">
            The Archive
          </Link>

          <a href="#updates">
            Updates
          </a>

          <Link href="/membership">
            Join for $2.99
          </Link>

          <Link href="/account">
            My Account
          </Link>
        </nav>
      </header>

      {featuredRecording && featuredCase ? (
        <section
          id="top"
          className="bg-[#080b0f] px-0 pb-16 pt-36 text-[#f4f1e9] md:pb-24 md:pt-40"
        >
          <div className="mx-auto max-w-[1600px]">
            <div className="px-5 pb-9 md:px-10 lg:px-16">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
                Featured public recording
              </p>

              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <h1 className="m-0 max-w-6xl font-serif text-[clamp(3.5rem,8vw,8rem)] font-medium leading-[0.9] tracking-[-0.055em]">
                    {featuredCase.title}
                  </h1>

                  <p className="mt-6 max-w-4xl font-serif text-2xl leading-9 text-[#c8cbd0] md:text-3xl">
                    {featuredRecording.title}
                  </p>
                </div>

                <div className="border-l border-[#c8a66a]/40 pl-6 text-sm leading-7 text-[#a8adb5]">
                  <p className="m-0">
                    {formatDate(
                      featuredCase.incident_date,
                    )}
                  </p>

                  {featuredLocation ? (
                    <p className="m-0">
                      {featuredLocation}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <PublicMediaPlayer
              recordingId={featuredRecording.id}
              title={featuredRecording.title}
              mimeType={
                featuredRecording.mime_type
              }
              accessLevel={
                featuredRecording.access_level
              }
              featured
            />

            <div className="grid gap-7 px-5 pt-9 md:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-16">
              <p className="m-0 max-w-4xl text-base leading-8 text-[#a8adb5] md:text-lg">
                {featuredCase.summary ??
                  "Watch this featured public-record video and explore the complete documented case archive."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/cases/${featuredCase.slug}`}
                  className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
                >
                  View complete case
                  <span
                    className="ml-4"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>

                <Link
                  href="/membership"
                  className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10"
                >
                  Join for $2.99/month
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero" id="top">
          <div
            className="hero-grid"
            aria-hidden="true"
          />

          <div className="hero-content">
            <p className="eyebrow">
              Public records · Original media · True cases
            </p>

            <h1>
              See the records
              <span>behind the cases.</span>
            </h1>

            <p className="hero-description">
              Crime Recordings presents interviews,
              interrogations, emergency calls, body-camera
              footage, dispatch audio, and other official
              recordings obtained through public-records
              requests.
            </p>

            <div className="hero-actions">
              <Link
                className="primary-button"
                href="/cases"
              >
                Explore the archive
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                className="secondary-button"
                href="/membership"
              >
                Join for $2.99
              </Link>
            </div>
          </div>

          <aside
            className="case-file"
            aria-label="Crime Recordings introduction"
          >
            <div className="file-top">
              <span>Crime Recordings</span>
              <span>File 001</span>
            </div>

            <div className="file-stamp">
              Original Record
            </div>

            <div
              className="waveform"
              aria-hidden="true"
            >
              {Array.from(
                { length: 46 },
                (_, index) => (
                  <span
                    key={index}
                    style={{
                      height: `${
                        18 + ((index * 19) % 68)
                      }%`,
                    }}
                  />
                ),
              )}
            </div>

            <dl className="file-details">
              <div>
                <dt>Source</dt>
                <dd>Official public record</dd>
              </div>

              <div>
                <dt>Format</dt>
                <dd>Audio and video archive</dd>
              </div>

              <div>
                <dt>Status</dt>
                <dd>
                  <span className="status-dot" />
                  Archive active
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      )}

      <section
        className="statement-section"
        id="about"
      >
        <p className="section-label">
          Why Crime Recordings
        </p>

        <div className="statement-layout">
          <h2>
            The source material tells a story of its own.
          </h2>

          <div className="statement-copy">
            <p>
              True-crime stories are often condensed into
              headlines, summaries, and commentary. Crime
              Recordings takes viewers and listeners closer
              to the original record.
            </p>

            <p>
              Our goal is to present compelling source
              material with context, careful organization,
              and respect for the people connected to each
              case.
            </p>
          </div>
        </div>
      </section>

      <section
        className="features-section"
        id="archive"
      >
        <div className="section-heading">
          <div>
            <p className="section-label">
              Inside the archive
            </p>

            <h2>
              Real cases. Original recordings.
            </h2>
          </div>

          <p>
            Built as a growing documentary archive rather
            than a collection of disconnected clips.
          </p>
        </div>

        <div className="feature-grid">
          {PLATFORM_FEATURES.map((feature) => (
            <article
              className="feature-card"
              key={feature.number}
            >
              <span>{feature.number}</span>

              <h3>{feature.title}</h3>

              <p>{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="recording-types">
          {RECORDING_TYPES.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>

        <div className="mt-12">
          <Link
            className="primary-button"
            href="/cases"
          >
            Browse published cases
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section
        className="coming-soon-section"
        id="updates"
      >
        <div>
          <p className="section-label">
            The archive is open
          </p>

          <h2>
            Crime Recordings is actively growing.
          </h2>
        </div>

        <div className="coming-soon-copy">
          <p>
            We are organizing additional official
            recordings, supporting timelines, source
            details, and factual case background.
          </p>

          <p>
            New public videos and complete case archives
            will be added as the material is reviewed and
            prepared.
          </p>

          <p className="launch-note">
            CrimeRecordings.com · Established 2026
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#080b0f] px-5 py-20 text-[#f4f1e9] md:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
              Crime Recordings membership
            </p>

            <h2 className="mt-5 max-w-4xl font-serif text-4xl font-medium leading-tight md:text-6xl">
              Unlock the complete recordings behind the
              cases.
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#a8adb5]">
              Join for $2.99 per month to access
              members-only interviews, interrogations,
              emergency calls, audio, video, and extended
              case media.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/membership"
              className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-8 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111318] transition hover:bg-[#e1c58f]"
            >
              Become a member
            </Link>

            <Link
              href="/account"
              className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] px-8 text-xs font-extrabold uppercase tracking-[0.12em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10"
            >
              My account
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <Image
            src="/crime-recordings-logo.png"
            alt="Crime Recordings"
            width={240}
            height={160}
            className="footer-logo"
          />

          <p>Real cases. Original recordings.</p>
        </div>

        <p>
          © {new Date().getFullYear()} Crime Recordings —
          A Stabile USA Project
        </p>
      </footer>
    </main>
  );
}