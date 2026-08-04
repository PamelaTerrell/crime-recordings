"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type DocumentUploadFormProps = {
  caseId: string;
};

type UploadUrlResponse = {
  uploadUrl?: string;
  objectKey?: string;
  originalFilename?: string;
  contentType?: string;
  uploadCategory?: string;
  error?: string;
};

type SaveDocumentResponse = {
  documentId?: string;
  error?: string;
};

const MAX_DOCUMENT_BYTES = 250 * 1024 * 1024;

const allowedDocumentTypes = new Set([
  "application/pdf",
]);

function detectDocumentType(file: File) {
  if (file.type) {
    return file.type.toLowerCase();
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
  };

  return extension ? mimeTypes[extension] ?? "" : "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadFileToR2(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (percentage: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", contentType);

    request.upload.addEventListener(
      "progress",
      (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const percentage = Math.round(
          (event.loaded / event.total) * 100,
        );

        onProgress(percentage);
      },
    );

    request.addEventListener("load", () => {
      if (
        request.status >= 200 &&
        request.status < 300
      ) {
        onProgress(100);
        resolve();
        return;
      }

      reject(
        new Error(
          `Cloudflare rejected the upload with status ${request.status}.`,
        ),
      );
    });

    request.addEventListener("error", () => {
      reject(
        new Error(
          "The upload was interrupted before it reached Cloudflare.",
        ),
      );
    });

    request.addEventListener("abort", () => {
      reject(new Error("The upload was canceled."));
    });

    request.send(file);
  });
}

