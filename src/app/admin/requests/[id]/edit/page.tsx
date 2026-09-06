import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function NewRequestPage() {
  async function createRequest(
    formData: FormData,
  ) {
    "use server";

    const supabase = await createClient();

    const submittedAt = String(
      formData.get("submitted_at") ?? "",
    );

    const subjectName = String(
      formData.get("subject_name") ?? "",
    ).trim();

    const portalUrl = String(
      formData.get("portal_url") ?? "",
    ).trim();

    const state = String(
      formData.get("state") ?? "",
    )
      .trim()
      .toUpperCase();

    const status = String(
      formData.get("status") ?? "open",
    );

    const notes = String(
      formData.get("notes") ?? "",
    ).trim();

    if (!submittedAt || !subjectName) {
      throw new Error(
        "Submitted date and subject name are required.",
      );
    }

    const { error } = await supabase
      .from("public_records_requests")
      .insert({
        submitted_at: submittedAt,
        subject_name: subjectName,
        portal_url: portalUrl || null,
        state: state || null,
        status,
        notes: notes || null,
      });

    if (error) {
      throw new Error(error.message);
    }

    redirect("/admin/requests");
  }

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            Public records tracker
          </p>

          <h1>Add a request</h1>

          <p>
            Record a newly submitted public
            records request.
          </p>
        </div>

        <Link
          href="/admin/requests"
          className="admin-secondary-link"
        >
          Back to requests
        </Link>
      </div>

      <form
        action={createRequest}
        className="admin-form"
      >
        <div className="admin-form-field">
          <label htmlFor="submitted_at">
            Date submitted
          </label>

          <input
            id="submitted_at"
            name="submitted_at"
            type="date"
            required
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="subject_name">
            Name of accused / criminal
          </label>

          <input
            id="subject_name"
            name="subject_name"
            type="text"
            placeholder="Devon Arthurs"
            required
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="state">
            State
          </label>

          <input
            id="state"
            name="state"
            type="text"
            placeholder="FL"
            maxLength={2}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="portal_url">
            Portal link
          </label>

          <input
            id="portal_url"
            name="portal_url"
            type="url"
            placeholder="https://..."
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="status">
            Status
          </label>

          <select
            id="status"
            name="status"
            defaultValue="open"
          >
            <option value="open">
              Open
            </option>

            <option value="closed">
              Closed
            </option>
          </select>
        </div>

        <div className="admin-form-field">
          <label htmlFor="notes">
            Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={5}
            placeholder="Requested photos, bodycam, interrogation footage, etc."
          />
        </div>

        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-primary-button"
          >
            Save request
          </button>

          <Link
            href="/admin/requests"
            className="admin-secondary-link"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}