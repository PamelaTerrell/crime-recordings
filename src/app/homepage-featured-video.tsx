"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type HomepageFeaturedVideoProps = {
  recordingId: string;
  title: string;
  caseHref: string;
};

type PlaybackResponse = {
  playbackUrl?: string;
  error?: string;
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

export default function HomepageFeaturedVideo({
  recordingId,
  title,
  caseHref,
}: HomepageFeaturedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [playbackUrl, setPlaybackUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareVideo() {
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
            data.error ??
              "The featured video could not be loaded.",
          );
        }

        if (active) {
          setPlaybackUrl(data.playbackUrl);
        }
      } catch (videoError) {
        if (active) {
          setError(
            videoError instanceof Error
              ? videoError.message
              : "The featured video could not be loaded.",
          );
        }
      }
    }

    prepareVideo();

    return () => {
      active = false;
    };
  }, [recordingId]);

  function startPreview() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.duration > 30) {
      video.currentTime = 30;
    }

    video.muted = true;

    void video.play().catch(() => {
      // Some browsers may delay autoplay until interaction.
    });
  }

  if (error) {
    return (
      <div className="grid min-h-[45vh] place-items-center border-y border-white/10 bg-black px-6 text-center">
        <p className="max-w-xl text-sm leading-7 text-[#a8adb5]">
          {error}
        </p>
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div className="grid min-h-[45vh] place-items-center border-y border-white/10 bg-black">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e1c58f]">
          Loading featured footage…
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls
        preload="auto"
        src={playbackUrl}
        aria-label={title}
        onLoadedMetadata={startPreview}
        onEnded={startPreview}
        className="max-h-[85vh] min-h-[45vh] w-full bg-black object-contain md:min-h-[65vh]"
      >
        Your browser does not support video playback.
      </video>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-5 pb-16 pt-24 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1500px] items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
              Featured case
            </p>

            <p className="m-0 max-w-3xl font-serif text-2xl font-medium text-white md:text-4xl">
              {title}
            </p>
          </div>

          <Link
            href={caseHref}
            className="pointer-events-auto inline-flex min-h-12 shrink-0 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
          >
            View full case
            <span className="ml-3" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}