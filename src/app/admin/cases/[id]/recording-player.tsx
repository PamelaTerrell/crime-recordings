"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordingPlayerProps = {
  recordingId: string;
  title: string;
  recordingType: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  accessLevel: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

type ApiResponse = {
  playbackUrl?: string;
  success?: boolean;
  cleanupWarning?: string | null;
  error?: string;
};

const recordingTypes = [
  { value: "911-call", label: "911 call" },
  { value: "interrogation", label: "Interrogation" },
  { value: "dispatch", label: "Dispatch recording" },
  { value: "court-audio", label: "Court recording" },
  { value: "interview", label: "Interview" },
  { value: "body-camera", label: "Body-camera recording" },
  { value: "surveillance", label: "Surveillance video" },
  { value: "news-footage", label: "News footage" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes: number | null) {
  if (bytes === null) {
    return null;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRecordingType(value: string) {
  return value
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {} as ApiResponse;
  }

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(
      `The server returned ${response.status} ${response.statusText} instead of JSON.`,
    );
  }
}

export default function RecordingPlayer({
  recordingId,
  title,
  recordingType,
  originalFilename,
  mimeType,
  fileSizeBytes,
  accessLevel,
  isPublished,
  isFeatured,
  sortOrder,
}: RecordingPlayerProps) {
  const router = useRouter();

  const [playbackUrl, setPlaybackUrl] = useState("");
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState(false);

  const [editedTitle, setEditedTitle] = useState(title);
  const [editedType, setEditedType] =
    useState(recordingType);
  const [editedAccess, setEditedAccess] = useState<
    "public" | "member"
  >(accessLevel === "public" ? "public" : "member");
  const [editedPublished, setEditedPublished] =
    useState(isPublished);
  const [editedFeatured, setEditedFeatured] =
  useState(isFeatured);
  const [editedSortOrder, setEditedSortOrder] =
    useState(sortOrder);

  const [confirmationText, setConfirmationText] =
    useState("");
  const [pendingAction, setPendingAction] = useState<
    "playback" | "edit" | "delete" | null
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formattedSize = formatFileSize(fileSizeBytes);
  const canDelete = confirmationText.trim() === title.trim();
  const isVideo = mimeType?.startsWith("video/") ?? false;

  async function preparePlayback() {
    setPendingAction("playback");
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/recordings/playback-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recordingId,
          }),
        },
      );

      const data = await readJsonResponse(response);

      if (!response.ok || !data.playbackUrl) {
        throw new Error(
          data.error ??
            "The recording could not be prepared.",
        );
      }

      setPlaybackUrl(data.playbackUrl);
    } catch (playbackError) {
      setError(
        playbackError instanceof Error
          ? playbackError.message
          : "The recording could not be played.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function saveChanges() {
    setPendingAction("edit");
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/recordings/${recordingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
  title: editedTitle,
  recordingType: editedType,
  accessLevel: editedAccess,
  isPublished: editedPublished,
  isFeatured: editedFeatured,
  sortOrder: editedSortOrder,
}),
        },
      );

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "The recording could not be updated.",
        );
      }

      setMessage("Recording updated.");
      setShowEditForm(false);

      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The recording could not be updated.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteRecording() {
    setPendingAction("delete");
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/recordings/${recordingId}`,
        {
          method: "DELETE",
        },
      );

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "The recording could not be deleted.",
        );
      }

      if (data.cleanupWarning) {
        console.warn(data.cleanupWarning);
      }

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The recording could not be deleted.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <article className="border border-white/10 bg-[#10151b] p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="border border-[#c8a66a]/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e1c58f]">
              {formatRecordingType(recordingType)}
            </span>

            <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
              {isVideo ? "Video" : "Audio"}
            </span>

            {isFeatured ? (
  <span className="border border-[#c8a66a] bg-[#c8a66a]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e1c58f]">
    Featured hero
  </span>
) : null}

            <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
              {accessLevel === "public"
                ? "Public"
                : "Members only"}
            </span>

            <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <h3 className="m-0 font-serif text-3xl font-medium text-[#f4f1e9]">
            {title}
          </h3>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#a8adb5]">
            {originalFilename ? (
              <span>{originalFilename}</span>
            ) : null}

            {formattedSize ? <span>{formattedSize}</span> : null}

            {mimeType ? <span>{mimeType}</span> : null}

            <span>Order: {sortOrder}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!playbackUrl ? (
            <button
              type="button"
              onClick={preparePlayback}
              disabled={pendingAction !== null}
              className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] bg-transparent px-5 text-xs font-extrabold uppercase tracking-[0.09em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10 disabled:cursor-wait disabled:opacity-60"
            >
              {pendingAction === "playback"
                ? "Preparing…"
                : "Load player"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setShowEditForm((current) => !current);
              setShowDeleteConfirmation(false);
              setError("");
              setMessage("");
            }}
            disabled={pendingAction !== null}
            className="inline-flex min-h-12 items-center justify-center border border-white/20 px-5 text-xs font-extrabold uppercase tracking-[0.09em] text-[#d8d9dc] transition hover:border-[#c8a66a] hover:text-[#e1c58f]"
          >
            {showEditForm ? "Cancel edit" : "Edit"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirmation(true);
              setShowEditForm(false);
              setError("");
              setMessage("");
            }}
            disabled={pendingAction !== null}
            className="inline-flex min-h-12 items-center justify-center border border-red-400/50 px-5 text-xs font-extrabold uppercase tracking-[0.09em] text-red-200 transition hover:bg-red-400/10"
          >
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200"
        >
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-5 border border-[#c8a66a]/50 bg-[#c8a66a]/10 px-4 py-3 text-sm text-[#e1c58f]">
          {message}
        </p>
      ) : null}

      {playbackUrl ? (
        <div className="mt-6">
          {isVideo ? (
            <video
              controls
              preload="metadata"
              src={playbackUrl}
              className="max-h-[75vh] w-full bg-black"
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <audio
              controls
              preload="metadata"
              src={playbackUrl}
              className="w-full"
            >
              Your browser does not support audio playback.
            </audio>
          )}

          <p className="mt-3 text-xs leading-5 text-[#747b84]">
            This secure playback link expires after one hour.
          </p>
        </div>
      ) : null}

      {showEditForm ? (
        <div className="mt-7 grid gap-5 border-t border-white/10 pt-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#d8d9dc]">
                Title
              </span>

              <input
                value={editedTitle}
                onChange={(event) =>
                  setEditedTitle(event.target.value)
                }
                disabled={pendingAction !== null}
                className="min-h-13 border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none focus:border-[#c8a66a]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#d8d9dc]">
                Recording type
              </span>

              <select
                value={editedType}
                onChange={(event) =>
                  setEditedType(event.target.value)
                }
                disabled={pendingAction !== null}
                className="min-h-13 border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none focus:border-[#c8a66a]"
              >
                {recordingTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#d8d9dc]">
                Access
              </span>

              <select
                value={editedAccess}
                onChange={(event) =>
                  setEditedAccess(
                    event.target.value as
                      | "public"
                      | "member",
                  )
                }
                disabled={pendingAction !== null}
                className="min-h-13 border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none focus:border-[#c8a66a]"
              >
                <option value="member">Members only</option>
                <option value="public">Public</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#d8d9dc]">
                Sort order
              </span>

              <input
                type="number"
                value={editedSortOrder}
                onChange={(event) =>
                  setEditedSortOrder(
                    Number.parseInt(
                      event.target.value || "0",
                      10,
                    ),
                  )
                }
                disabled={pendingAction !== null}
                className="min-h-13 border border-white/10 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none focus:border-[#c8a66a]"
              />
            </label>

            <div className="grid gap-4 self-end pb-3">
  <label className="flex items-start gap-3">
    <input
      type="checkbox"
      checked={editedPublished}
      onChange={(event) => {
        const checked = event.target.checked;

        setEditedPublished(checked);

        if (!checked) {
          setEditedFeatured(false);
        }
      }}
      disabled={pendingAction !== null}
      className="mt-0.5 h-5 w-5 accent-[#c8a66a]"
    />

    <span>
      <strong className="block text-sm font-medium text-[#d8d9dc]">
        Published
      </strong>

      <small className="mt-1 block text-xs leading-5 text-[#747b84]">
        Only published recordings can appear publicly.
      </small>
    </span>
  </label>

  <label
    className={`flex items-start gap-3 ${
      !isVideo ? "cursor-not-allowed opacity-50" : ""
    }`}
  >
    <input
      type="checkbox"
      checked={editedFeatured}
      onChange={(event) => {
        const checked = event.target.checked;

        setEditedFeatured(checked);

        if (checked) {
          setEditedPublished(true);
        }
      }}
      disabled={!isVideo || pendingAction !== null}
      className="mt-0.5 h-5 w-5 accent-[#c8a66a]"
    />

    <span>
      <strong className="block text-sm font-medium text-[#d8d9dc]">
        Feature at top of public case page
      </strong>

      <small className="mt-1 block text-xs leading-5 text-[#747b84]">
        {isVideo
          ? "This video will become the large hero video for the case."
          : "Only video recordings can be featured."}
      </small>
    </span>
  </label>
</div>
          </div>

          <div>
            <button
              type="button"
              onClick={saveChanges}
              disabled={pendingAction !== null}
              className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-6 text-xs font-extrabold uppercase tracking-[0.09em] text-[#111318] hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60"
            >
              {pendingAction === "edit"
                ? "Saving…"
                : "Save changes"}
            </button>
          </div>
        </div>
      ) : null}

      {showDeleteConfirmation ? (
        <div className="mt-7 border border-red-400/50 bg-red-400/5 p-5">
          <h4 className="m-0 text-lg font-semibold text-red-100">
            Permanently delete this recording?
          </h4>

          <p className="mt-3 leading-7 text-[#a8adb5]">
            This removes the recording record and its media file
            from Cloudflare R2. Type{" "}
            <strong className="text-[#f4f1e9]">
              {title}
            </strong>{" "}
            to confirm.
          </p>

          <input
            value={confirmationText}
            onChange={(event) =>
              setConfirmationText(event.target.value)
            }
            disabled={pendingAction !== null}
            className="mt-4 min-h-13 w-full border border-red-400/40 bg-[#080b0f] px-4 text-[#f4f1e9] outline-none focus:border-red-300"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirmation(false);
                setConfirmationText("");
              }}
              disabled={pendingAction !== null}
              className="min-h-12 border border-white/20 px-5 text-xs font-extrabold uppercase tracking-[0.09em] text-[#d8d9dc]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={deleteRecording}
              disabled={
                !canDelete || pendingAction !== null
              }
              className="min-h-12 border border-red-400/60 bg-red-700 px-5 text-xs font-extrabold uppercase tracking-[0.09em] text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pendingAction === "delete"
                ? "Deleting…"
                : "Delete permanently"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}