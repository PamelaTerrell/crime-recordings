import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicMediaPlayer from "./public-media-player";

type PublicCasePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getPublishedCase(slug: string) {
  const supabase = await createClient();

  const { data: caseItem, error } = await supabase
    .from("cases")
    .select(
      `
        id,
        title,
        subtitle,
        slug,
        summary,
        description,
        victim_names,
        accused_names,
        location_city,
        location_state,
        location_country,
        incident_date,
        content_warning,
        case_status,
        published_at
      `,
    )
    .eq("slug", slug)
    .eq("case_status", "published")
    .maybeSingle();

  if (error || !caseItem) {
    return null;
  }

  const { data: recordings, error: recordingsError } =
    await supabase
      .from("recordings")
      .select(
        `
          id,
          title,
          recording_type,
          mime_type,
          access_level,
          is_featured,
          sort_order,
          created_at
        `,
      )
      .eq("case_id", caseItem.id)
      .eq("is_published", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

  if (recordingsError) {
    throw new Error(
      `Unable to load case recordings: ${recordingsError.message}`,
    );
  }

  return {
    caseItem,
    recordings: recordings ?? [],
  };
}

export async function generateMetadata({
  params,
}: PublicCasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedCase(slug);

  if (!result) {
    return {
      title: "Case Not Found | Crime Recordings",
    };
  }

  const description =
    result.caseItem.summary ??
    `Review the public-record media archive for ${result.caseItem.title}.`;

  return {
    title: `${result.caseItem.title} | Crime Recordings`,
    description,
    alternates: {
      canonical: `/cases/${result.caseItem.slug}`,
    },
    openGraph: {
      title: result.caseItem.title,
      description,
      type: "article",
    },
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

function formatRecordingType(value: string) {
  return value
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

export default async function PublicCasePage({
  params,
}: PublicCasePageProps) {
  const { slug } = await params;
  const result = await getPublishedCase(slug);

  if (!result) {
    notFound();
  }

  const { caseItem, recordings } = result;

  const featuredRecording =
    recordings.find(
      (recording) =>
        recording.is_featured &&
        recording.mime_type?.startsWith("video/"),
    ) ?? null;

  const remainingRecordings = recordings.filter(
    (recording) =>
      recording.id !== featuredRecording?.id,
  );

  const location =
    [
      caseItem.location_city,
      caseItem.location_state,
      caseItem.location_country,
    ]
      .filter(Boolean)
      .join(", ") || "Location not listed";

  return (
    <main className="min-h-screen bg-[#080b0f] text-[#f4f1e9]">
      <header className="flex min-h-24 items-center justify-between gap-6 border-b border-white/10 px-5 py-5 md:px-10 lg:px-16">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-tight text-[#f4f1e9]"
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

      <section className="px-5 pb-10 pt-14 md:px-10 md:pt-20 lg:px-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
            Public-record case archive
          </p>

          <h1 className="m-0 max-w-6xl font-serif text-[clamp(3.5rem,9vw,9rem)] font-medium leading-[0.88] tracking-[-0.055em] text-[#f4f1e9]">
            {caseItem.title}
          </h1>

          {caseItem.subtitle ? (
            <p className="mt-7 max-w-4xl font-serif text-2xl leading-9 text-[#c8cbd0] md:text-3xl">
              {caseItem.subtitle}
            </p>
          ) : null}

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm text-[#a8adb5]">
            <span>{formatDate(caseItem.incident_date)}</span>
            <span>{location}</span>
            <span>
              {recordings.length} published{" "}
              {recordings.length === 1
                ? "recording"
                : "recordings"}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-0 md:px-6">
        {featuredRecording ? (
          <PublicMediaPlayer
            recordingId={featuredRecording.id}
            title={featuredRecording.title}
            mimeType={featuredRecording.mime_type}
            accessLevel={featuredRecording.access_level}
            featured
          />
        ) : (
          <div className="grid min-h-[55vh] place-items-center border-y border-white/10 bg-[#10151b] px-6 text-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
                Case media
              </p>

              <h2 className="mt-5 font-serif text-4xl font-medium md:text-6xl">
                Featured video coming soon
              </h2>
            </div>
          </div>
        )}
      </section>

      <section className="px-5 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto grid max-w-[1500px] gap-14 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-24">
          <aside>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
              Case facts
            </p>

            <dl className="mt-7 border-t border-white/10">
              <div className="border-b border-white/10 py-5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Victim(s)
                </dt>

                <dd className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#d8d9dc]">
                  {caseItem.victim_names ?? "Not listed"}
                </dd>
              </div>

              <div className="border-b border-white/10 py-5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Accused or convicted
                </dt>

                <dd className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#d8d9dc]">
                  {caseItem.accused_names ?? "Not listed"}
                </dd>
              </div>

              <div className="border-b border-white/10 py-5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Incident date
                </dt>

                <dd className="mt-2 text-base text-[#d8d9dc]">
                  {formatDate(caseItem.incident_date)}
                </dd>
              </div>

              <div className="border-b border-white/10 py-5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Location
                </dt>

                <dd className="mt-2 text-base text-[#d8d9dc]">
                  {location}
                </dd>
              </div>
            </dl>
          </aside>

          <article>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
              Case overview
            </p>

            <h2 className="mt-5 max-w-4xl font-serif text-4xl font-medium leading-tight md:text-6xl">
              The documented record
            </h2>

            <div className="mt-8 max-w-4xl space-y-7 text-lg leading-9 text-[#b8bcc2]">
              <p>
                {caseItem.summary ??
                  "A factual case summary has not yet been published."}
              </p>

              {caseItem.description ? (
                <p className="whitespace-pre-wrap">
                  {caseItem.description}
                </p>
              ) : null}
            </div>

            {caseItem.content_warning ? (
              <div className="mt-10 border border-[#c8a66a]/40 bg-[#c8a66a]/5 p-6">
                <p className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
                  Content warning
                </p>

                <p className="mt-3 leading-7 text-[#c8cbd0]">
                  {caseItem.content_warning}
                </p>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0b0f14] px-5 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
            Recorded evidence
          </p>

          <h2 className="mt-5 font-serif text-5xl font-medium md:text-7xl">
            Case recordings
          </h2>

          {remainingRecordings.length > 0 ? (
            <div className="mt-12 grid gap-8">
              {remainingRecordings.map(
                (recording, index) => (
                  <article
                    key={recording.id}
                    className="grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[120px_minmax(0,1fr)]"
                  >
                    <div className="font-serif text-3xl text-[#c8a66a]">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <div className="mb-4 flex flex-wrap gap-2">
                        <span className="border border-[#c8a66a]/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e1c58f]">
                          {formatRecordingType(
                            recording.recording_type,
                          )}
                        </span>

                        <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                          {recording.mime_type?.startsWith(
                            "video/",
                          )
                            ? "Video"
                            : "Audio"}
                        </span>

                        <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                          {recording.access_level === "public"
                            ? "Public"
                            : "Members only"}
                        </span>
                      </div>

                      <h3 className="m-0 font-serif text-3xl font-medium md:text-4xl">
                        {recording.title}
                      </h3>

                      <div className="mt-6">
                        <PublicMediaPlayer
                          recordingId={recording.id}
                          title={recording.title}
                          mimeType={recording.mime_type}
                          accessLevel={
                            recording.access_level
                          }
                        />
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : (
            <p className="mt-10 text-lg text-[#a8adb5]">
              No additional recordings have been published.
            </p>
          )}
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-5 border-t border-white/10 px-5 py-10 text-sm text-[#747b84] md:flex-row md:px-10 lg:px-16">
        <p className="m-0">
          Crime Recordings · Public-record documentary archive
        </p>

        <Link
          href="/"
          className="text-[#e1c58f] transition hover:text-[#f4f1e9]"
        >
          Return home
        </Link>
      </footer>
    </main>
  );
}