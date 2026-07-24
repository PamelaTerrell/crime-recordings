"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ImageUploadFormProps = {
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

type SaveImageResponse = {
  imageId?: string;
  error?: string;
};

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function detectImageType(file: File) {
  if (file.type) {
    return file.type.toLowerCase();
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  };

  return extension ? mimeTypes[extension] ?? "" : "";
}

function formatFileSize(bytes: number) {
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

export default function ImageUploadForm({
  caseId,
}: ImageUploadFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceReference, setSourceReference] =
    useState("");
  const [imageDate, setImageDate] = useState("");

  const [accessLevel, setAccessLevel] =
    useState<"public" | "member">("member");

  const [isPublished, setIsPublished] =
    useState(false);

  const [isDisturbing, setIsDisturbing] =
    useState(true);

  const [sortOrder, setSortOrder] = useState(0);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [pending, setPending] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState(0);
  const [statusMessage, setStatusMessage] =
    useState("");
  const [error, setError] = useState("");

  const fileDescription = useMemo(() => {
    if (!imageFile) {
      return "";
    }

    return `${imageFile.name} · ${formatFileSize(
      imageFile.size,
    )}`;
  }, [imageFile]);

  const previewUrl = useMemo(() => {
    if (!imageFile) {
      return null;
    }

    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setError("");
    setUploadProgress(0);

    if (!selectedFile) {
      setImageFile(null);
      return;
    }

    if (selectedFile.size > MAX_IMAGE_BYTES) {
      setImageFile(null);
      event.target.value = "";

      setError(
        "This image is larger than the 50 MB upload limit.",
      );

      return;
    }

    const contentType =
      detectImageType(selectedFile);

    if (
      !contentType ||
      !allowedImageTypes.has(contentType)
    ) {
      setImageFile(null);
      event.target.value = "";

      setError(
        "Please choose a JPEG, PNG, WebP, GIF, or AVIF image.",
      );

      return;
    }

    setImageFile(selectedFile);

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
      setError("Please enter an image title.");
      return;
    }

    if (!imageFile) {
      setError("Please select an image file.");
      return;
    }

    const contentType =
      detectImageType(imageFile);

    if (
      !contentType ||
      !allowedImageTypes.has(contentType)
    ) {
      setError(
        "The selected image type is not supported.",
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
        "Preparing secure image upload…",
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
            filename: imageFile.name,
            contentType,
            uploadCategory: "images",
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
        "Uploading image to Cloudflare R2…",
      );

      await uploadFileToR2(
        uploadUrlData.uploadUrl,
        imageFile,
        contentType,
        setUploadProgress,
      );

      setStatusMessage(
        "Saving image information…",
      );

      const saveResponse = await fetch(
        "/api/case-images",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caseId,
            title: title.trim(),
            caption: caption.trim(),
            sourceName: sourceName.trim(),
            sourceReference:
              sourceReference.trim(),
            imageDate,
            accessLevel,
            isPublished,
            isDisturbing,
            sortOrder,
            objectKey: uploadUrlData.objectKey,
            originalFilename: imageFile.name,
            mimeType: contentType,
            fileSizeBytes: imageFile.size,
          }),
        },
      );

      const saveData =
        (await saveResponse.json()) as SaveImageResponse;

      if (
        !saveResponse.ok ||
        !saveData.imageId
      ) {
        throw new Error(
          saveData.error ??
            "The image information could not be saved.",
        );
      }

      setStatusMessage(
        "Case image uploaded successfully.",
      );

      router.push(`/admin/cases/${caseId}`);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The case image could not be uploaded.",
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
            Image details
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
            Identify the image
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Image title
            </span>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              disabled={pending}
              placeholder="Example: Evidence photograph — exterior of residence"
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
              required
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Caption or factual description
            </span>

            <textarea
              value={caption}
              onChange={(event) =>
                setCaption(event.target.value)
              }
              disabled={pending}
              rows={4}
              placeholder="Describe what the image shows and why it is relevant to the case."
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
              placeholder="Example: Richmond County Sheriff’s Office"
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
              placeholder="Incident number, file number, or request reference"
              className="min-h-14 w-full border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none transition focus:border-[#c8a66a] focus:ring-4 focus:ring-[#c8a66a]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#d8d9dc]">
              Image date
            </span>

            <input
              type="date"
              value={imageDate}
              onChange={(event) =>
                setImageDate(event.target.value)
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
            Image file
          </p>

          <h2 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
            Select the case image
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-[#a8adb5]">
            The image uploads directly to the private
            Cloudflare R2 bucket. Keep this page open until
            the upload finishes.
          </p>
        </div>

        <label className="grid cursor-pointer gap-3 border border-dashed border-[#c8a66a]/50 bg-[#080b0f] p-6 transition hover:border-[#c8a66a] md:p-10">
          <span className="text-sm font-bold uppercase tracking-[0.1em] text-[#e1c58f]">
            Choose image file
          </span>

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.avif,image/jpeg,image/png,image/webp,image/gif,image/avif"
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

        {previewUrl ? (
          <div className="mt-6 overflow-hidden border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected case image preview"
              className="max-h-[560px] w-full object-contain"
            />
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
            Editorial warning
          </p>

          <p className="mt-3 leading-7 text-[#c8cbd0]">
            Crime-scene, injury, evidence, or other case
            photographs may be graphic or distressing. Review
            the image carefully before publishing it.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={isDisturbing}
            onChange={(event) =>
              setIsDisturbing(
                event.target.checked,
              )
            }
            disabled={pending}
            className="mt-1 h-5 w-5 accent-[#c8a66a]"
          />

          <span>
            <strong className="block text-[#f4f1e9]">
              Disturbing or sensitive image
            </strong>

            <small className="mt-1 block leading-6 text-[#a8adb5]">
              Members will be warned before this image is
              displayed. This is selected by default.
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
              Leave this unchecked until the image, caption,
              source, and privacy concerns have been reviewed.
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
            ? "Uploading image…"
            : "Upload case image"}
        </button>
      </div>
    </form>
  );
}