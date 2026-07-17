import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
      "id, title, subtitle, slug, summary, description, case_status, location_city, location_state, location_country, incident_date, content_warning, is_featured, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !caseItem) {
    notFound();
  }

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

          {caseItem.subtitle && <p>{caseItem.subtitle}</p>}
        </div>

        <span className="admin-status">
          {caseItem.case_status}
        </span>
      </div>

      <div className="admin-detail-grid">
        <article className="admin-detail-card">
          <span>Slug</span>
          <strong>{caseItem.slug}</strong>
        </article>

        <article className="admin-detail-card">
          <span>Location</span>
          <strong>
            {[
              caseItem.location_city,
              caseItem.location_state,
              caseItem.location_country,
            ]
              .filter(Boolean)
              .join(", ") || "Not entered"}
          </strong>
        </article>

        <article className="admin-detail-card">
          <span>Incident date</span>
          <strong>
            {caseItem.incident_date ?? "Not entered"}
          </strong>
        </article>

        <article className="admin-detail-card">
          <span>Featured</span>
          <strong>{caseItem.is_featured ? "Yes" : "No"}</strong>
        </article>
      </div>

      <div className="admin-reading-panel">
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

      <div className="admin-coming-next">
        <p className="admin-eyebrow">Next stage</p>
        <h2>Case editing and source management</h2>
        <p>
          The next admin tools will allow this draft to be edited and linked
          to source agencies and recordings.
        </p>
      </div>
    </section>
  );
}