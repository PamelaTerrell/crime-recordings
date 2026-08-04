import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DocumentUploadForm from "./DocumentUploadForm";
import { createClient } from "@/lib/supabase/server";

type NewDocumentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewDocumentPage({
  params,
}: NewDocumentPageProps) {
  const { id } = await params;

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

  if (caseError || !caseRecord) {
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
            Case document
          </p>

          <h1 className="mt-3 font-serif text-4xl font-medium md:text-6xl">
            Upload a PDF
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-[#a8adb5]">
            Add a PDF document to the {caseRecord.title} case.
          </p>
        </div>

        <DocumentUploadForm caseId={caseRecord.id} />
      </div>
    </main>
  );
}