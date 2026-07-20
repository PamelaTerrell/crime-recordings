"use client";

import { useActionState, useState } from "react";
import {
  createCase,
  type CaseFormState,
} from "@/app/admin/actions";

const INITIAL_STATE: CaseFormState = {};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CaseForm() {
  const [state, formAction, pending] = useActionState(
    createCase,
    INITIAL_STATE,
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slugWasEdited) {
      setSlug(makeSlug(value));
    }
  }

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>01</span>
          <div>
            <h2>Case identity</h2>
            <p>The primary title and public URL for this case.</p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-field admin-field-full">
            <label htmlFor="title">Case title *</label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(event) =>
                handleTitleChange(event.target.value)
              }
              placeholder="Enter the case title"
              required
              disabled={pending}
            />
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="slug">URL slug *</label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugWasEdited(true);
                setSlug(makeSlug(event.target.value));
              }}
              placeholder="case-title"
              required
              disabled={pending}
            />
            <small>
              This will eventually appear after
              crimerecordings.com/cases/
            </small>
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="subtitle">Subtitle</label>
            <input
              id="subtitle"
              name="subtitle"
              placeholder="A short supporting headline"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>02</span>
          <div>
            <h2>Case overview</h2>
            <p>
              Internal and public-facing context for the case.
            </p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-field admin-field-full">
            <label htmlFor="summary">Short summary</label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              placeholder="A concise overview for case cards and introductions"
              disabled={pending}
            />
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="description">Detailed description</label>
            <textarea
              id="description"
              name="description"
              rows={8}
              placeholder="Enter the fuller case background here"
              disabled={pending}
            />
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="content_warning">
              Content warning
            </label>
            <textarea
              id="content_warning"
              name="content_warning"
              rows={3}
              placeholder="Describe sensitive material listeners should know about"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <section className="admin-form-section">
  <div className="admin-form-section-heading">
    <span>03</span>

    <div>
      <h2>People involved</h2>
      <p>
        Add victims and accused or convicted individuals. Enter one person
        per line.
      </p>
    </div>
  </div>

  <div className="admin-form-grid">
    <div className="admin-field">
      <label htmlFor="victim_names">Victim(s)</label>

      <textarea
        id="victim_names"
        name="victim_names"
        rows={6}
        placeholder={`Mary Johnson
Robert Johnson`}
disabled={pending}
      />

      <small>Enter one name per line.</small>
    </div>

    <div className="admin-field">
      <label htmlFor="accused_names">
        Accused or convicted person(s)
      </label>

      <textarea
        id="accused_names"
        name="accused_names"
        rows={6}
        placeholder={`Thomas Brown — convicted
Second participant — unidentified`}
disabled={pending}
      />

      <small>
        Include a status such as charged, convicted, acquitted, suspected,
        or unidentified when appropriate.
      </small>
    </div>
  </div>
</section>

      <div className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>04</span>
          <div>
            <h2>Location and date</h2>
            <p>Basic identifying context for the incident.</p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="location_city">City</label>
            <input
              id="location_city"
              name="location_city"
              disabled={pending}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="location_state">State</label>
            <input
              id="location_state"
              name="location_state"
              placeholder="Georgia"
              disabled={pending}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="location_country">Country</label>
            <input
              id="location_country"
              name="location_country"
              defaultValue="United States"
              disabled={pending}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="incident_date">Incident date</label>
            <input
              id="incident_date"
              name="incident_date"
              type="date"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <div className="admin-form-section-heading">
          <span>05</span>
          <div>
            <h2>Editorial settings</h2>
            <p>
              New cases are always created privately as drafts.
            </p>
          </div>
        </div>

        <label className="admin-checkbox">
          <input
            name="is_featured"
            type="checkbox"
            disabled={pending}
          />
          <span>
            <strong>Mark as featured</strong>
            <small>
              This can be changed before the case is published.
            </small>
          </span>
        </label>
      </div>

      {state.error && (
        <div className="admin-alert admin-alert-error" role="alert">
          {state.error}
        </div>
      )}

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-submit"
          disabled={pending}
        >
          {pending ? "Saving draft…" : "Create draft case"}
        </button>
      </div>
    </form>
  );
}