export default function DocumentUploadForm({
  caseId,
}: DocumentUploadFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceReference, setSourceReference] =
    useState("");
  const [documentDate, setDocumentDate] = useState("");

  const [accessLevel, setAccessLevel] =
    useState<"public" | "member">("member");

  const [isPublished, setIsPublished] =
    useState(false);

  const [isSensitive, setIsSensitive] =
    useState(false);

  const [sortOrder, setSortOrder] = useState(0);

  const [documentFile, setDocumentFile] =
    useState<File | null>(null);

  const [pending, setPending] = useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [error, setError] = useState("");

  const fileDescription = useMemo(() => {
    if (!documentFile) {
      return "";
    }

    return `${documentFile.name} · ${formatFileSize(
      documentFile.size,
    )}`;
  }, [documentFile]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setError("");
    setUploadProgress(0);

    if (!selectedFile) {
      setDocumentFile(null);
      return;
    }

    if (selectedFile.size > MAX_DOCUMENT_BYTES) {
      setDocumentFile(null);
      event.target.value = "";

      setError(
        "This PDF is larger than the 250 MB upload limit.",
      );

      return;
    }

    const contentType =
      detectDocumentType(selectedFile);

    if (
      !contentType ||
      !allowedDocumentTypes.has(contentType)
    ) {
      setDocumentFile(null);
      event.target.value = "";

      setError(
        "Please choose a PDF document.",
      );

      return;
    }

    setDocumentFile(selectedFile);

    if (!title.trim()) {
      const filenameWithoutExtension =
        selectedFile.name.replace(/\.[^/.]+$/, "");

      setTitle(filenameWithoutExtension);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setStatusMessage("");
    setUploadProgress(0);

    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }

    if (!documentFile) {
      setError("Please select a PDF document.");
      return;
    }

    const contentType =
      detectDocumentType(documentFile);

    if (
      !contentType ||
      !allowedDocumentTypes.has(contentType)
    ) {
      setError(
        "The selected document type is not supported.",
      );

      return;
    }

    if (sortOrder < 0) {
      setError(
        "Display order cannot be a negative number.",
      );

      return;
    }

    setPending(true);

    try {
      setStatusMessage(
        "Preparing secure document upload…",
      );

      const uploadUrlResponse = await fetch(
        "/api/r2/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caseId,
            filename: documentFile.name,
            contentType,
            uploadCategory: "documents",
          }),
        },
      );

      const uploadUrlData =
        (await uploadUrlResponse.json()) as UploadUrlResponse;

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlData.uploadUrl ||
        !uploadUrlData.objectKey
      ) {
        throw new Error(
          uploadUrlData.error ??
            "The secure upload could not be prepared.",
        );
      }

      setStatusMessage(
        "Uploading document to Cloudflare R2…",
      );

      await uploadFileToR2(
        uploadUrlData.uploadUrl,
        documentFile,
        contentType,
        setUploadProgress,
      );

      setStatusMessage(
        "Saving document information…",
      );

      const saveResponse = await fetch(
        "/api/case-documents",
        {
          method: "POST",
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
            objectKey: uploadUrlData.objectKey,
            originalFilename: documentFile.name,
            mimeType: contentType,
            fileSizeBytes: documentFile.size,
          }),
        },
      );

      const saveData =
        (await saveResponse.json()) as SaveDocumentResponse;

      if (
        !saveResponse.ok ||
        !saveData.documentId
      ) {
        throw new Error(
          saveData.error ??
            "The document information could not be saved.",
        );
      }

      setStatusMessage(
        "Case document uploaded successfully.",
      );

      router.push(`/admin/cases/${caseId}`);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The case document could not be uploaded.",
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
            Identify the document
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
              placeholder="Example: Crash reconstruction presentation — Part 1"
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
              placeholder="Describe what the document contains and why it is relevant to the case."
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
              placeholder="Incident number, exhibit number, or request reference"
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
                setDocumentDate(event.target.value)
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
                  event.target.value as
                    | "public"
                    | "member",
                )
              }
              disabled={pending}
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            >
              <option value="member">
                Members only
              </option>

              <option value="public">
                Public
              </option>
            </select>
          </label>
        </div>
      </section>

      <section className="border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="mb-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
            Document file
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
            Select the PDF
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-[#a8adb5]">
            The document uploads directly to the private
            Cloudflare R2 bucket. Keep this page open until
            the upload finishes.
          </p>
        </div>

        <label className="grid cursor-pointer gap-3 border border-dashed border-[#c8a66a]/50 bg-[#080b0f] p-6 transition hover:border-[#c8a66a] md:p-10">
          <span className="text-sm font-bold uppercase tracking-[0.1em] text-[#e1c58f]">
            Choose PDF document
          </span>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={pending}
            className="block w-full text-sm text-[#a8adb5] file:mr-4 file:border file:border-[#c8a66a] file:bg-[#c8a66a] file:px-5 file:py-3 file:text-xs file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[#111318]"
            required
          />

          {fileDescription ? (
            <span className="text-sm text-[#c2c5ca]">
              {fileDescription}
            </span>
          ) : null}
        </label>

        {documentFile ? (
          <div className="mt-6 border border-white/10 bg-[#080b0f] p-5">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.14em] text-[#e1c58f]">
              Selected document
            </p>

            <p className="mt-3 break-words text-sm leading-6 text-[#c8cbd0]">
              {documentFile.name}
            </p>

            <p className="mt-1 text-sm text-[#8f959e]">
              {formatFileSize(documentFile.size)}
            </p>
          </div>
        ) : null}

        {pending || uploadProgress > 0 ? (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-[#c2c5ca]">
                {statusMessage ||
                  "Preparing upload…"}
              </span>

              <strong className="text-[#e1c58f]">
                {uploadProgress}%
              </strong>
            </div>

            <div className="h-2 overflow-hidden bg-white/10">
              <div
                className="h-full bg-[#c8a66a] transition-[width]"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 border border-white/10 bg-[#10151b] p-6 md:p-10">
        <div className="border border-[#c8a66a]/40 bg-[#c8a66a]/5 p-5">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
            Editorial review
          </p>

          <p className="mt-3 leading-7 text-[#c8cbd0]">
            Review every page before publication. Documents
            may contain private addresses, telephone numbers,
            medical information, information about minors,
            graphic photographs, or other sensitive material.
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
              Visitors will be warned before opening this
              document.
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
              Publish immediately
            </strong>

            <small className="mt-1 block leading-6 text-[#a8adb5]">
              Leave this unchecked until the document,
              description, source, and privacy concerns have
              been reviewed.
            </small>
          </span>
        </label>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-14 w-full items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.09em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60 md:w-auto"
        >
          {pending
            ? "Uploading document…"
            : "Upload case document"}
        </button>
      </div>
    </form>
  );
}