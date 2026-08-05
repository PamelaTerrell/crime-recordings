"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type AccessLevel = "public" | "member";

type DocumentRecord = {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  source_name: string | null;
  source_reference: string | null;
  document_date: string | null;
  access_level: AccessLevel;
  is_published: boolean;
  is_sensitive: boolean;
  sort_order: number;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
};

type EditDocumentFormProps = {
  caseId: string;
  documentRecord: DocumentRecord;
};

type UpdateDocumentResponse = {
  documentId?: string;
  error?: string;
};

function formatFileSize(bytes: number | null) {
  if (bytes === null) {
    return "File size unavailable";
  }

  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(
      1,
    )} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

export default function EditDocumentForm({
  caseId,
  documentRecord,
}: EditDocumentFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(
    documentRecord.title,
  );

  const [description, setDescription] = useState(
    documentRecord.description ?? "",
  );

  const [sourceName, setSourceName] = useState(
    documentRecord.source_name ?? "",
  );

  const [sourceReference, setSourceReference] =
    useState(
      documentRecord.source_reference ?? "",
    );

  const [documentDate, setDocumentDate] = useState(
    documentRecord.document_date ?? "",
  );

  const [accessLevel, setAccessLevel] =
    useState<AccessLevel>(
      documentRecord.access_level,
    );

  const [isPublished, setIsPublished] = useState(
    documentRecord.is_published,
  );

  const [isSensitive, setIsSensitive] = useState(
    documentRecord.is_sensitive,
  );

  const [sortOrder, setSortOrder] = useState(
    documentRecord.sort_order,
  );

  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] =
    useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setStatusMessage("");

    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError(
        "Display order must be a nonnegative whole number.",
      );
      return;
    }

    setPending(true);
    setStatusMessage(
      "Saving document settings…",
    );

    try {
      const response = await fetch(
        `/api/case-documents/${documentRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caseId,
            title: title.trim(),
            description: description.trim(),
            sourceName: sourceName.trim(),
            sourceReference:
              sourceReference.trim(),
            documentDate,
            accessLevel,
            isPublished,
            isSensitive,
            sortOrder,
          }),
        },
      );

      const data =
        (await response.json()) as UpdateDocumentResponse;

      if (
        !response.ok ||
        !data.documentId
      ) {
        throw new Error(
          data.error ??
            "The document settings could not be saved.",
        );
      }

      setStatusMessage(
        "Document settings saved successfully.",
      );

      router.push(`/admin/cases/${caseId}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The document settings could not be saved.",
      );

      setStatusMessage("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6"
    >
      {error ? (
        <div
          role="alert"
          className="border border-red-400/50 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="mb-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
            Document details
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
            Edit the document record
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Document title
            </span>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
              required
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Description
            </span>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={pending}
              rows={5}
              placeholder="Describe what this document contains."
              className="w-full border border-white/10 bg-[#080b0f] px-4 py-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Source agency
            </span>

            <input
              type="text"
              value={sourceName}
              onChange={(event) =>
                setSourceName(event.target.value)
              }
              disabled={pending}
              placeholder="Example: Strongsville Police Department"
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Source reference
            </span>

            <input
              type="text"
              value={sourceReference}
              onChange={(event) =>
                setSourceReference(
                  event.target.value,
                )
              }
              disabled={pending}
              placeholder="Request number, exhibit number, or incident number"
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Document date
            </span>

            <input
              type="date"
              value={documentDate}
              onChange={(event) =>
                setDocumentDate(
                  event.target.value,
                )
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Display order
            </span>

            <input
              type="number"
              min={0}
              step={1}
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  Number.parseInt(
                    event.target.value || "0",
                    10,
                  ),
                )
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Access
            </span>

            <select
              value={accessLevel}
              onChange={(event) =>
                setAccessLevel(
                  event.target.value as AccessLevel,
                )
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            >
              <option value="member">
                Signed-in members only
              </option>

              <option value="public">
                Public
              </option>
            </select>
          </label>
        </div>
      </section>

      <section className="border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="mb-7">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
            Uploaded file
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9]">
            Current PDF
          </h2>
        </div>

        <div className="grid gap-3 border border-white/10 bg-[#080b0f] p-5 text-sm">
          <p className="m-0 break-words text-[#f4f1e9]">
            {documentRecord.original_filename}
          </p>

          <p className="m-0 text-[#8f959e]">
            {documentRecord.mime_type}
          </p>

          <p className="m-0 text-[#8f959e]">
            {formatFileSize(
              documentRecord.file_size_bytes,
            )}
          </p>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#8f959e]">
          This form edits the document settings and
          metadata. It does not replace the uploaded PDF.
        </p>
      </section>

      <section className="grid gap-6 border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="border border-[#c8a66a]/40 bg-[#c8a66a]/5 p-5">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
            Publication controls
          </p>

          <p className="mt-3 leading-7 text-[#c8cbd0]">
            Published documents appear in the case
            archive. Access determines whether anyone or
            only signed-in members may open the PDF.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(event) =>
              setIsSensitive(
                event.target.checked,
              )
            }
            disabled={pending}
            className="mt-1 h-5 w-5 accent-[#c8a66a]"
          />

          <span>
            <strong className="block text-[#f4f1e9]">
              Sensitive or disturbing document
            </strong>

            <small className="mt-1 block leading-6 text-[#a8adb5]">
              Display a warning before the document is
              opened.
            </small>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) =>
              setIsPublished(
                event.target.checked,
              )
            }
            disabled={pending}
            className="mt-1 h-5 w-5 accent-[#c8a66a]"
          />

          <span>
            <strong className="block text-[#f4f1e9]">
              Published
            </strong>

            <small className="mt-1 block leading-6 text-[#a8adb5]">
              Uncheck this to remove the document from the
              public case page while keeping it stored.
            </small>
          </span>
        </label>
      </section>

      {statusMessage ? (
        <div className="border border-[#c8a66a]/40 bg-[#c8a66a]/5 px-5 py-4 text-sm text-[#e1c58f]">
          {statusMessage}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/admin/cases/${caseId}`,
            )
          }
          disabled={pending}
          className="inline-flex min-h-14 items-center justify-center border border-white/15 px-7 text-xs font-extrabold uppercase tracking-[0.09em] text-[#c8cbd0] transition hover:border-white/30 hover:text-white disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.09em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60"
        >
          {pending
            ? "Saving document…"
            : "Save document settings"}
        </button>
      </div>
    </form>
  );
}