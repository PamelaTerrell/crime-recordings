import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type RequestsPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function RequestsPage({
  searchParams,
}: RequestsPageProps) {
  const { q } = await searchParams;

  const searchTerm = q?.trim() ?? "";

  const supabase = await createClient();

  let query = supabase
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

  if (searchTerm) {
    query = query.ilike(
      "subject_name",
      `%${searchTerm}%`,
    );
  }

  const { data: requests, error } = await query;

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

          <p className="admin-page-description">
            Track submitted public records requests
            and quickly check whether a person has
            already been requested.
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

      <div className="admin-request-toolbar">
        <form
          action="/admin/requests"
          method="get"
          className="admin-request-search"
        >
          <div className="admin-field">
            <label htmlFor="q">
              Search by name
            </label>

            <div className="admin-request-search-row">
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={searchTerm}
                placeholder="Search accused / criminal..."
                autoComplete="off"
              />

              <button
                type="submit"
                className="admin-button"
              >
                Search
              </button>

              {searchTerm ? (
                <Link
                  href="/admin/requests"
                  className="admin-secondary-link"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        <div className="admin-request-summary">
          <div className="admin-card admin-request-stat">
            <span>Open</span>
            <strong>{openRequests}</strong>
          </div>

          <div className="admin-card admin-request-stat">
            <span>Closed</span>
            <strong>{closedRequests}</strong>
          </div>
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
            {searchTerm
              ? "No matches"
              : "No requests yet"}
          </p>

          <h2>
            {searchTerm
              ? `No requests found for “${searchTerm}.”`
              : "Start tracking your public records requests."}
          </h2>

          <p>
            {searchTerm
              ? "Try another spelling or clear the search to view all requests."
              : "Add requests as you submit them so you can quickly see which ones are still open."}
          </p>

          {searchTerm ? (
            <Link
              href="/admin/requests"
              className="admin-secondary-link"
            >
              View all requests
            </Link>
          ) : (
            <Link
              href="/admin/requests/new"
              className="admin-primary-link"
            >
              Add the first request
            </Link>
          )}
        </div>
      )}
    </section>
  );
}