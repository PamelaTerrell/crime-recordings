import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HomepageFeaturedVideo from "./homepage-featured-video";

const siteUrl = "https://www.crimerecordings.com";

export const metadata: Metadata = {
  title: "Crime Recordings | True Crime Public Records Archive",

  description:
    "Crime Recordings is a public-record true-crime archive featuring police interviews, interrogations, 911 calls, dispatch audio, body-camera footage, video evidence, crime-scene photographs, graphic visual evidence, and case documents.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Crime Recordings",
    title: "Crime Recordings | True Crime Public Records Archive",
    description:
      "Explore real criminal cases through police interviews, interrogations, dispatch audio, 911 calls, body-camera footage, crime-scene photographs, video evidence, and public-record case documents.",
    images: [
      {
        url: "/crime-recordings-logo.png",
        width: 1200,
        height: 1200,
        alt: "Crime Recordings true crime public records archive",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Crime Recordings | True Crime Public Records Archive",
    description:
      "Original police recordings, public records, crime-scene photographs, case documents, interviews, interrogations, dispatch audio, and video evidence.",
    images: ["/crime-recordings-logo.png"],
  },
};

const RECORDING_TYPES = [
  "Police Interviews",
  "Interrogations",
  "911 & Emergency Calls",
  "Dispatch Audio",
  "Body-Camera Video",
  "Courtroom Recordings",
  "Official Statements",
  "Crime-Scene Photographs",
  "Case Documents",
];

const PLATFORM_FEATURES = [
  {
    number: "01",
    title: "Original public-record media",
    description:
      "Watch, listen to, and examine recordings, photographs, and documents obtained from official agencies and public-record sources.",
  },
  {
    number: "02",
    title: "Documented case context",
    description:
      "Understand when evidence was created, who is speaking, what investigators documented, and how each item relates to the broader case.",
  },
  {
    number: "03",
    title: "Growing case archives",
    description:
      "Explore selected material publicly and access extended recordings, photographs, documents, and other case media through the complete archive.",
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
          href="/"
          className="font-serif text-4xl font-medium tracking-[-0.03em] text-[#f4f1e9]"
          aria-label="Crime Recordings home"
        >
          Crime Recordings
        </Link>

        <nav
          className="site-nav"
          aria-label="Primary navigation"
        >
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
          className="bg-[#080b0f] pb-16 pt-14 text-[#f4f1e9] md:pb-24 md:pt-20"
        >
          <HomepageFeaturedVideo
            recordingId={featuredRecording.id}
            title={featuredRecording.title}
            caseHref={`/cases/${featuredCase.slug}`}
          />

          <div className="mx-auto max-w-[1600px]">
            <div className="px-5 pb-10 md:px-10 lg:px-16">
              <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
                Public-record true crime archive
              </p>

              <h1 className="m-0 max-w-6xl font-serif text-[clamp(2.2rem,5vw,5.5rem)] font-medium leading-[1.02] tracking-[-0.04em] text-[#f4f1e9]">
                Crime Recordings:
                <span className="block">
                  Real cases. Real recordings.
                </span>
              </h1>

              <p className="mt-7 max-w-4xl text-lg leading-8 text-[#b8bcc2] md:text-xl md:leading-9">
                Crime Recordings is a public-record true-crime
                archive presenting original police interviews,
                interrogations, 911 and emergency calls,
                body-camera footage, dispatch audio, courtroom
                recordings, crime-scene photographs, video
                evidence, and case documents obtained from
                official sources.
              </p>

              <p className="mt-4 max-w-4xl text-base leading-7 text-[#8f959d]">
                CrimeRecordings.com preserves original source
                material so viewers can examine documented
                criminal cases beyond headlines, summaries,
                and commentary.
              </p>
            </div>

            <div className="grid gap-8 px-5 pt-9 md:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-16">
              <div>
                <p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
                  Featured public recording
                </p>

                <h2 className="mt-3 font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
                  {featuredRecording.title}
                </h2>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#747b84]">
                  <span>
                    {formatDate(
                      featuredCase.incident_date,
                    )}
                  </span>

                  {featuredLocation ? (
                    <span>{featuredLocation}</span>
                  ) : null}
                </div>

                <p className="mt-5 max-w-4xl text-base leading-8 text-[#a8adb5] md:text-lg">
                  {featuredCase.summary ??
                    "Watch this featured public-record video and explore the complete documented case archive."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
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
                  href="/cases"
                  className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10"
                >
                  Browse the archive
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
              Crime Recordings
              <span>Real cases. Real recordings.</span>
            </h1>

            <p className="hero-description">
              Crime Recordings is a public-record true-crime
              archive featuring police interviews,
              interrogations, 911 and emergency calls,
              body-camera footage, dispatch audio, courtroom
              recordings, crime-scene photographs, video
              evidence, and case documents obtained from
              official sources.
            </p>

            <div className="hero-actions">
              <Link
                className="primary-button"
                href="/cases"
              >
                Explore the archive

                <span aria-hidden="true">
                  →
                </span>
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
            aria-label="Crime Recordings archive introduction"
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
                <dt>Formats</dt>
                <dd>
                  Audio, video, images, and documents
                </dd>
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
          About Crime Recordings
        </p>

        <div className="statement-layout">
          <h2>
            The original record tells a story of its own.
          </h2>

          <div className="statement-copy">
            <p>
              True-crime stories are often condensed into
              headlines, documentaries, summaries, and
              commentary. Crime Recordings takes viewers and
              listeners closer to the underlying public
              record.
            </p>

            <p>
              The archive organizes police interviews,
              interrogations, recordings, photographs,
              documents, and other investigative material
              alongside factual case context.
            </p>

            <p>
              Our goal is to preserve and present compelling
              source material with careful organization,
              useful context, and respect for the people
              connected to each case.
            </p>
          </div>
        </div>
      </section>

      <section
        className="features-section"
        id="archive"
        aria-labelledby="archive-heading"
      >
        <div className="section-heading">
          <div>
            <p className="section-label">
              Inside the archive
            </p>

            <h2 id="archive-heading">
              True-crime recordings, photographs, and
              public records.
            </h2>
          </div>

          <p>
            Crime Recordings is built as a growing
            documentary archive rather than a collection of
            disconnected clips.
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

        <div
          className="recording-types"
          aria-label="Types of material in the Crime Recordings archive"
        >
          {RECORDING_TYPES.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>

        <div className="mt-12">
          <Link
            className="primary-button"
            href="/cases"
          >
            Browse published true-crime cases

            <span aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>

      <section
        className="border-t border-white/10 bg-[#0b0e12] px-5 py-16 text-[#f4f1e9] md:px-10 lg:px-16"
        aria-labelledby="content-advisory-heading"
      >
        <div className="mx-auto max-w-[1400px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
            Content advisory
          </p>

          <h2
            id="content-advisory-heading"
            className="mt-4 max-w-4xl font-serif text-3xl font-medium md:text-4xl"
          >
            Some case materials contain graphic or
            disturbing evidence.
          </h2>

          <p className="mt-5 max-w-4xl text-base leading-8 text-[#a8adb5] md:text-lg">
            Certain archives may include crime-scene
            photographs, blood, injuries, deceased victims,
            disturbing audio or video, and other sensitive
            investigative material. Graphic content is
            identified where appropriate so viewers can make
            an informed choice before viewing it.
          </p>
        </div>
      </section>

      <section
        className="coming-soon-section"
        id="updates"
        aria-labelledby="updates-heading"
      >
        <div>
          <p className="section-label">
            The archive is open
          </p>

          <h2 id="updates-heading">
            Crime Recordings is actively growing.
          </h2>
        </div>

        <div className="coming-soon-copy">
          <p>
            Additional police recordings, public records,
            crime-scene photographs, case documents,
            timelines, source details, and factual case
            background are continually being organized and
            prepared for the archive.
          </p>

          <p>
            New public recordings and expanded case archives
            will be added as material is reviewed, organized,
            and prepared for publication.
          </p>

          <p className="launch-note">
            CrimeRecordings.com · Public-record true-crime
            archive · Established 2026
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
              Explore the complete recordings and case
              materials behind the archive.
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#a8adb5]">
              Join for $2.99 per month to access
              members-only police interviews,
              interrogations, emergency calls, audio,
              video, photographs, documents, and extended
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
            alt="Crime Recordings public-record true-crime archive"
            width={240}
            height={160}
            className="footer-logo"
          />

          <p>
            Crime Recordings · Real cases. Original
            recordings.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3"
            aria-label="Footer navigation"
          >
            <Link href="/">
              Crime Recordings
            </Link>

            <Link href="/cases">
              Case Archive
            </Link>

            <Link href="/membership">
              Membership
            </Link>

            <Link href="/account">
              My Account
            </Link>

            <Link href="/privacy">
              Privacy
            </Link>

            <Link href="/terms">
              Terms
            </Link>
          </nav>

          <div className="flex flex-col gap-2">
            <p>
              © {new Date().getFullYear()} Crime Recordings
              {" "}— A Stabile USA Project
            </p>

            <p>
              CrimeRecordings.com documents original
              public-record material from criminal cases.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}