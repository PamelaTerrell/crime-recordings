import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditDocumentForm from "./edit-document-form";

type EditDocumentPageProps = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
};

export default async function EditDocumentPage({
  params,
}: EditDocumentPageProps) {
  const { id, documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: roleRecord, error: roleError } =
    await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    roleError ||
    (roleRecord?.role !== "admin" &&
      roleRecord?.role !== "editor")
  ) {
    redirect("/account");
  }

  const { data: caseRecord, error: caseError } =
    await supabase
      .from("cases")
      .select("id, title")
      .eq("id", id)
      .maybeSingle();

  if (caseError) {
    throw new Error(
      `Unable to load case: ${caseError.message}`,
    );
  }

  if (!caseRecord) {
    notFound();
  }

  const {
    data: documentRecord,
    error: documentError,
  } = await supabase
    .from("case_documents")
    .select(
      `
        id,
        case_id,
        title,
        description,
        source_name,
        source_reference,
        document_date,
        access_level,
        is_published,
        is_sensitive,
        sort_order,
        original_filename,
        mime_type,
        file_size_bytes
      `,
    )
    .eq("id", documentId)
    .eq("case_id", caseRecord.id)
    .maybeSingle();

  if (documentError) {
    throw new Error(
      `Unable to load document: ${documentError.message}`,
    );
  }

  if (!documentRecord) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#080b0f] px-5 py-10 text-[#f4f1e9] md:px-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <Link
            href={`/admin/cases/${caseRecord.id}`}
            className="text-sm font-bold text-[#e1c58f] underline underline-offset-4"
          >
            ← Back to case
          </Link>

          <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
            Document controls
          </p>

          <h1 className="mt-3 font-serif text-4xl font-medium md:text-6xl">
            Edit document
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-[#a8adb5]">
            Update the title, description, access,
            publication status, and display order for this
            document in the {caseRecord.title} case.
          </p>
        </div>

        <EditDocumentForm
          caseId={caseRecord.id}
          documentRecord={documentRecord}
        />
      </div>
    </main>
  );
}