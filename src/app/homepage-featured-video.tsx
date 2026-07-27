"use client";

import { useEffect, useRef, useState } from "react";

type HomepageFeaturedVideoProps = {
  recordingId: string;
  title: string;
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
      // Autoplay may be delayed by the browser.
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
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      controls
      preload="auto"
      src={playbackUrl}
      aria-label={title}
      onLoadedMetadata={startPreview}
      className="max-h-[85vh] min-h-[45vh] w-full border-y border-white/10 bg-black object-contain md:min-h-[65vh]"
    >
      Your browser does not support video playback.
    </video>
  );
}