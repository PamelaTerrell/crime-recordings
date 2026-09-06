import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RequestsPage() {
  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("public_records_requests")
    .select(
      `
        id,
        submitted_at,
        subject_name,
        portal_url,
        state,
        status,
        notes
      `,
    )
    .order("submitted_at", {
      ascending: false,
    });

  const openRequests =
    requests?.filter(
      (request) => request.status === "open",
    ).length ?? 0;

  const closedRequests =
    requests?.filter(
      (request) => request.status === "closed",
    ).length ?? 0;

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            Public records tracker
          </p>

          <h1>Records requests</h1>

          <p>
            Keep track of public records requests
            submitted for possible Crime Recordings
            cases.
          </p>
        </div>

        <Link
          href="/admin/requests/new"
          className="admin-primary-link"
        >
          Add a request
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="admin-request-summary">
        <div>
          <strong>{openRequests}</strong>
          <span>Open</span>
        </div>

        <div>
          <strong>{closedRequests}</strong>
          <span>Closed</span>
        </div>
      </div>

      {error ? (
        <div
          className="admin-alert admin-alert-error"
          role="alert"
        >
          The request list could not be loaded:{" "}
          {error.message}
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="admin-case-list">
          {requests.map((request) => (
            <article
              className="admin-case-row"
              key={request.id}
            >
              <div>
                <span className="admin-status">
                  {request.status}
                </span>

                <h2>{request.subject_name}</h2>

                <p>
                  {request.state
                    ? `${request.state} · `
                    : ""}
                  Submitted{" "}
                  {new Intl.DateTimeFormat(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  ).format(
                    new Date(
                      `${request.submitted_at}T12:00:00`,
                    ),
                  )}
                </p>

                {request.notes ? (
                  <p className="admin-request-notes">
                    {request.notes}
                  </p>
                ) : null}
              </div>

              <div className="admin-case-meta">
                <div className="admin-case-row-actions">
                  {request.portal_url ? (
                    <a
                      href={request.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open portal ↗
                    </a>
                  ) : null}

                  <Link
                    href={`/admin/requests/${request.id}/edit`}
                  >
                    Edit request →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <p className="admin-eyebrow">
            No requests yet
          </p>

          <h2>
            Start tracking your public records
            requests.
          </h2>

          <p>
            Add requests as you submit them so you
            can quickly see which cases are still
            open.
          </p>

          <Link
            href="/admin/requests/new"
            className="admin-primary-link"
          >
            Add the first request
          </Link>
        </div>
      )}
    </section>
  );
}