import Link from "next/link";
import CaseForm from "./case-form";

export const metadata = {
  title: "Create Case",
};

export default function NewCasePage() {
  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <Link href="/admin" className="admin-back-link">
            ← Back to case archive
          </Link>

          <p className="admin-eyebrow">New archive entry</p>
          <h1>Create a case</h1>
          <p>
            Begin with the case foundation. Recordings, sources, chapters, and
            transcripts will be added afterward.
          </p>
        </div>
      </div>

      <CaseForm />
    </section>
  );
}