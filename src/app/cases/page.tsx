import type { Metadata } from "next";
import Link from "next/link";
import {
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  r2BucketName,
  r2Client,
} from "@/lib/r2";

const siteUrl =
  "https://www.crimerecordings.com";

type CasesArchivePageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: CasesArchivePageProps): Promise<Metadata> {
  const { q = "" } = await searchParams;

  const hasSearch =
    q.trim().length > 0;

  const title =
    "True Crime Case Archive";

  const description =
    "Browse documented true-crime cases with police interviews, interrogations, 911 calls, body-camera footage, crime-scene photographs, video evidence, investigative documents, and other public-record materials.";

  return {
    title,

    description,

    alternates: {
      canonical: "/cases",
    },

    robots: hasSearch
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
        },

    openGraph: {
      type: "website",
      locale: "en_US",
      url: `${siteUrl}/cases`,
      siteName: "Crime Recordings",
      title:
        "True Crime Case Archive | Crime Recordings",
      description:
        "Explore documented true-crime cases through police recordings, 911 calls, body-camera footage, crime-scene photographs, investigative documents, and other public records.",
      images: [
        {
          url: "/crime-recordings-logo.png",
          width: 1200,
          height: 1200,
          alt:
            "Crime Recordings true crime case archive",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title:
        "True Crime Case Archive | Crime Recordings",
      description:
        "Browse true-crime case archives containing police recordings, photographs, documents, video evidence, and other public records.",
      images: [
        "/crime-recordings-logo.png",
      ],
    },
  };
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Date not listed";
  }

  const parsedDate =
    new Date(`${value}T12:00:00`);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  ).format(parsedDate);
}

