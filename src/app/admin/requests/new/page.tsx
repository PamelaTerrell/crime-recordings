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

    if (
      status !== "open" &&
      status !== "closed"
    ) {
      throw new Error(
        "Invalid request status.",
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
      <Link
        href="/admin/requests"
        className="admin-back-link"
      >
        ← Back to records requests
      </Link>

      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            Public records tracker
          </p>

          <h1>Add a request</h1>

          <p className="admin-page-description">
            Record a newly submitted public records
            request so you can quickly see what is
            still open and avoid submitting duplicate
            requests.
          </p>
        </div>
      </div>

      <form
        action={createRequest}
        className="admin-form"
      >
        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>01</span>

            <div>
              <h2>Request details</h2>

              <p>
                Add the basic information needed to
                identify and track this request.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
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

            <div className="admin-field">
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

            <div className="admin-field admin-field-full">
              <label htmlFor="subject_name">
                Name of accused / criminal
              </label>

              <input
                id="subject_name"
                name="subject_name"
                type="text"
                placeholder="Devon Arthurs"
                autoComplete="off"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="state">
                State
              </label>

              <input
                id="state"
                name="state"
                type="text"
                placeholder="FL"
                maxLength={2}
                autoCapitalize="characters"
                autoComplete="off"
              />

              <small>
                Use the two-letter state
                abbreviation.
              </small>
            </div>

            <div className="admin-field">
              <label htmlFor="portal_url">
                Portal link
              </label>

              <input
                id="portal_url"
                name="portal_url"
                type="url"
                placeholder="https://..."
              />

              <small>
                Link to the agency or public records
                portal used for this request.
              </small>
            </div>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>02</span>

            <div>
              <h2>Notes</h2>

              <p>
                Keep a short reminder of what you
                requested or anything important about
                the response.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field admin-field-full">
              <label htmlFor="notes">
                Request notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={6}
                placeholder="Example: Requested crime-scene photos, evidence photos, interrogation video, bodycam, and surveillance footage."
              />

              <small>
                This is for your internal tracking
                only.
              </small>
            </div>
          </div>
        </section>

        <div className="admin-form-actions admin-request-form-actions">
          <Link
            href="/admin/requests"
            className="admin-secondary-link"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="admin-submit"
          >
            Save request
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </section>
  );
}