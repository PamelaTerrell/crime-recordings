import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaseDangerActions from "./case-danger-actions";
import RecordingPlayer from "./recording-player";

export default async function AdminCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
        case_status,
        victim_names,
        accused_names,
        location_city,
        location_state,
        location_country,
        incident_date,
        content_warning,
        is_featured,
        created_at,
        updated_at
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !caseItem) {
    notFound();
  }

  const { data: recordings, error: recordingsError } = await supabase
    .from("recordings")
    .select(
      `
        id,
        title,
        recording_type,
        original_filename,
        mime_type,
        file_size_bytes,
        access_level,
        is_published,
        is_featured,
        sort_order,
        created_at
      `,
    )
    .eq("case_id", caseItem.id)
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (recordingsError) {
    throw new Error(
      `Unable to load recordings: ${recordingsError.message}`,
    );
  }

  const location =
    [
      caseItem.location_city,
      caseItem.location_state,
      caseItem.location_country,
    ]
      .filter(Boolean)
      .join(", ") || "Not entered";

  return (
    <section>
      <Link href="/admin" className="admin-back-link">
        ← Back to case archive
      </Link>

      <div className="admin-case-detail-heading">
        <div>
          <p className="admin-eyebrow">
            {caseItem.case_status} case
          </p>

          <h1>{caseItem.title}</h1>

          {caseItem.subtitle ? <p>{caseItem.subtitle}</p> : null}
        </div>

        <div className="admin-case-heading-actions">
          <span className="admin-status">
            {caseItem.case_status}
          </span>

          <Link
            href={`/admin/cases/${caseItem.id}/recordings/new`}
            className="admin-primary-link"
          >
            Add media
          </Link>

          <Link
  href={`/admin/cases/${caseItem.id}/images/new`}
  className="admin-primary-link"
>
  Add images
</Link>

          <Link
            href={`/admin/cases/${caseItem.id}/edit`}
            className="admin-primary-link"
          >
            Edit case
          </Link>
        </div>
      </div>

      <div className="admin-detail-grid">
        <article className="admin-detail-card">
          <span>Slug</span>
          <strong>{caseItem.slug}</strong>
        </article>

        <article className="admin-detail-card">
          <span>Location</span>
          <strong>{location}</strong>
        </article>

        <article className="admin-detail-card">
          <span>Incident date</span>
          <strong>{caseItem.incident_date ?? "Not entered"}</strong>
        </article>

        <article className="admin-detail-card">
          <span>Featured</span>
          <strong>{caseItem.is_featured ? "Yes" : "No"}</strong>
        </article>
      </div>

      <div className="admin-reading-panel">
        <section>
          <h2>Victim(s)</h2>

          <p>
            {caseItem.victim_names ??
              "No victim names have been entered yet."}
          </p>
        </section>

        <section>
          <h2>Accused or convicted person(s)</h2>

          <p>
            {caseItem.accused_names ??
              "No accused or convicted individuals have been entered yet."}
          </p>
        </section>

        <section>
          <h2>Summary</h2>

          <p>{caseItem.summary ?? "No summary entered yet."}</p>
        </section>

        <section>
          <h2>Detailed description</h2>

          <p>
            {caseItem.description ??
              "No detailed description entered yet."}
          </p>
        </section>

        <section>
          <h2>Content warning</h2>

          <p>
            {caseItem.content_warning ??
              "No content warning entered yet."}
          </p>
        </section>
      </div>

      <section className="mt-9">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="admin-eyebrow">Case media</p>

            <h2 className="m-0 font-serif text-4xl font-medium text-[#f4f1e9] md:text-5xl">
              Audio and video
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-[#a8adb5]">
              Audio and video files remain private in Cloudflare R2.
              Load the secure player to review each recording.
            </p>
          </div>

          <Link
            href={`/admin/cases/${caseItem.id}/recordings/new`}
            className="admin-primary-link"
          >
            Add media
          </Link>
        </div>

        {recordings && recordings.length > 0 ? (
          <div className="grid gap-4">
            {recordings.map((recording) => (
              <RecordingPlayer
                key={recording.id}
                recordingId={recording.id}
                title={recording.title}
                recordingType={recording.recording_type}
                originalFilename={recording.original_filename}
                mimeType={recording.mime_type}
                fileSizeBytes={recording.file_size_bytes}
                accessLevel={recording.access_level}
                isPublished={recording.is_published}
                isFeatured={recording.is_featured}
                sortOrder={recording.sort_order}
              />
            ))}
          </div>
        ) : (
          <div className="border border-white/10 bg-[#10151b] p-7">
            <p className="m-0 text-[#a8adb5]">
              No audio or video has been added to this case yet.
            </p>
          </div>
        )}
      </section>

      <div className="admin-coming-next">
        <p className="admin-eyebrow">Next stage</p>

        <h2>Build out the case archive</h2>

        <p>
          This case now supports secure audio and video uploads,
          private administrative playback, recording editing,
          publishing controls, sorting, and deletion. Future tools
          can add transcripts, chapter markers, source agencies, and
          member-facing playback.
        </p>
      </div>

      <CaseDangerActions
        caseId={caseItem.id}
        caseTitle={caseItem.title}
        caseStatus={caseItem.case_status}
      />
    </section>
  );
}