function createLocation(
  city: string | null,
  state: string | null,
  country: string | null,
) {
  return (
    [
      city,
      state,
      country,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Location not listed"
  );
}

async function createCaseThumbnailUrls(
  thumbnailObjectKeys:
    Map<string, string>,
) {
  const thumbnailEntries =
    Array.from(
      thumbnailObjectKeys.entries(),
    );

  const results =
    await Promise.all(
      thumbnailEntries.map(
        async ([
          caseId,
          objectKey,
        ]) => {
          try {
            const command =
              new GetObjectCommand({
                Bucket:
                  r2BucketName,
                Key: objectKey,
                ResponseContentDisposition:
                  "inline",
              });

            const thumbnailUrl =
              await getSignedUrl(
                r2Client,
                command,
                {
                  expiresIn:
                    60 * 60,
                },
              );

            return [
              caseId,
              thumbnailUrl,
            ] as const;
          } catch (error) {
            console.error(
              `Unable to prepare archive thumbnail for case ${caseId}:`,
              error,
            );

            return null;
          }
        },
      ),
    );

  return new Map<
    string,
    string
  >(
    results.filter(
      (
        result,
      ): result is readonly [
        string,
        string,
      ] => result !== null,
    ),
  );
}

export default async function CasesArchivePage({
  searchParams,
}: CasesArchivePageProps) {
  const { q = "" } =
    await searchParams;

  const rawSearchQuery =
    q.trim();

  const searchQuery =
    rawSearchQuery.toLowerCase();

  const supabase =
    await createClient();

  /*
   * PUBLISHED CASES
   */
  const {
    data: cases,
    error: casesError,
  } = await supabase
    .from("cases")
    .select(
      `
        id,
        title,
        subtitle,
        slug,
        summary,
        victim_names,
        accused_names,
        search_keywords,
        incident_date,
        location_city,
        location_state,
        location_country,
        is_featured,
        published_at,
        created_at
      `,
    )
    .eq(
      "case_status",
      "published",
    )
    .order(
      "is_featured",
      {
        ascending: false,
      },
    )
    .order(
      "published_at",
      {
        ascending: false,
        nullsFirst: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (casesError) {
    throw new Error(
      `Unable to load published cases: ${casesError.message}`,
    );
  }

  const publishedCases =
    cases ?? [];

  /*
   * ARCHIVE SEARCH
   */
  const filteredCases =
    searchQuery
      ? publishedCases.filter(
          (caseItem) => {
            const keywords =
              Array.isArray(
                caseItem.search_keywords,
              )
                ? caseItem.search_keywords
                : [];

            const searchableText =
              [
                caseItem.title,
                caseItem.subtitle,
                caseItem.summary,
                caseItem.victim_names,
                caseItem.accused_names,
                caseItem.location_city,
                caseItem.location_state,
                caseItem.location_country,
                ...keywords,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
              searchQuery,
            );
          },
        )
      : publishedCases;

  const caseIds =
    filteredCases.map(
      (caseItem) =>
        caseItem.id,
    );

  const recordingCounts =
    new Map<
      string,
      number
    >();

  const imageCounts =
    new Map<
      string,
      number
    >();

  const documentCounts =
    new Map<
      string,
      number
    >();

  let caseThumbnailUrls =
    new Map<
      string,
      string
    >();

  const featuredVideoCases =
    new Set<string>();

  if (caseIds.length > 0) {
    /*
     * PUBLIC ARCHIVE COUNTS
     *
     * The RPC returns aggregate-only
     * published inventory totals. It
     * intentionally includes public
     * and member material without
     * exposing the underlying rows.
     */
    const {
      data: archiveCounts,
      error: archiveCountsError,
    } = await supabase.rpc(
      "get_published_case_archive_counts",
    );

    if (archiveCountsError) {
      throw new Error(
        `Unable to load archive totals: ${archiveCountsError.message}`,
      );
    }

    for (
      const archiveCount of
        archiveCounts ?? []
    ) {
      if (!caseIds.includes(archiveCount.case_id)) {
        continue;
      }

      recordingCounts.set(
        archiveCount.case_id,
        Number(archiveCount.recording_count),
      );
      imageCounts.set(
        archiveCount.case_id,
        Number(archiveCount.image_count),
      );
      documentCounts.set(
        archiveCount.case_id,
        Number(archiveCount.document_count),
      );
    }

    /*
     * PUBLIC RECORDING METADATA
     *
     * This query is explicitly limited
     * to public recordings and supplies
     * only the card badge and fallback
     * thumbnail data needed for display.
     */
    const {
      data: publicRecordings,
      error: publicRecordingsError,
    } = await supabase
      .from("recordings")
      .select(
        `
          case_id,
          is_featured,
          mime_type,
          thumbnail_object_key,
          sort_order,
          created_at
        `,
      )
      .in("case_id", caseIds)
      .eq("is_published", true)
      .eq("access_level", "public")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (publicRecordingsError) {
      throw new Error(
        `Unable to load public recording metadata: ${publicRecordingsError.message}`,
      );
    }

    const thumbnailObjectKeys = new Map<string, string>();

    for (const recording of publicRecordings ?? []) {
      if (
        recording.is_featured &&
        recording.mime_type?.startsWith("video/")
      ) {
        featuredVideoCases.add(recording.case_id);
      }

      if (
        recording.thumbnail_object_key &&
        !thumbnailObjectKeys.has(recording.case_id)
      ) {
        thumbnailObjectKeys.set(
          recording.case_id,
          recording.thumbnail_object_key,
        );
      }
    }

    /*
     * EXPLICIT PUBLIC TEASERS
     *
     * The server-only client reads only
     * the designated thumbnail key and
     * case id. No recording media key or
     * other protected metadata is read.
     */
    const {
      data: recordingTeasers,
      error: recordingTeasersError,
    } = await supabaseAdmin
      .from("recordings")
      .select("case_id, thumbnail_object_key")
      .in("case_id", caseIds)
      .eq("is_published", true)
      .eq("is_public_teaser", true);

    if (recordingTeasersError) {
      throw new Error(
        `Unable to load recording teaser thumbnails: ${recordingTeasersError.message}`,
      );
    }

    for (const teaser of recordingTeasers ?? []) {
      if (teaser.thumbnail_object_key) {
        thumbnailObjectKeys.set(
          teaser.case_id,
          teaser.thumbnail_object_key,
        );
      }
    }

    /*
     * EXPLICIT CASE-IMAGE TEASERS
     *
     * These intentionally approved image
     * objects take priority over recording
     * teasers. The object key remains in this
     * Server Component and is used only to
     * produce the signed archive-card URL.
     */
    const {
      data: imageTeasers,
      error: imageTeasersError,
    } = await supabaseAdmin
      .from("case_images")
      .select("case_id, object_key")
      .in("case_id", caseIds)
      .eq("is_published", true)
      .eq("is_public_teaser", true);

    if (imageTeasersError) {
      throw new Error(
        `Unable to load case-image teaser thumbnails: ${imageTeasersError.message}`,
      );
    }

    for (const teaser of imageTeasers ?? []) {
      if (teaser.object_key) {
        thumbnailObjectKeys.set(
          teaser.case_id,
          teaser.object_key,
        );
      }
    }

    caseThumbnailUrls = await createCaseThumbnailUrls(
      thumbnailObjectKeys,
    );
  }

  /*
   * TOTALS FOR CURRENT VIEW
   */
  const totalRecordings =
    Array.from(
      recordingCounts.values(),
    ).reduce(
      (
        total,
        count,
      ) => total + count,
      0,
    );

  const totalImages =
    Array.from(
      imageCounts.values(),
    ).reduce(
      (
        total,
        count,
      ) => total + count,
      0,
    );

  const totalDocuments =
    Array.from(
      documentCounts.values(),
    ).reduce(
      (
        total,
        count,
      ) => total + count,
      0,
    );

  return (
    <main className="min-h-screen bg-[#080b0f] text-[#f4f1e9]">
      {/* HEADER */}
      <header className="flex min-h-20 items-center justify-between gap-6 border-b border-white/10 px-5 py-4 md:px-10 lg:px-16">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-tight text-[#f4f1e9]"
        >
          Crime Recordings
        </Link>

        <nav
          className="flex items-center gap-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]"
          aria-label="Primary navigation"
        >
          <Link
            href="/cases"
            className="text-[#e1c58f]"
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

      {/* ARCHIVE HERO */}
      <section className="border-b border-white/10 px-5 py-12 md:px-10 md:py-14 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
            Public-record documentary
            archive
          </p>

          <h1 className="m-0 max-w-6xl font-serif text-[clamp(3.5rem,8vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.05em]">
            Case archive
          </h1>

          <div className="mt-7 grid gap-10 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <p className="m-0 max-w-4xl text-base leading-8 text-[#b8bcc2] md:text-lg">
              Explore documented
              criminal cases through
              original interviews,
              interrogations, dispatch
              calls, body-camera
              footage, courtroom
              recordings, crime-scene
              images, investigative
              documents, and other
              public-record media.
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-l border-[#c8a66a]/40 pl-6 sm:grid-cols-4">
              <div>
                <span className="block font-serif text-4xl text-[#e1c58f]">
                  {searchQuery
                    ? filteredCases.length
                    : publishedCases.length}
                </span>

                <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  {searchQuery
                    ? "Results"
                    : "Cases"}
                </span>
              </div>

              <div>
                <span className="block font-serif text-4xl text-[#d5d7da]">
                  {
                    totalRecordings
                  }
                </span>

                <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Recordings
                </span>
              </div>

              <div>
                <span className="block font-serif text-4xl text-[#d5d7da]">
                  {totalImages}
                </span>

                <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Images
                </span>
              </div>

              <div>
                <span className="block font-serif text-4xl text-[#d5d7da]">
                  {
                    totalDocuments
                  }
                </span>

                <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Documents
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="border-b border-white/10 bg-[#0b0f14] px-5 py-5 md:px-10 md:py-6 lg:px-16">
        <div className="mx-auto max-w-[1500px]">
          <form
            action="/cases"
            method="get"
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <label
                htmlFor="case-search"
                className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8f959e]"
              >
                Search the case
                archive
              </label>

              <input
                id="case-search"
                name="q"
                type="search"
                defaultValue={
                  rawSearchQuery
                }
                placeholder="Search by case, victim, accused, location, or keyword"
                className="min-h-14 w-full border border-white/15 bg-[#080b0f] px-4 text-base text-[#f4f1e9] outline-none transition placeholder:text-[#666d76] focus:border-[#c8a66a]"
              />
            </div>

            <button
              type="submit"
              className="min-h-14 self-end border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111318] transition hover:bg-[#e1c58f]"
            >
              Search cases
            </button>
          </form>

          {searchQuery ? (
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <p className="m-0 text-sm text-[#a8adb5]">
                Showing results for{" "}
                <span className="text-[#f4f1e9]">
                  “
                  {
                    rawSearchQuery
                  }
                  ”
                </span>
              </p>

              <Link
                href="/cases"
                className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#e1c58f] transition hover:text-[#f4f1e9]"
              >
                Clear search
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#747b84]">
              Search using the name
              of a victim, accused or
              convicted person, case
              title, city, state, or
              related keyword.
            </p>
          )}
        </div>
      </section>

      {/* CASE ARCHIVE */}
      <section className="px-5 py-8 md:px-10 md:py-10 lg:px-16">
        <div className="mx-auto max-w-[1500px]">
          {filteredCases.length >
          0 ? (
            <div className="grid gap-4">
              {filteredCases.map(
                (
                  caseItem,
                  index,
                ) => {
                  const location =
                    createLocation(
                      caseItem.location_city,
                      caseItem.location_state,
                      caseItem.location_country,
                    );

                  const recordingCount =
                    recordingCounts.get(
                      caseItem.id,
                    ) ?? 0;

                  const imageCount =
                    imageCounts.get(
                      caseItem.id,
                    ) ?? 0;

                  const documentCount =
                    documentCounts.get(
                      caseItem.id,
                    ) ?? 0;

                  const archiveFileCount =
                    recordingCount +
                    imageCount +
                    documentCount;

                  const hasFeaturedVideo =
                    featuredVideoCases.has(
                      caseItem.id,
                    );

                  const caseThumbnailUrl =
                    caseThumbnailUrls.get(
                      caseItem.id,
                    ) ?? null;

                  return (
                    <Link
                      key={
                        caseItem.id
                      }
                      href={`/cases/${caseItem.slug}`}
                      className="group block overflow-hidden border border-white/10 bg-[#0d1218] transition hover:border-[#c8a66a]/35 hover:bg-[#111821]"
                      aria-label={`Open ${caseItem.title}`}
                    >
                      <article className="grid md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[56px_220px_minmax(280px,1.4fr)_minmax(160px,0.65fr)_minmax(150px,0.62fr)_minmax(150px,0.62fr)_42px] lg:items-center">
                        {/* NUMBER */}
                        <div className="hidden px-5 font-serif text-lg text-[#8d744b] lg:block">
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </div>

                        {/* THUMBNAIL */}
                        <div className="relative overflow-hidden bg-black md:min-h-full">
                          {caseThumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                caseThumbnailUrl
                              }
                              alt={`${caseItem.title} case archive thumbnail`}
                              loading="lazy"
                              decoding="async"
                              className="aspect-video h-full min-h-[155px] w-full object-cover transition duration-300 group-hover:scale-[1.025] md:aspect-auto"
                            />
                          ) : (
                            <div className="grid aspect-video min-h-[155px] place-items-center bg-[#090c10] px-6 text-center md:aspect-auto md:h-full">
                              <div>
                                <span className="font-serif text-2xl text-[#8d744b]">
                                  CR
                                </span>

                                <p className="mt-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#555c65]">
                                  Crime
                                  Recordings
                                </p>
                              </div>
                            </div>
                          )}

                          <span className="absolute left-3 top-3 border border-white/15 bg-black/75 px-2 py-1 font-serif text-sm text-[#c8a66a] backdrop-blur-sm lg:hidden">
                            {String(
                              index + 1,
                            ).padStart(
                              2,
                              "0",
                            )}
                          </span>
                        </div>

                        {/* CASE */}
                        <div className="min-w-0 px-5 py-6 md:px-6">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            {caseItem.is_featured ? (
                              <span className="border border-[#c8a66a]/60 bg-[#c8a66a]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#e1c58f]">
                                Featured
                              </span>
                            ) : null}

                            {hasFeaturedVideo ? (
                              <span className="border border-white/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#9298a1]">
                                Video
                              </span>
                            ) : null}

                            {imageCount >
                            0 ? (
                              <span className="border border-white/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#9298a1]">
                                {
                                  imageCount
                                }{" "}
                                {imageCount ===
                                1
                                  ? "Image"
                                  : "Images"}
                              </span>
                            ) : null}
                          </div>

                          <h2 className="m-0 font-serif text-2xl font-medium leading-tight tracking-[-0.02em] text-[#f4f1e9] transition group-hover:text-[#e1c58f] md:text-3xl">
                            {
                              caseItem.title
                            }
                          </h2>

                          {caseItem.subtitle ? (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#a8adb5]">
                              {
                                caseItem.subtitle
                              }
                            </p>
                          ) : caseItem.summary ? (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#8f959e]">
                              {
                                caseItem.summary
                              }
                            </p>
                          ) : null}

                          {/* MOBILE META */}
                          <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 text-sm md:grid-cols-2 lg:hidden">
                            <div>
                              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76]">
                                Location
                              </span>

                              <span className="mt-1 block text-[#c8cbd0]">
                                {
                                  location
                                }
                              </span>
                            </div>

                            <div>
                              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76]">
                                Incident
                                date
                              </span>

                              <span className="mt-1 block text-[#c8cbd0]">
                                {formatDate(
                                  caseItem.incident_date,
                                )}
                              </span>
                            </div>

                            <div className="md:col-span-2">
                              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76]">
                                Archive
                              </span>

                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#a8adb5]">
                                <span>
                                  {
                                    recordingCount
                                  }{" "}
                                  {recordingCount ===
                                  1
                                    ? "recording"
                                    : "recordings"}
                                </span>

                                <span className="text-[#e1c58f]">
                                  {
                                    imageCount
                                  }{" "}
                                  {imageCount ===
                                  1
                                    ? "image"
                                    : "images"}
                                </span>

                                <span>
                                  {
                                    documentCount
                                  }{" "}
                                  {documentCount ===
                                  1
                                    ? "document"
                                    : "documents"}
                                </span>

                                <span className="text-[#666d76]">
                                  {
                                    archiveFileCount
                                  }{" "}
                                  total
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* DESKTOP LOCATION */}
                        <div className="hidden px-4 text-sm leading-6 text-[#c8cbd0] lg:block">
                          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76]">
                            Location
                          </span>

                          {
                            location
                          }
                        </div>

                        {/* DESKTOP DATE */}
                        <div className="hidden px-4 text-sm leading-6 text-[#c8cbd0] lg:block">
                          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76]">
                            Incident
                          </span>

                          {formatDate(
                            caseItem.incident_date,
                          )}
                        </div>

                        {/* DESKTOP ARCHIVE COUNTS */}
                        <div className="hidden px-4 lg:block">
                          <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76]">
                            Archive
                          </span>

                          <div className="flex flex-col gap-1 text-[10px] font-extrabold uppercase tracking-[0.07em] text-[#a8adb5]">
                            {recordingCount >
                            0 ? (
                              <span>
                                {
                                  recordingCount
                                }{" "}
                                {recordingCount ===
                                1
                                  ? "recording"
                                  : "recordings"}
                              </span>
                            ) : null}

                            {imageCount >
                            0 ? (
                              <span className="text-[#e1c58f]">
                                {
                                  imageCount
                                }{" "}
                                {imageCount ===
                                1
                                  ? "image"
                                  : "images"}
                              </span>
                            ) : null}

                            {documentCount >
                            0 ? (
                              <span>
                                {
                                  documentCount
                                }{" "}
                                {documentCount ===
                                1
                                  ? "document"
                                  : "documents"}
                              </span>
                            ) : null}

                            <span className="mt-1 text-[#666d76]">
                              {
                                archiveFileCount
                              }{" "}
                              total
                            </span>
                          </div>
                        </div>

                        {/* ARROW */}
                        <div className="hidden justify-end pr-5 text-xl text-[#c8a66a] transition-transform group-hover:translate-x-1 lg:flex">
                          <span
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                },
              )}
            </div>
          ) : searchQuery ? (
            /* NO SEARCH RESULTS */
            <div className="grid min-h-[40vh] place-items-center border border-white/10 bg-[#10151b] px-6 py-16 text-center">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
                  No matching
                  cases
                </p>

                <h2 className="mt-5 font-serif text-4xl font-medium md:text-6xl">
                  We could not
                  find that name
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#a8adb5]">
                  No published
                  case currently
                  matches “
                  {
                    rawSearchQuery
                  }
                  .” Try another
                  name, location,
                  or keyword.
                </p>

                <Link
                  href="/cases"
                  className="mt-8 inline-flex min-h-12 items-center justify-center border border-[#c8a66a] px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-[#e1c58f] transition hover:bg-[#c8a66a] hover:text-[#111318]"
                >
                  View all cases
                </Link>
              </div>
            </div>
          ) : (
            /* NO PUBLISHED CASES */
            <div className="grid min-h-[40vh] place-items-center border border-white/10 bg-[#10151b] px-6 py-16 text-center">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
                  Archive
                  preparation
                </p>

                <h2 className="mt-5 font-serif text-4xl font-medium md:text-6xl">
                  The first case is
                  being prepared
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#a8adb5]">
                  Published cases
                  will appear here
                  after their facts,
                  media, and content
                  warnings have been
                  reviewed.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ARCHIVE ACCESS */}
      <section className="border-t border-white/10 bg-[#0b0f14] px-5 py-16 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
              Archive access
            </p>

            <h2 className="mt-4 max-w-4xl font-serif text-4xl font-medium md:text-5xl">
              Public case
              information. Secure
              media access.
            </h2>

            <p className="mt-5 max-w-3xl leading-8 text-[#a8adb5]">
              Published case facts
              are available
              publicly. Some
              complete recordings,
              images, and extended
              case materials may
              require an active
              membership.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/membership"
              className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
            >
              View membership
            </Link>

            <Link
              href="/login"
              className="inline-flex min-h-14 items-center justify-center border border-white/15 px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="flex flex-col justify-between gap-5 border-t border-white/10 px-5 py-10 text-sm text-[#747b84] md:flex-row md:px-10 lg:px-16">
        <div>
          <p className="m-0">
            Crime Recordings ·
            Public-record
            documentary archive
          </p>

          <p className="mt-2 text-xs text-[#555c65]">
            Real cases. Original
            source materials.
          </p>
        </div>

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
