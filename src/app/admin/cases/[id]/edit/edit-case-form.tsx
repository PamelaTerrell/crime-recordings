"use client";

import { useActionState } from "react";
import { updateCase, type CaseFormState } from "@/app/admin/actions";

type EditableCase = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  summary: string | null;
  description: string | null;
  content_warning: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  incident_date: string | null;
  is_featured: boolean;
  case_status: string;
};

type EditCaseFormProps = {
  caseRecord: EditableCase;
};

const initialState: CaseFormState = {};

export default function EditCaseForm({
  caseRecord,
}: EditCaseFormProps) {
  const updateCaseWithId = updateCase.bind(null, caseRecord.id);

  const [state, formAction, pending] = useActionState(
    updateCaseWithId,
    initialState,
  );

  return (
    <form action={formAction} className="admin-form">
      {state.error && (
        <div className="admin-alert admin-alert-error" role="alert">
          {state.error}
        </div>
      )}

      <section className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>01</span>

          <div>
            <h2>Case identity</h2>
            <p>
              Edit the case title, subtitle, URL slug, and workflow status.
            </p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-field admin-field-full">
            <label htmlFor="title">Case title</label>

            <input
              id="title"
              name="title"
              type="text"
              defaultValue={caseRecord.title}
              required
            />
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="subtitle">Subtitle</label>

            <input
              id="subtitle"
              name="subtitle"
              type="text"
              defaultValue={caseRecord.subtitle ?? ""}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="slug">URL slug</label>

            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={caseRecord.slug}
              required
            />

            <small>Example: the-disappearance-of-jane-doe</small>
          </div>

          <div className="admin-field">
            <label htmlFor="case_status">Case status</label>

            <select
              id="case_status"
              name="case_status"
              defaultValue={caseRecord.case_status}
              required
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </section>

      <section className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>02</span>

          <div>
            <h2>Case overview</h2>

            <p>
              Update the summary, complete description, and content warning.
            </p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-field admin-field-full">
            <label htmlFor="summary">Summary</label>

            <textarea
              id="summary"
              name="summary"
              rows={4}
              defaultValue={caseRecord.summary ?? ""}
            />
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="description">Detailed description</label>

            <textarea
              id="description"
              name="description"
              rows={10}
              defaultValue={caseRecord.description ?? ""}
            />
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="content_warning">Content warning</label>

            <textarea
              id="content_warning"
              name="content_warning"
              rows={3}
              defaultValue={caseRecord.content_warning ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>03</span>

          <div>
            <h2>Incident information</h2>

            <p>
              Edit the known date and location associated with the case.
            </p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="incident_date">Incident date</label>

            <input
              id="incident_date"
              name="incident_date"
              type="date"
              defaultValue={caseRecord.incident_date ?? ""}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="location_city">City</label>

            <input
              id="location_city"
              name="location_city"
              type="text"
              defaultValue={caseRecord.location_city ?? ""}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="location_state">State</label>

            <input
              id="location_state"
              name="location_state"
              type="text"
              defaultValue={caseRecord.location_state ?? ""}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="location_country">Country</label>

            <input
              id="location_country"
              name="location_country"
              type="text"
              defaultValue={
                caseRecord.location_country ?? "United States"
              }
            />
          </div>
        </div>
      </section>

      <section className="admin-form-section">
        <label className="admin-checkbox">
          <input
            name="is_featured"
            type="checkbox"
            defaultChecked={caseRecord.is_featured}
          />

          <span>
            <strong>Feature this case</strong>

            <small>
              Featured cases can later be highlighted on the public homepage
              and archive.
            </small>
          </span>
        </label>
      </section>

      <div className="admin-form-actions">
        <button
          className="admin-submit"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving changes…" : "Save case changes"}
        </button>
      </div>
    </form>
  );
}