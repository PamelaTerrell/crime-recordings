"use client";

import { useState } from "react";
import { archiveCase, deleteCase } from "@/app/admin/actions";

type CaseDangerActionsProps = {
  caseId: string;
  caseTitle: string;
  caseStatus: string;
};

export default function CaseDangerActions({
  caseId,
  caseTitle,
  caseStatus,
}: CaseDangerActionsProps) {
  const [confirmation, setConfirmation] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const archiveCaseWithId = archiveCase.bind(null, caseId);
  const deleteCaseWithId = deleteCase.bind(null, caseId);

  const canDelete = confirmation.trim() === caseTitle.trim();

  return (
    <section className="admin-danger-zone">
      <div>
        <p className="admin-eyebrow">Case controls</p>
        <h2>Archive or remove this case</h2>
        <p>
          Archiving keeps the case in the database. Permanent deletion removes
          the case entirely and cannot be undone.
        </p>
      </div>

      <div className="admin-danger-actions">
        {caseStatus !== "archived" && (
          <form action={archiveCaseWithId}>
            <button type="submit" className="admin-archive-button">
              Archive case
            </button>
          </form>
        )}

        {!showDelete ? (
          <button
            type="button"
            className="admin-delete-button"
            onClick={() => setShowDelete(true)}
          >
            Delete permanently
          </button>
        ) : (
          <div className="admin-delete-confirmation">
            <p>
              Type <strong>{caseTitle}</strong> to confirm permanent deletion.
            </p>

            <label htmlFor="delete-confirmation">
              Case title
            </label>

            <input
              id="delete-confirmation"
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />

            <div className="admin-delete-confirmation-actions">
              <button
                type="button"
                className="admin-cancel-delete"
                onClick={() => {
                  setShowDelete(false);
                  setConfirmation("");
                }}
              >
                Cancel
              </button>

              <form action={deleteCaseWithId}>
                <button
                  type="submit"
                  className="admin-delete-button"
                  disabled={!canDelete}
                >
                  Confirm permanent deletion
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}