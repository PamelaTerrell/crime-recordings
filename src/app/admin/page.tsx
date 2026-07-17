import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: cases, error } = await supabase
    .from("cases")
    .select(
      "id, title, slug, case_status, is_featured, updated_at, published_at",
    )
    .order("updated_at", { ascending: false });

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Editorial dashboard</p>
          <h1>Case archive</h1>
          <p>
            Create, organize, review, and eventually publish the cases in the
            Crime Recordings archive.
          </p>
        </div>

        <Link href="/admin/cases/new" className="admin-primary-link">
          Create a new case
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {error ? (
        <div className="admin-alert admin-alert-error">
          The case list could not be loaded.
        </div>
      ) : cases && cases.length > 0 ? (
        <div className="admin-case-list">
          {cases.map((caseItem) => (
            <article className="admin-case-row" key={caseItem.id}>
              <div>
                <span className="admin-status">
                  {caseItem.case_status}
                </span>

                <h2>{caseItem.title}</h2>

                <p>/{caseItem.slug}</p>
              </div>

              <div className="admin-case-meta">
                {caseItem.is_featured && <span>Featured</span>}

                <time dateTime={caseItem.updated_at}>
                  Updated{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(caseItem.updated_at))}
                </time>

                <Link href={`/admin/cases/${caseItem.id}`}>
                  Open case →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <p className="admin-eyebrow">No cases yet</p>
          <h2>Create the first Crime Recordings case.</h2>
          <p>
            It will be saved privately as a draft and will not appear on the
            public website.
          </p>

          <Link href="/admin/cases/new" className="admin-primary-link">
            Create the first case
          </Link>
        </div>
      )}
    </section>
  );
}