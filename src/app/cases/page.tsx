import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Case Archive | Crime Recordings",
  description:
    "Browse documented criminal cases with public-record audio, video, interviews, and investigative recordings.",
  alternates: {
    canonical: "/cases",
  },
  openGraph: {
    title: "Case Archive | Crime Recordings",
    description:
      "Browse documented criminal cases with public-record audio, video, interviews, and investigative recordings.",
    type: "website",
  },
};

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

function createLocation(
  city: string | null,
  state: string | null,
  country: string | null,
) {
  return (
    [city, state, country].filter(Boolean).join(", ") ||
    "Location not listed"
  );
}

type CasesArchivePageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CasesArchivePage({
  searchParams,
}: CasesArchivePageProps) {
  const { q = "" } = await searchParams;

  const rawSearchQuery = q.trim();
  const searchQuery = rawSearchQuery.toLowerCase();

  const supabase = await createClient();

  const { data: cases, error: casesError } = await supabase
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
    .eq("case_status", "published")
    .order("is_featured", {
      ascending: false,
    })
    .order("published_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (casesError) {
    throw new Error(
      `Unable to load published cases: ${casesError.message}`,
    );
  }

  const publishedCases = cases ?? [];

  const filteredCases = searchQuery
    ? publishedCases.filter((caseItem) => {
        const keywords = Array.isArray(caseItem.search_keywords)
          ? caseItem.search_keywords
          : [];

        const searchableText = [
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

        return searchableText.includes(searchQuery);
      })
    : publishedCases;

  const caseIds = filteredCases.map((caseItem) => caseItem.id);

  let recordingCounts = new Map<string, number>();
  let imageCounts = new Map<string, number>();
  let documentCounts = new Map<string, number>();

  const featuredVideoCases = new Set<string>();

  if (caseIds.length > 0) {
    /*
     * RECORDINGS
     * Includes audio and video records.
     */
    const { data: recordings, error: recordingsError } =
      await supabase
        .from("recordings")
        .select(
          `
            case_id,
            is_featured,
            mime_type
          `,
        )
        .in("case_id", caseIds)
        .eq("is_published", true);

    if (recordingsError) {
      throw new Error(
        `Unable to load recording totals: ${recordingsError.message}`,
      );
    }

    recordingCounts = new Map<string, number>();

    for (const recording of recordings ?? []) {
      const currentCount =
        recordingCounts.get(recording.case_id) ?? 0;

      recordingCounts.set(
        recording.case_id,
        currentCount + 1,
      );

      if (
        recording.is_featured &&
        recording.mime_type?.startsWith("video/")
      ) {
        featuredVideoCases.add(recording.case_id);
      }
    }

    /*
     * CASE IMAGES
     * Includes published crime-scene photos,
     * evidence images, screenshots, etc.
     */
  const { data: imageTotals, error: imagesError } =
  await supabase.rpc("get_case_image_counts");

if (imagesError) {
  throw new Error(
    `Unable to load image totals: ${imagesError.message}`,
  );
}

imageCounts = new Map<string, number>();

for (const imageTotal of imageTotals ?? []) {
  imageCounts.set(
    imageTotal.case_id,
    Number(imageTotal.image_count),
  );
}
     

    /*
     * DOCUMENTS
     * Includes PDFs, PowerPoints, reports,
     * and other published case documents.
     */
    const {
      data: documents,
      error: documentsError,
    } = await supabase
      .from("case_documents")
      .select("case_id")
      .in("case_id", caseIds)
      .eq("is_published", true);

    if (documentsError) {
      throw new Error(
        `Unable to load document totals: ${documentsError.message}`,
      );
    }

    documentCounts = new Map<string, number>();

    for (const document of documents ?? []) {
      const currentCount =
        documentCounts.get(document.case_id) ?? 0;

      documentCounts.set(
        document.case_id,
        currentCount + 1,
      );
    }
  }

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

        <nav className="flex items-center gap-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
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
            Public-record documentary archive
          </p>

          <h1 className="m-0 max-w-6xl font-serif text-[clamp(3.5rem,8vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.05em]">
            Case archive
          </h1>

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.35fr)] lg:items-end">
            <p className="m-0 max-w-4xl text-base leading-8 text-[#b8bcc2] md:text-lg">
              Explore documented criminal cases through original
              interviews, interrogations, dispatch calls, body-camera
              footage, courtroom recordings, crime-scene images,
              investigative documents, and other public-record media.
            </p>

            <div className="border-l border-[#c8a66a]/40 pl-6">
              <span className="block font-serif text-5xl text-[#e1c58f]">
                {searchQuery
                  ? filteredCases.length
                  : publishedCases.length}
              </span>

              <span className="mt-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                {searchQuery ? (
                  <>
                    Search{" "}
                    {filteredCases.length === 1
                      ? "result"
                      : "results"}
                  </>
                ) : (
                  <>
                    Published{" "}
                    {publishedCases.length === 1
                      ? "case"
                      : "cases"}
                  </>
                )}
              </span>
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
                Search the case archive
              </label>

              <input
                id="case-search"
                name="q"
                type="search"
                defaultValue={rawSearchQuery}
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
                  “{rawSearchQuery}”
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
              Search using the name of a victim, accused or convicted
              person, case title, city, state, or related keyword.
            </p>
          )}
        </div>
      </section>

      {/* CASE LIST */}
      <section className="px-5 py-6 md:px-10 md:py-8 lg:px-16 lg:py-8">
        <div className="mx-auto max-w-[1500px]">
          {filteredCases.length > 0 ? (
            <div className="overflow-hidden border border-white/10">
              {/* DESKTOP COLUMN LABELS */}
              <div className="hidden grid-cols-[56px_minmax(260px,1.5fr)_minmax(170px,0.7fr)_minmax(150px,0.65fr)_120px_42px] items-center gap-5 border-b border-white/10 bg-[#0a0e13] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84] lg:grid">
                <span>No.</span>
                <span>Case</span>
                <span>Location</span>
                <span>Incident date</span>
                <span>Files</span>
                <span aria-hidden="true" />
              </div>

              <div className="divide-y divide-white/10">
                {filteredCases.map((caseItem, index) => {
                  const location = createLocation(
                    caseItem.location_city,
                    caseItem.location_state,
                    caseItem.location_country,
                  );

                  const recordingCount =
                    recordingCounts.get(caseItem.id) ?? 0;

                  const imageCount =
                    imageCounts.get(caseItem.id) ?? 0;

                  const documentCount =
                    documentCounts.get(caseItem.id) ?? 0;

                  /*
                   * TOTAL ARCHIVE FILES
                   *
                   * recordings = audio + video
                   * images = case photographs/images
                   * documents = reports/PDFs/etc.
                   */
                  const archiveFileCount =
                    recordingCount +
                    imageCount +
                    documentCount;

                  const hasFeaturedVideo =
                    featuredVideoCases.has(caseItem.id);

                  return (
                    <Link
                      key={caseItem.id}
                      href={`/cases/${caseItem.slug}`}
                      className="group block bg-[#0d1218] px-5 py-5 transition hover:bg-[#121922] md:px-6"
                      aria-label={`Open ${caseItem.title}`}
                    >
                      <article className="grid gap-4 lg:grid-cols-[56px_minmax(260px,1.5fr)_minmax(170px,0.7fr)_minmax(150px,0.65fr)_120px_42px] lg:items-center lg:gap-5">
                        {/* CASE NUMBER */}
                        <div className="hidden font-serif text-lg text-[#8d744b] lg:block">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        {/* CASE TITLE */}
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="font-serif text-sm text-[#8d744b] lg:hidden">
                              {String(index + 1).padStart(
                                2,
                                "0",
                              )}
                            </span>

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
                          </div>

                          <h2 className="m-0 font-serif text-2xl font-medium leading-tight tracking-[-0.02em] transition group-hover:text-[#e1c58f] md:text-3xl">
                            {caseItem.title}
                          </h2>

                          {caseItem.subtitle ? (
                            <p className="mt-1 line-clamp-1 text-sm leading-6 text-[#a8adb5]">
                              {caseItem.subtitle}
                            </p>
                          ) : caseItem.summary ? (
                            <p className="mt-1 line-clamp-1 text-sm leading-6 text-[#8f959e]">
                              {caseItem.summary}
                            </p>
                          ) : null}
                        </div>

                        {/* LOCATION */}
                        <div className="text-sm leading-6 text-[#c8cbd0]">
                          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76] lg:hidden">
                            Location
                          </span>

                          {location}
                        </div>

                        {/* INCIDENT DATE */}
                        <div className="text-sm leading-6 text-[#c8cbd0]">
                          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76] lg:hidden">
                            Incident date
                          </span>

                          {formatDate(caseItem.incident_date)}
                        </div>

                        {/* FILE COUNT */}
                        <div>
                          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76] lg:hidden">
                            Archive files
                          </span>

                          <span className="inline-flex items-center border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#a8adb5]">
                            {archiveFileCount}{" "}
                            {archiveFileCount === 1
                              ? "file"
                              : "files"}
                          </span>
                        </div>

                        {/* ARROW */}
                        <div className="hidden justify-end text-xl text-[#c8a66a] transition-transform group-hover:translate-x-1 lg:flex">
                          <span aria-hidden="true">→</span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : searchQuery ? (
            /* NO SEARCH RESULTS */
            <div className="grid min-h-[40vh] place-items-center border border-white/10 bg-[#10151b] px-6 py-16 text-center">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
                  No matching cases
                </p>

                <h2 className="mt-5 font-serif text-4xl font-medium md:text-6xl">
                  We could not find that name
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#a8adb5]">
                  No published case currently matches “
                  {rawSearchQuery}.” Try another name, location, or
                  keyword.
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
                  Archive preparation
                </p>

                <h2 className="mt-5 font-serif text-4xl font-medium md:text-6xl">
                  The first case is being prepared
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#a8adb5]">
                  Published cases will appear here after their facts,
                  media, and content warnings have been reviewed.
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
              Public case information. Secure media access.
            </h2>

            <p className="mt-5 max-w-3xl leading-8 text-[#a8adb5]">
              Published case facts are available publicly. Some
              complete recordings may require an active membership.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* FOOTER */}
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