import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditCaseForm from "./edit-case-form";


type EditCasePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCasePage({
  params,
}: EditCasePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: caseRecord, error } = await supabase
    .from("cases")
    .select(
      `
        id,
        title,
        subtitle,
        slug,
        summary,
        description,
        content_warning,
        location_city,
        location_state,
        location_country,
        incident_date,
        featured,
        status
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load case: ${error.message}`);
  }

  if (!caseRecord) {
    notFound();
  }

  return (
    <>
      <Link
        href={`/admin/cases/${caseRecord.id}`}
        className="admin-back-link"
      >
        ← Cancel editing
      </Link>

      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Editorial controls</p>

          <h1>Edit case</h1>

          <p>
            Update the case record, change its workflow status, and
            save corrections before publication.
          </p>
        </div>
      </div>

      <EditCaseForm caseRecord={caseRecord} />
    </>
  );
}