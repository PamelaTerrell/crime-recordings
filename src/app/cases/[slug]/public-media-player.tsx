"use client";

import Link from "next/link";
import { useState } from "react";

type PublicMediaPlayerProps = {
  recordingId: string;
  title: string;
  mimeType: string | null;
  accessLevel: string;
  featured?: boolean;
};

type PlaybackResponse = {
  playbackUrl?: string;
  error?: string;
  requiresMembership?: boolean;
};

async function readJsonResponse(response: Response) {
  const responseText = await response.text();

  if (!responseText) {
    return {} as PlaybackResponse;
  }

  try {
    return JSON.parse(responseText) as PlaybackResponse;
  } catch {
    throw new Error(
      `The playback service returned ${response.status} instead of JSON.`,
    );
  }
}

export default function PublicMediaPlayer({
  recordingId,
  title,
  mimeType,
  accessLevel,
  featured = false,
}: PublicMediaPlayerProps) {
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isVideo = mimeType?.startsWith("video/") ?? false;
  const isMemberOnly = accessLevel === "member";

  async function loadPlayer() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        "/api/public/recordings/playback-url",
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
          data.error ?? "The recording could not be loaded.",
        );
      }

      setPlaybackUrl(data.playbackUrl);
    } catch (playbackError) {
      setError(
        playbackError instanceof Error
          ? playbackError.message
          : "The recording could not be loaded.",
      );
    } finally {
      setPending(false);
    }
  }

  if (isMemberOnly && !playbackUrl) {
    return (
      <div
        className={
          featured
            ? "relative grid min-h-[62vh] place-items-center overflow-hidden border-y border-white/10 bg-[#080b0f] px-6 py-20 text-center md:min-h-[78vh]"
            : "grid min-h-80 place-items-center border border-white/10 bg-[#10151b] p-8 text-center"
        }
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,166,106,0.14),transparent_42%)]"
        />

        <div className="relative z-10 max-w-2xl">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.22em] text-[#e1c58f]">
            Members-only recording
          </p>

          <h2 className="m-0 font-serif text-4xl font-medium text-[#f4f1e9] md:text-6xl">
            {title}
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#a8adb5]">
            This full recording will be available to active
            Crime Recordings members.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (playbackUrl) {
    return isVideo ? (
      <video
        controls
        playsInline
        preload="metadata"
        src={playbackUrl}
        className={
          featured
            ? "max-h-[85vh] min-h-[55vh] w-full bg-black object-contain"
            : "max-h-[75vh] w-full bg-black"
        }
      >
        Your browser does not support video playback.
      </video>
    ) : (
      <div className="border border-white/10 bg-[#10151b] p-6">
        <audio
          controls
          preload="metadata"
          src={playbackUrl}
          className="w-full"
        >
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  return (
    <div
      className={
        featured
          ? "relative grid min-h-[62vh] place-items-center overflow-hidden border-y border-white/10 bg-black px-6 py-20 text-center md:min-h-[78vh]"
          : "grid min-h-72 place-items-center border border-white/10 bg-[#10151b] p-8 text-center"
      }
    >
      <div className="max-w-xl">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
          {isVideo ? "Featured video" : "Case recording"}
        </p>

        <h2 className="m-0 font-serif text-4xl font-medium text-[#f4f1e9] md:text-6xl">
          {title}
        </h2>

        <button
          type="button"
          onClick={loadPlayer}
          disabled={pending}
          className="mt-8 inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60"
        >
          {pending
            ? "Preparing recording…"
            : isVideo
              ? "Play video"
              : "Play recording"}
        </button>

        {error ? (
          <p
            role="alert"
            className="mt-5 border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}