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

export default async function CasesArchivePage() {
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
  const caseIds = publishedCases.map((caseItem) => caseItem.id);

  let recordingCounts = new Map<string, number>();
  let featuredVideoCases = new Set<string>();

  if (caseIds.length > 0) {
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
  }

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

      <section className="border-b border-white/10 px-5 py-20 md:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-[1500px]">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.24em] text-[#e1c58f]">
            Public-record documentary archive
          </p>

          <h1 className="m-0 max-w-6xl font-serif text-[clamp(4rem,10vw,9rem)] font-medium leading-[0.88] tracking-[-0.055em]">
            Case archive
          </h1>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.45fr)] lg:items-end">
            <p className="m-0 max-w-4xl text-lg leading-9 text-[#b8bcc2] md:text-xl">
              Explore documented criminal cases through original
              interviews, interrogations, dispatch calls, body-camera
              footage, courtroom recordings, and other public-record
              media.
            </p>

            <div className="border-l border-[#c8a66a]/40 pl-6">
              <span className="block font-serif text-5xl text-[#e1c58f]">
                {publishedCases.length}
              </span>

              <span className="mt-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                Published{" "}
                {publishedCases.length === 1
                  ? "case"
                  : "cases"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 md:px-10 lg:px-16 lg:py-14">
  <div className="mx-auto max-w-[1500px]">
    {publishedCases.length > 0 ? (
      <div className="overflow-hidden border border-white/10">
        {/* Desktop column headings */}
        <div className="hidden grid-cols-[56px_minmax(260px,1.5fr)_minmax(170px,0.7fr)_minmax(150px,0.65fr)_120px_42px] items-center gap-5 border-b border-white/10 bg-[#0a0e13] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84] lg:grid">
          <span>No.</span>
          <span>Case</span>
          <span>Location</span>
          <span>Incident date</span>
          <span>Files</span>
          <span aria-hidden="true" />
        </div>

        <div className="divide-y divide-white/10">
          {publishedCases.map((caseItem, index) => {
            const location = createLocation(
              caseItem.location_city,
              caseItem.location_state,
              caseItem.location_country,
            );

            const recordingCount =
              recordingCounts.get(caseItem.id) ?? 0;

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
                  <div className="hidden font-serif text-lg text-[#8d744b] lg:block">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-serif text-sm text-[#8d744b] lg:hidden">
                        {String(index + 1).padStart(2, "0")}
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

                  <div className="text-sm leading-6 text-[#c8cbd0]">
                    <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76] lg:hidden">
                      Location
                    </span>

                    {location}
                  </div>

                  <div className="text-sm leading-6 text-[#c8cbd0]">
                    <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76] lg:hidden">
                      Incident date
                    </span>

                    {formatDate(caseItem.incident_date)}
                  </div>

                  <div>
                    <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#666d76] lg:hidden">
                      Archive files
                    </span>

                    <span className="inline-flex items-center border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#a8adb5]">
                      {recordingCount}{" "}
                      {recordingCount === 1 ? "file" : "files"}
                    </span>
                  </div>

                  <div className="hidden justify-end text-xl text-[#c8a66a] transition-transform group-hover:translate-x-1 lg:flex">
                    <span aria-hidden="true">→</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    ) : (
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
              Published case facts are available publicly. Some complete
              recordings may require an active membership.
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