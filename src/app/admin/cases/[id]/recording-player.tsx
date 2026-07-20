"use client";

import { useState } from "react";

type RecordingPlayerProps = {
  recordingId: string;
  title: string;
  recordingType: string;
  originalFilename: string | null;
  fileSizeBytes: number | null;
  accessLevel: string;
  isPublished: boolean;
  sortOrder: number;
};

type PlaybackResponse = {
  playbackUrl?: string;
  error?: string;
};

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
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function RecordingPlayer({
  recordingId,
  title,
  recordingType,
  originalFilename,
  fileSizeBytes,
  accessLevel,
  isPublished,
}: RecordingPlayerProps) {
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function preparePlayback() {
    setPending(true);
    setError("");

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

      const data =
        (await response.json()) as PlaybackResponse;

      if (!response.ok || !data.playbackUrl) {
        throw new Error(
          data.error ?? "The recording could not be prepared.",
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
      setPending(false);
    }
  }

  const formattedSize = formatFileSize(fileSizeBytes);

  return (
    <article className="border border-white/10 bg-[#10151b] p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="border border-[#c8a66a]/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e1c58f]">
              {formatRecordingType(recordingType)}
            </span>

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
          </div>
        </div>

        {!playbackUrl ? (
          <button
            type="button"
            onClick={preparePlayback}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] bg-transparent px-5 text-xs font-extrabold uppercase tracking-[0.09em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Preparing…" : "Load secure player"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      {playbackUrl ? (
        <div className="mt-6">
          <audio
            controls
            preload="metadata"
            src={playbackUrl}
            className="w-full"
          >
            Your browser does not support audio playback.
          </audio>

          <p className="mt-3 text-xs leading-5 text-[#747b84]">
            This secure playback link expires after one hour.
            Reload the player afterward to continue listening.
          </p>
        </div>
      ) : null}
    </article>
  );
}