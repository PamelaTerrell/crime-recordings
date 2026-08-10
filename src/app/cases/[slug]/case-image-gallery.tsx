"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type CaseImage = {
  id: string;
  title: string;
  caption: string | null;
  source_name: string | null;
  source_reference: string | null;
  image_date: string | null;
  mime_type: string | null;
  access_level: "public" | "member";
  is_disturbing: boolean;
  sort_order: number;
  created_at: string;
};

type ImageListResponse = {
  images?: CaseImage[];
  signedIn?: boolean;
  hasMemberAccess?: boolean;
  restrictedImageCount?: number;
  error?: string;
};

type ImageUrlResponse = {
  viewUrl?: string;
  expiresInSeconds?: number;
  requiresSignIn?: boolean;
  requiresMembership?: boolean;
  error?: string;
};

type CaseImageGalleryProps = {
  caseId: string;
};

type ImageLoadError = {
  message: string;
  requiresSignIn: boolean;
  requiresMembership: boolean;
};

function formatImageDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

async function loadImageUrl(imageId: string) {
  const response = await fetch(
    `/api/public/case-images/${imageId}/view-url`,
    {
      method: "POST",
      cache: "no-store",
    },
  );

  const data =
    (await response.json()) as ImageUrlResponse;

  if (!response.ok || !data.viewUrl) {
    return {
      viewUrl: null,
      error: {
        message:
          data.error ??
          "The image could not be displayed.",
        requiresSignIn:
          data.requiresSignIn === true,
        requiresMembership:
          data.requiresMembership === true,
      } satisfies ImageLoadError,
    };
  }

  return {
    viewUrl: data.viewUrl,
    error: null,
  };
}

type LazyCaseImageProps = {
  image: CaseImage;
};

