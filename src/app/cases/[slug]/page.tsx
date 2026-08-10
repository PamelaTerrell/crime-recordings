import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { r2BucketName, r2Client } from "@/lib/r2";
import PublicMediaPlayer from "./public-media-player";
import CaseImageGallery from "./case-image-gallery";

type PublicCasePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getPublishedCase(slug: string) {
  const supabase = await createClient();

  const { data: caseItem, error: caseError } =
    await supabase
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

  if (caseError) {
    throw new Error(
      `Unable to load published case: ${caseError.message}`,
    );
  }

  if (!caseItem) {
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
          file_summary,
          duration_seconds,
          thumbnail_object_key,
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

  const recordingsWithThumbnails = await Promise.all(
    (recordings ?? []).map(async (recording) => {
      if (!recording.thumbnail_object_key) {
        return {
          ...recording,
          thumbnail_url: null,
        };
      }

      try {
        const command = new GetObjectCommand({
          Bucket: r2BucketName,
          Key: recording.thumbnail_object_key,
          ResponseContentDisposition: "inline",
        });

        const thumbnailUrl = await getSignedUrl(
          r2Client,
          command,
          {
            expiresIn: 60 * 60,
          },
        );

        return {
          ...recording,
          thumbnail_url: thumbnailUrl,
        };
      } catch (thumbnailError) {
        console.error(
          `Unable to prepare thumbnail for recording ${recording.id}:`,
          thumbnailError,
        );

        return {
          ...recording,
          thumbnail_url: null,
        };
      }
    }),
  );

  const {
    data: documents,
    error: documentsError,
  } = await supabase
    .from("case_documents")
    .select(
      `
        id,
        title,
        description,
        source_name,
        source_reference,
        document_date,
        original_filename,
        mime_type,
        file_size_bytes,
        access_level,
        is_sensitive,
        sort_order,
        created_at
      `,
    )
    .eq("case_id", caseItem.id)
    .eq("is_published", true)
    .eq("access_level", "public")
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (documentsError) {
    throw new Error(
      `Unable to load case documents: ${documentsError.message}`,
    );
  }

  return {
    caseItem,
    recordings: recordingsWithThumbnails,
    documents: documents ?? [],
  };
}

export async function generateMetadata({
  params,
}: PublicCasePageProps): Promise<Metadata> {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: caseItem, error } = await supabase
    .from("cases")
    .select(
      `
        title,
        slug,
        summary
      `,
    )
    .eq("slug", slug)
    .eq("case_status", "published")
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load case metadata:",
      error,
    );
  }

  if (!caseItem) {
    return {
      title: "Case Not Found | Crime Recordings",
    };
  }

  const description =
    caseItem.summary ??
    `Review the public-record media archive for ${caseItem.title}.`;

  return {
    title: `${caseItem.title} | Crime Recordings`,
    description,
    alternates: {
      canonical: `/cases/${caseItem.slug}`,
    },
    openGraph: {
      title: caseItem.title,
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

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(
    (seconds % 3600) / 60,
  );
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(
      1,
    )} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

export default async function PublicCasePage({
  params,
}: PublicCasePageProps) {
  const { slug } = await params;
  const result = await getPublishedCase(slug);

  if (!result) {
    notFound();
  }

  const {
    caseItem,
    recordings,
    documents,
  } = result;

  const memberRecordings = recordings.filter(
    (recording) =>
      recording.access_level === "member",
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
      <header className="flex min-h-20 items-center justify-between gap-6 border-b border-white/10 px-5 py-4 md:px-10 lg:px-16">
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

      <section className="border-b border-white/10 px-5 pb-8 pt-10 md:px-10 md:pb-10 md:pt-12 lg:px-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
            Public-record case archive
          </p>

          <h1 className="m-0 max-w-6xl font-serif text-[clamp(3.25rem,7vw,7rem)] font-medium leading-[0.9] tracking-[-0.05em] text-[#f4f1e9]">
            {caseItem.title}
          </h1>

          {caseItem.subtitle ? (
            <p className="mt-5 max-w-4xl font-serif text-xl leading-8 text-[#c8cbd0] md:text-2xl">
              {caseItem.subtitle}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-sm text-[#a8adb5]">
            <span>
              {formatDate(caseItem.incident_date)}
            </span>

            <span>{location}</span>

            <span>
              {recordings.length} published{" "}
              {recordings.length === 1
                ? "recording"
                : "recordings"}
            </span>

            <span>
              {documents.length} published{" "}
              {documents.length === 1
                ? "document"
                : "documents"}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-[#0b0f14] px-5 py-10 md:px-10 md:py-12 lg:px-16 lg:py-14">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
            Recorded evidence
          </p>

          <h2 className="mt-3 font-serif text-4xl font-medium md:text-5xl">
            Case recordings
          </h2>

          {memberRecordings.length > 0 ? (
            <div className="mt-5 max-w-4xl border-l border-[#c8a66a] pl-5">
              <p className="text-base leading-7 text-[#b8bcc2]">
                The first recording in this case is
                available publicly. Additional recordings
                are available with a Crime Recordings
                membership.
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs font-extrabold uppercase tracking-[0.1em]">
                <Link
                  href="/membership"
                  className="text-[#e1c58f] transition hover:text-[#f4f1e9]"
                >
                  View membership →
                </Link>

                <Link
                  href="/login"
                  className="text-[#a8adb5] transition hover:text-[#f4f1e9]"
                >
                  Member sign in →
                </Link>
              </div>
            </div>
          ) : null}

          {recordings.length > 0 ? (
            <div className="mt-8 grid gap-7">
              {recordings.map(
                (recording, index) => {
                  const formattedDuration =
                    formatDuration(
                      recording.duration_seconds,
                    );

                  return (
                    <article
                      key={recording.id}
                      className="grid gap-5 border-t border-white/10 pt-6 lg:grid-cols-[90px_minmax(0,1fr)]"
                    >
                      <div className="font-serif text-3xl text-[#c8a66a]">
                        {String(index + 1).padStart(
                          2,
                          "0",
                        )}
                      </div>

                      <div
                        className={`grid gap-6 ${
                          recording.thumbnail_url
                            ? "md:grid-cols-[325px_minmax(0,1fr)]"
                            : ""
                        }`}
                      >
                        {recording.thumbnail_url ? (
                          <div className="h-[183px] w-full self-start overflow-hidden border border-white/10 bg-black md:w-[325px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                recording.thumbnail_url
                              }
                              alt={`Thumbnail for ${recording.title}`}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        ) : null}

                        <div className="min-w-0">
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
                              {recording.access_level ===
                              "public"
                                ? "Public"
                                : "Members only"}
                            </span>

                            {formattedDuration ? (
                              <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                                {formattedDuration}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="m-0 font-serif text-3xl font-medium md:text-4xl">
                            {recording.title}
                          </h3>

                          {recording.file_summary ? (
                            <p className="mt-4 max-w-3xl text-base leading-7 text-[#b8bcc2]">
                              {
                                recording.file_summary
                              }
                            </p>
                          ) : null}

                          <div className="mt-6">
                            <PublicMediaPlayer
                              recordingId={
                                recording.id
                              }
                              title={
                                recording.title
                              }
                              mimeType={
                                recording.mime_type
                              }
                              accessLevel={
                                recording.access_level
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <p className="mt-10 text-lg text-[#a8adb5]">
              No recordings have been published.
            </p>
          )}
        </div>
      </section>

      <CaseImageGallery caseId={caseItem.id} />

      <section className="border-t border-white/10 bg-[#0b0f14] px-5 py-12 md:px-10 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
            Case documents
          </p>

          <h2 className="mt-3 font-serif text-4xl font-medium md:text-5xl">
            Reports and exhibits
          </h2>

          <p className="mt-4 max-w-3xl leading-7 text-[#a8adb5]">
            Public-record reports, presentations, exhibits,
            and other documentary materials associated with
            this case.
          </p>

          {documents.length > 0 ? (
            <div className="mt-9 grid gap-6">
              {documents.map(
                (document, index) => {
                  const fileSize =
                    formatFileSize(
                      document.file_size_bytes,
                    );

                  return (
                    <article
                      key={document.id}
                      className="grid gap-5 border-t border-white/10 pt-6 md:grid-cols-[70px_minmax(0,1fr)_auto] md:items-start"
                    >
                      <div className="font-serif text-3xl text-[#c8a66a]">
                        {String(index + 1).padStart(
                          2,
                          "0",
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className="border border-[#c8a66a]/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e1c58f]">
                            PDF document
                          </span>

                          <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                            Public
                          </span>

                          {fileSize ? (
                            <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                              {fileSize}
                            </span>
                          ) : null}

                          {document.document_date ? (
                            <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                              {formatDate(
                                document.document_date,
                              )}
                            </span>
                          ) : null}

                          {document.is_sensitive ? (
                            <span className="border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-200">
                              Sensitive material
                            </span>
                          ) : null}
                        </div>

                        <h3 className="m-0 font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
                          {document.title}
                        </h3>

                        {document.description ? (
                          <p className="mt-4 max-w-3xl leading-7 text-[#b8bcc2]">
                            {
                              document.description
                            }
                          </p>
                        ) : null}

                        {(document.source_name ||
                          document.source_reference) ? (
                          <div className="mt-4 text-sm leading-6 text-[#8f959e]">
                            {document.source_name ? (
                              <p>
                                <strong className="text-[#c8cbd0]">
                                  Source:
                                </strong>{" "}
                                {
                                  document.source_name
                                }
                              </p>
                            ) : null}

                            {document.source_reference ? (
                              <p>
                                <strong className="text-[#c8cbd0]">
                                  Reference:
                                </strong>{" "}
                                {
                                  document.source_reference
                                }
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="md:pt-1">
                        <a
                          href={`/api/public/case-documents/${document.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-12 w-full items-center justify-center border border-[#c8a66a] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#e1c58f] transition hover:bg-[#c8a66a] hover:text-[#111318] md:w-auto"
                        >
                          View PDF
                        </a>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="mt-9 border border-white/10 bg-[#10151b] p-7">
              <p className="m-0 text-[#a8adb5]">
                No public documents have been published for
                this case yet.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        id="case-overview"
        className="border-t border-white/10 px-5 py-14 md:px-10 lg:px-16 lg:py-20"
      >
        <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
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
                  {caseItem.victim_names ??
                    "Not listed"}
                </dd>
              </div>

              <div className="border-b border-white/10 py-5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Accused or convicted
                </dt>

                <dd className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#d8d9dc]">
                  {caseItem.accused_names ??
                    "Not listed"}
                </dd>
              </div>

              <div className="border-b border-white/10 py-5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Incident date
                </dt>

                <dd className="mt-2 text-base text-[#d8d9dc]">
                  {formatDate(
                    caseItem.incident_date,
                  )}
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

            <div className="mt-5 max-w-4xl border-l border-white/15 pl-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#a8adb5]">
                About the recording order
              </p>

              <p className="mt-3 text-sm leading-7 text-[#9fa4ab]">
                We make every effort to present files in
                chronological order. However, records may be
                received in separate releases, and some
                audio, video, and documents require
                significant time to review and identify
                accurately. For that reason, certain files
                may temporarily appear out of sequence. The
                order will be updated as additional records
                are received and the case archive is
                reviewed.
              </p>
            </div>

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

      <footer className="flex flex-col justify-between gap-5 border-t border-white/10 px-5 py-10 text-sm text-[#747b84] md:flex-row md:px-10 lg:px-16">
        <p className="m-0">
          Crime Recordings · Public-record documentary
          archive
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