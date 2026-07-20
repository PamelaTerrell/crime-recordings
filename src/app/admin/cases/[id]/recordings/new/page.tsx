import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AudioUploadForm from "./audio-upload-form";

type NewRecordingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewRecordingPage({
  params,
}: NewRecordingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: caseRecord, error } = await supabase
    .from("cases")
    .select(`
      id,
      title,
      victim_names,
      accused_names,
      incident_date,
      location_city,
      location_state
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load case: ${error.message}`,
    );
  }

  if (!caseRecord) {
    notFound();
  }

  const location = [
    caseRecord.location_city,
    caseRecord.location_state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main>
      <Link
        href={`/admin/cases/${caseRecord.id}`}
        className="mb-8 inline-block text-sm text-[#e1c58f] transition hover:text-[#f4f1e9]"
      >
        ← Back to case
      </Link>

      <header className="mb-12">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
          Add audio
        </p>

        <h1 className="max-w-4xl font-serif text-5xl font-medium leading-none tracking-[-0.04em] text-[#f4f1e9] md:text-7xl">
          {caseRecord.title}
        </h1>

        <div className="mt-7 grid gap-3 border-l border-[#c8a66a]/50 pl-5 text-sm leading-6 text-[#a8adb5]">
          {caseRecord.victim_names ? (
            <p>
              <strong className="text-[#d8d9dc]">
                Victim:
              </strong>{" "}
              {caseRecord.victim_names}
            </p>
          ) : null}

          {caseRecord.accused_names ? (
            <p>
              <strong className="text-[#d8d9dc]">
                Accused:
              </strong>{" "}
              {caseRecord.accused_names}
            </p>
          ) : null}

          {caseRecord.incident_date ? (
            <p>
              <strong className="text-[#d8d9dc]">
                Incident date:
              </strong>{" "}
              {caseRecord.incident_date}
            </p>
          ) : null}

          {location ? (
            <p>
              <strong className="text-[#d8d9dc]">
                Location:
              </strong>{" "}
              {location}
            </p>
          ) : null}
        </div>
      </header>

      <AudioUploadForm caseId={caseRecord.id} />
    </main>
  );
}