function LazyCaseImage({
  image,
}: LazyCaseImageProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const [shouldLoad, setShouldLoad] =
    useState(false);

  const [viewUrl, setViewUrl] = useState<
    string | null
  >(null);

  const [imageError, setImageError] =
    useState<ImageLoadError | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function requestImage() {
    if (loading || viewUrl) {
      return;
    }

    setLoading(true);
    setImageError(null);

    try {
      const result =
        await loadImageUrl(image.id);

      if (result.viewUrl) {
        setViewUrl(result.viewUrl);
      } else if (result.error) {
        setImageError(result.error);
      }
    } catch (error) {
      setImageError({
        message:
          error instanceof Error
            ? error.message
            : "The image could not be displayed.",
        requiresSignIn: false,
        requiresMembership: false,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    /*
     * Begin preparing the image shortly before
     * the viewer scrolls to it.
     *
     * This prevents large galleries from requesting
     * every secure image URL simultaneously.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "500px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    void requestImage();

    // requestImage intentionally runs once when
    // this image approaches the viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoad]);

  return (
    <div
      ref={containerRef}
      className="mt-7"
    >
      {viewUrl ? (
        <div className="flex justify-center">
          <div className="inline-flex max-w-full overflow-hidden border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewUrl}
              alt={image.caption ?? image.title}
              loading="lazy"
              decoding="async"
              className="h-auto max-h-[600px] w-auto max-w-full object-contain md:max-w-[800px]"
            />
          </div>
        </div>
      ) : imageError ? (
        <div className="mx-auto grid min-h-64 max-w-[800px] place-items-center border border-white/10 bg-black px-6 py-12 text-center">
          <div className="max-w-xl">
            <p className="text-base leading-7 text-[#c8cbd0]">
              {imageError.message}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {imageError.requiresSignIn ? (
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center border border-white/15 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30"
                >
                  Sign in
                </Link>
              ) : null}

              {imageError.requiresMembership ? (
                <Link
                  href="/membership"
                  className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
                >
                  View membership
                </Link>
              ) : null}

              {!imageError.requiresSignIn &&
              !imageError.requiresMembership ? (
                <button
                  type="button"
                  onClick={() => {
                    setImageError(null);
                    void requestImage();
                  }}
                  disabled={loading}
                  className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? "Preparing…"
                    : "Try again"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid min-h-64 max-w-[800px] place-items-center border border-white/10 bg-black px-6 text-center text-[#a8adb5]">
          <div>
            <p className="text-sm">
              {shouldLoad || loading
                ? "Preparing secure image…"
                : "Image will load as you scroll…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CaseImageGallery({
  caseId,
}: CaseImageGalleryProps) {
  const [acknowledged, setAcknowledged] =
    useState(false);

  const [images, setImages] = useState<
    CaseImage[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [signedIn, setSignedIn] =
    useState(false);

  const [
    hasMemberAccess,
    setHasMemberAccess,
  ] = useState(false);

  const [
    restrictedImageCount,
    setRestrictedImageCount,
  ] = useState(0);

  async function handleAcknowledge() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * Only fetch image metadata here.
       *
       * Individual secure image URLs are requested
       * later by LazyCaseImage when each photograph
       * approaches the viewport.
       */
      const response = await fetch(
        "/api/public/case-images",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            caseId,
          }),
        },
      );

      const data =
        (await response.json()) as ImageListResponse;

      if (
        !response.ok ||
        !Array.isArray(data.images)
      ) {
        throw new Error(
          data.error ??
            "The case images could not be loaded.",
        );
      }

      setImages(data.images);

      setSignedIn(
        data.signedIn === true,
      );

      setHasMemberAccess(
        data.hasMemberAccess === true,
      );

      setRestrictedImageCount(
        data.restrictedImageCount ?? 0,
      );

      setAcknowledged(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The case images could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!acknowledged) {
    return (
      <section className="border-t border-white/10 bg-[#0d1117] px-5 py-16 md:px-10 md:py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
            Visual evidence
          </p>

          <h2 className="mt-5 font-serif text-5xl font-medium text-[#f4f1e9] md:text-7xl">
            Case images
          </h2>

          <div className="mt-10 max-w-4xl border border-[#c8a66a]/40 bg-[#c8a66a]/5 p-7 md:p-10">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
              Disturbing image warning
            </p>

            <p className="mt-5 text-lg leading-8 text-[#c8cbd0]">
              This case archive may contain
              crime-scene, injury, evidence, or
              other images that some viewers may
              find graphic or distressing. By
              continuing, you confirm that you
              understand the nature of the
              material.
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-5 text-sm leading-6 text-red-300"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#case-overview"
                className="inline-flex min-h-13 items-center justify-center border border-white/15 px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30 hover:text-white"
              >
                Return to case
              </a>

              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={loading}
                className="inline-flex min-h-13 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60"
              >
                {loading
                  ? "Preparing images…"
                  : "I understand — view images"}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-white/10 bg-[#0d1117] px-5 py-16 md:px-10 md:py-20 lg:px-16 lg:py-24">
      <div className="mx-auto max-w-[1500px]">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
          Visual evidence
        </p>

        <h2 className="mt-5 font-serif text-5xl font-medium text-[#f4f1e9] md:text-7xl">
          Case images
        </h2>

        {images.length > 0 ? (
          <div className="mt-12 grid gap-12">
            {images.map((image, index) => {
              const formattedDate =
                formatImageDate(
                  image.image_date,
                );

              return (
                <article
                  key={image.id}
                  className="border-t border-white/10 pt-8"
                >
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <span className="mr-2 font-serif text-2xl text-[#c8a66a]">
                        {String(
                          index + 1,
                        ).padStart(2, "0")}
                      </span>

                      <span className="border border-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
                        {image.access_level ===
                        "public"
                          ? "Public"
                          : "Members only"}
                      </span>

                      {image.is_disturbing ? (
                        <span className="border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-200">
                          Sensitive
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-serif text-3xl font-medium text-[#f4f1e9] md:text-4xl">
                      {image.title}
                    </h3>

                    <LazyCaseImage
                      image={image}
                    />

                    <div className="mx-auto mt-6 max-w-[800px]">
                      {image.caption ? (
                        <p className="text-base leading-7 text-[#c8cbd0]">
                          {image.caption}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#858c95]">
                        {image.source_name ? (
                          <span>
                            Source:{" "}
                            {
                              image.source_name
                            }
                          </span>
                        ) : null}

                        {image.source_reference ? (
                          <span>
                            Reference:{" "}
                            {
                              image.source_reference
                            }
                          </span>
                        ) : null}

                        {formattedDate ? (
                          <span>
                            Image date:{" "}
                            {formattedDate}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-10 text-lg text-[#a8adb5]">
            No case images are currently
            available to this viewer.
          </p>
        )}

        {restrictedImageCount > 0 &&
        !hasMemberAccess ? (
          <div className="mt-12 max-w-4xl border border-[#c8a66a]/40 bg-[#c8a66a]/5 p-7">
            <p className="text-lg leading-8 text-[#c8cbd0]">
              {restrictedImageCount} additional{" "}
              {restrictedImageCount === 1
                ? "image is"
                : "images are"}{" "}
              available to active members.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {!signedIn ? (
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center border border-white/15 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30"
                >
                  Sign in
                </Link>
              ) : null}

              <Link
                href="/membership"
                className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
              >
                View membership
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}