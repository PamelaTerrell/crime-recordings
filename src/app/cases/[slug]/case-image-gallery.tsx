"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

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

type GalleryImageVariant =
  | "featured"
  | "preview"
  | "archive";

type LightboxState = {
  image: CaseImage;
  viewUrl: string;
  index: number;
} | null;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function formatImageDate(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const parsedDate =
    new Date(`${value}T12:00:00`);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  ).format(parsedDate);
}

async function loadImageUrl(
  imageId: string,
) {
  const response = await fetch(
    `/api/public/case-images/${imageId}/view-url`,
    {
      method: "POST",
      cache: "no-store",
    },
  );

  const data =
    (await response.json()) as ImageUrlResponse;

  if (
    !response.ok ||
    !data.viewUrl
  ) {
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

/*
 * =========================================================
 * IMAGE BADGES
 * =========================================================
 */

type ImageBadgesProps = {
  image: CaseImage;
};

function ImageBadges({
  image,
}: ImageBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#a8adb5]">
        {image.access_level === "public"
          ? "Public"
          : "Members only"}
      </span>

      {image.is_disturbing ? (
        <span className="border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-red-200">
          Sensitive
        </span>
      ) : null}
    </div>
  );
}

/*
 * =========================================================
 * IMAGE DETAILS
 * =========================================================
 */

type ImageDetailsProps = {
  image: CaseImage;
  compact?: boolean;
};

function ImageDetails({
  image,
  compact = false,
}: ImageDetailsProps) {
  const formattedDate =
    formatImageDate(
      image.image_date,
    );

  return (
    <div>
      <ImageBadges
        image={image}
      />

      <h3
        className={
          compact
            ? "mt-3 font-serif text-xl font-medium leading-tight text-[#f4f1e9] md:text-2xl"
            : "mt-4 max-w-4xl font-serif text-3xl font-medium leading-tight text-[#f4f1e9] md:text-4xl"
        }
      >
        {image.title}
      </h3>

      {image.caption ? (
        <p
          className={
            compact
              ? "mt-2 line-clamp-2 text-sm leading-6 text-[#9fa4ab]"
              : "mt-4 max-w-3xl text-base leading-7 text-[#c8cbd0]"
          }
        >
          {image.caption}
        </p>
      ) : null}

      {!compact &&
      (image.source_name ||
        image.source_reference ||
        formattedDate) ? (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#858c95]">
          {image.source_name ? (
            <div className="flex gap-2">
              <dt className="font-semibold text-[#a8adb5]">
                Source:
              </dt>

              <dd>
                {image.source_name}
              </dd>
            </div>
          ) : null}

          {image.source_reference ? (
            <div className="flex gap-2">
              <dt className="font-semibold text-[#a8adb5]">
                Reference:
              </dt>

              <dd>
                {
                  image.source_reference
                }
              </dd>
            </div>
          ) : null}

          {formattedDate ? (
            <div className="flex gap-2">
              <dt className="font-semibold text-[#a8adb5]">
                Image date:
              </dt>

              <dd>
                {formattedDate}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/*
 * =========================================================
 * SECURE LAZY IMAGE
 *
 * Secure URLs are requested only when the image approaches
 * the viewport rather than requesting the entire archive at
 * once.
 * =========================================================
 */

type SecureGalleryImageProps = {
  image: CaseImage;
  index: number;
  variant: GalleryImageVariant;
  onOpen: (
    image: CaseImage,
    viewUrl: string,
    index: number,
  ) => void;
};

function SecureGalleryImage({
  image,
  index,
  variant,
  onOpen,
}: SecureGalleryImageProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    shouldLoad,
    setShouldLoad,
  ] = useState(false);

  const [viewUrl, setViewUrl] =
    useState<string | null>(
      null,
    );

  const [
    imageError,
    setImageError,
  ] =
    useState<ImageLoadError | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const requestImage =
    useCallback(async () => {
      if (
        loading ||
        viewUrl
      ) {
        return;
      }

      setLoading(true);
      setImageError(null);

      try {
        const result =
          await loadImageUrl(
            image.id,
          );

        if (result.viewUrl) {
          setViewUrl(
            result.viewUrl,
          );
        } else if (
          result.error
        ) {
          setImageError(
            result.error,
          );
        }
      } catch (error) {
        setImageError({
          message:
            error instanceof Error
              ? error.message
              : "The image could not be displayed.",
          requiresSignIn:
            false,
          requiresMembership:
            false,
        });
      } finally {
        setLoading(false);
      }
    }, [
      image.id,
      loading,
      viewUrl,
    ]);

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0];

          if (
            entry?.isIntersecting
          ) {
            setShouldLoad(
              true,
            );

            observer.disconnect();
          }
        },
        {
          rootMargin:
            "500px 0px",
          threshold: 0.01,
        },
      );

    observer.observe(
      element,
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    void requestImage();
  }, [
    shouldLoad,
    requestImage,
  ]);

  const wrapperClassName =
    variant === "featured"
      ? "relative min-h-[320px] overflow-hidden border border-white/10 bg-black md:min-h-[520px]"
      : "relative aspect-[4/3] overflow-hidden border border-white/10 bg-black";

  const imageClassName =
    variant === "featured"
      ? "h-full min-h-[320px] w-full object-contain md:min-h-[520px]"
      : "h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]";

  return (
    <div
      ref={containerRef}
    >
      {viewUrl ? (
        <button
          type="button"
          onClick={() => {
            onOpen(
              image,
              viewUrl,
              index,
            );
          }}
          className={`group block w-full cursor-zoom-in text-left ${wrapperClassName}`}
          aria-label={`Open ${image.title} in image viewer`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewUrl}
            alt={
              image.caption ??
              image.title
            }
            loading="lazy"
            decoding="async"
            className={
              imageClassName
            }
          />

          <span className="absolute bottom-3 right-3 border border-white/20 bg-black/80 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white backdrop-blur-sm transition group-hover:border-[#c8a66a]/70">
            View larger
          </span>
        </button>
      ) : imageError ? (
        <div
          className={`${wrapperClassName} grid place-items-center px-5 py-8 text-center`}
        >
          <div className="max-w-sm">
            <p className="text-sm leading-6 text-[#c8cbd0]">
              {
                imageError.message
              }
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {imageError.requiresSignIn ? (
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center border border-white/15 px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30"
                >
                  Sign in
                </Link>
              ) : null}

              {imageError.requiresMembership ? (
                <Link
                  href="/membership"
                  className="inline-flex min-h-11 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f]"
                >
                  Membership
                </Link>
              ) : null}

              {!imageError.requiresSignIn &&
              !imageError.requiresMembership ? (
                <button
                  type="button"
                  onClick={() => {
                    setImageError(
                      null,
                    );

                    void requestImage();
                  }}
                  disabled={
                    loading
                  }
                  className="inline-flex min-h-11 items-center justify-center border border-[#c8a66a] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#e1c58f] transition hover:bg-[#c8a66a]/10 disabled:cursor-wait disabled:opacity-60"
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
        <div
          className={`${wrapperClassName} grid place-items-center px-5 text-center`}
          aria-live="polite"
        >
          <div>
            <div className="mx-auto h-8 w-8 animate-pulse rounded-full border border-[#c8a66a]/50" />

            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
              {shouldLoad ||
              loading
                ? "Preparing secure image"
                : "Image loads as you scroll"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * =========================================================
 * LIGHTBOX
 * =========================================================
 */

type ImageLightboxProps = {
  lightbox: LightboxState;
  images: CaseImage[];
  onClose: () => void;
  onNavigate: (
    index: number,
  ) => Promise<void>;
};

function ImageLightbox({
  lightbox,
  images,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const closeButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [
    navigating,
    setNavigating,
  ] = useState(false);

  const [
    navigationError,
    setNavigationError,
  ] = useState("");

  const handleNavigate =
    useCallback(
      async (
        nextIndex: number,
      ) => {
        if (navigating) {
          return;
        }

        setNavigating(true);
        setNavigationError("");

        try {
          await onNavigate(
            nextIndex,
          );
        } catch {
          setNavigationError(
            "The next image could not be prepared.",
          );
        } finally {
          setNavigating(false);
        }
      },
      [
        navigating,
        onNavigate,
      ],
    );

  useEffect(() => {
    if (!lightbox) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    closeButtonRef.current?.focus();

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (
        event.key ===
          "ArrowRight" &&
        lightbox.index <
          images.length - 1
      ) {
        void handleNavigate(
          lightbox.index + 1,
        );
      }

      if (
        event.key ===
          "ArrowLeft" &&
        lightbox.index > 0
      ) {
        void handleNavigate(
          lightbox.index - 1,
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    lightbox,
    images.length,
    onClose,
    handleNavigate,
  ]);

  if (!lightbox) {
    return null;
  }

  const formattedDate =
    formatImageDate(
      lightbox.image.image_date,
    );

  const hasPrevious =
    lightbox.index > 0;

  const hasNext =
    lightbox.index <
    images.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-image-viewer-title"
      onMouseDown={(
        event,
      ) => {
        if (
          event.currentTarget ===
          event.target
        ) {
          onClose();
        }
      }}
    >
      <div className="flex h-full flex-col">
        {/* VIEWER HEADER */}
        <div className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#080b0f] px-4 md:px-6">
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#8d744b]">
              Case image{" "}
              {lightbox.index + 1}{" "}
              of {images.length}
            </p>

            <p
              id="case-image-viewer-title"
              className="mt-1 truncate font-serif text-lg text-[#f4f1e9] md:text-xl"
            >
              {
                lightbox.image
                  .title
              }
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={
              onClose
            }
            className="shrink-0 border border-white/15 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#d8d9dc] transition hover:border-white/35 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* IMAGE */}
          <div className="relative grid min-h-[60vh] place-items-center bg-black p-4 md:p-8">
            {navigating ? (
              <div className="absolute inset-0 z-10 grid place-items-center bg-black/70">
                <div className="text-center">
                  <div className="mx-auto h-9 w-9 animate-pulse rounded-full border border-[#c8a66a]/60" />

                  <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#a8adb5]">
                    Preparing image
                  </p>
                </div>
              </div>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                lightbox.viewUrl
              }
              alt={
                lightbox.image
                  .caption ??
                lightbox.image
                  .title
              }
              className="max-h-[82vh] max-w-full object-contain"
            />

            {/* PREVIOUS */}
            {hasPrevious ? (
              <button
                type="button"
                onClick={() => {
                  void handleNavigate(
                    lightbox.index -
                      1,
                  );
                }}
                disabled={
                  navigating
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 border border-white/15 bg-black/75 px-4 py-3 text-xl text-white backdrop-blur-sm transition hover:border-[#c8a66a]/70 disabled:opacity-40 md:left-6"
                aria-label="Previous image"
              >
                ←
              </button>
            ) : null}

            {/* NEXT */}
            {hasNext ? (
              <button
                type="button"
                onClick={() => {
                  void handleNavigate(
                    lightbox.index +
                      1,
                  );
                }}
                disabled={
                  navigating
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 border border-white/15 bg-black/75 px-4 py-3 text-xl text-white backdrop-blur-sm transition hover:border-[#c8a66a]/70 disabled:opacity-40 md:right-6"
                aria-label="Next image"
              >
                →
              </button>
            ) : null}
          </div>

          {/* IMAGE DETAILS */}
          <aside className="border-t border-white/10 bg-[#0d1117] p-6 lg:border-l lg:border-t-0 lg:p-8">
            <ImageBadges
              image={
                lightbox.image
              }
            />

            <h2 className="mt-5 font-serif text-3xl font-medium leading-tight text-[#f4f1e9]">
              {
                lightbox.image
                  .title
              }
            </h2>

            {lightbox.image
              .caption ? (
              <p className="mt-5 text-base leading-7 text-[#c8cbd0]">
                {
                  lightbox.image
                    .caption
                }
              </p>
            ) : null}

            {navigationError ? (
              <p
                role="alert"
                className="mt-5 text-sm leading-6 text-red-300"
              >
                {
                  navigationError
                }
              </p>
            ) : null}

            <dl className="mt-8 border-t border-white/10 text-sm">
              {lightbox.image
                .source_name ? (
                <div className="border-b border-white/10 py-4">
                  <dt className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                    Source
                  </dt>

                  <dd className="mt-2 leading-6 text-[#c8cbd0]">
                    {
                      lightbox
                        .image
                        .source_name
                    }
                  </dd>
                </div>
              ) : null}

              {lightbox.image
                .source_reference ? (
                <div className="border-b border-white/10 py-4">
                  <dt className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                    Reference
                  </dt>

                  <dd className="mt-2 break-words leading-6 text-[#c8cbd0]">
                    {
                      lightbox
                        .image
                        .source_reference
                    }
                  </dd>
                </div>
              ) : null}

              {formattedDate ? (
                <div className="border-b border-white/10 py-4">
                  <dt className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                    Image date
                  </dt>

                  <dd className="mt-2 text-[#c8cbd0]">
                    {
                      formattedDate
                    }
                  </dd>
                </div>
              ) : null}

              <div className="border-b border-white/10 py-4">
                <dt className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  Archive position
                </dt>

                <dd className="mt-2 text-[#c8cbd0]">
                  Image{" "}
                  {
                    lightbox.index +
                    1
                  }{" "}
                  of{" "}
                  {images.length}
                </dd>
              </div>
            </dl>

            <p className="mt-6 text-xs leading-5 text-[#666d76]">
              Use the arrow keys to
              move between images.
              Press Escape to close
              the viewer.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

/*
 * =========================================================
 * MAIN CASE IMAGE ARCHIVE
 * =========================================================
 */

export default function CaseImageGallery({
  caseId,
}: CaseImageGalleryProps) {
  const [
    acknowledged,
    setAcknowledged,
  ] = useState(false);

  const [images, setImages] =
    useState<CaseImage[]>(
      [],
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    signedIn,
    setSignedIn,
  ] = useState(false);

  const [
    hasMemberAccess,
    setHasMemberAccess,
  ] = useState(false);

  const [
    restrictedImageCount,
    setRestrictedImageCount,
  ] = useState(0);

  const [
    archiveExpanded,
    setArchiveExpanded,
  ] = useState(false);

  const [
    lightbox,
    setLightbox,
  ] =
    useState<LightboxState>(
      null,
    );

  /*
   * Fetch only the image metadata
   * after the user acknowledges the
   * content warning.
   */
  async function handleAcknowledge() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/public/case-images",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
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
        !Array.isArray(
          data.images,
        )
      ) {
        throw new Error(
          data.error ??
            "The case images could not be loaded.",
        );
      }

      setImages(
        data.images,
      );

      setSignedIn(
        data.signedIn ===
          true,
      );

      setHasMemberAccess(
        data.hasMemberAccess ===
          true,
      );

      setRestrictedImageCount(
        data.restrictedImageCount ??
          0,
      );

      setAcknowledged(
        true,
      );
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

  /*
   * Open an already-loaded image.
   */
  const openLightbox =
    useCallback(
      (
        image: CaseImage,
        viewUrl: string,
        index: number,
      ) => {
        setLightbox({
          image,
          viewUrl,
          index,
        });
      },
      [],
    );

  /*
   * Load the secure URL when moving
   * forward/backward inside the
   * viewer.
   */
  const navigateLightbox =
    useCallback(
      async (
        index: number,
      ) => {
        const nextImage =
          images[index];

        if (!nextImage) {
          return;
        }

        const result =
          await loadImageUrl(
            nextImage.id,
          );

        if (
          !result.viewUrl
        ) {
          throw new Error(
            result.error
              ?.message ??
              "The image could not be displayed.",
          );
        }

        setLightbox({
          image: nextImage,
          viewUrl:
            result.viewUrl,
          index,
        });
      },
      [images],
    );

  const closeLightbox =
    useCallback(() => {
      setLightbox(null);
    }, []);

  /*
   * Gallery hierarchy
   *
   * Image 1 = featured
   * Images 2–5 = preview grid
   * Images 6+ = complete archive
   */
  const featuredImage =
    images[0] ?? null;

  const previewImages =
    images.slice(1, 5);

  const remainingImages =
    images.slice(5);

  /*
   * =======================================================
   * CONTENT WARNING / ARCHIVE ACCESS GATE
   * =======================================================
   */

  if (!acknowledged) {
    return (
      <section className="border-t border-white/10 bg-[#0d1117] px-5 py-14 md:px-10 md:py-20 lg:px-16">
        <div className="mx-auto max-w-[1500px]">
          <div className="max-w-5xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
              Visual evidence
            </p>

            <h2 className="mt-5 font-serif text-5xl font-medium leading-[0.95] text-[#f4f1e9] md:text-7xl">
              Case Image Archive
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#a8adb5]">
              Photographs, visual
              evidence, and
              documented images
              preserved from the
              public record.
            </p>
          </div>

          <div className="mt-9 max-w-5xl overflow-hidden border border-[#c8a66a]/40 bg-[#c8a66a]/5">
            {/* WARNING HEADER */}
            <div className="border-b border-[#c8a66a]/20 px-6 py-5 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
                    Disturbing image
                    warning
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#8f959e]">
                    Please review
                    this notice
                    before entering
                    the image
                    archive.
                  </p>
                </div>

                <span className="inline-flex w-fit border border-red-400/25 bg-red-400/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-200">
                  Sensitive visual
                  material
                </span>
              </div>
            </div>

            {/* WARNING BODY */}
            <div className="px-6 py-7 md:px-8 md:py-8">
              <p className="max-w-4xl text-lg leading-8 text-[#c8cbd0]">
                This case archive
                may contain
                crime-scene
                photographs,
                injuries, evidence
                images, or other
                material that some
                viewers may find
                graphic or
                distressing. By
                continuing, you
                acknowledge the
                nature of the
                material and choose
                to enter the visual
                archive.
              </p>

              {/* ARCHIVE DETAILS */}
              <div className="mt-7 grid gap-5 border-y border-white/10 py-5 sm:grid-cols-3">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                    Archive type
                  </p>

                  <p className="mt-2 text-sm text-[#d8d9dc]">
                    Public-record
                    images
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                    Material
                  </p>

                  <p className="mt-2 text-sm text-[#d8d9dc]">
                    Photographs &
                    evidence
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                    Viewer notice
                  </p>

                  <p className="mt-2 text-sm text-[#d8d9dc]">
                    Sensitive content
                    possible
                  </p>
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-5 border border-red-400/20 bg-red-400/5 p-4 text-sm leading-6 text-red-300"
                >
                  {error}
                </p>
              ) : null}

              {/* ACTIONS */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#case-overview"
                  className="inline-flex min-h-13 items-center justify-center border border-white/15 px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30 hover:bg-white/[0.03] hover:text-white"
                >
                  Return to case
                </a>

                <button
                  type="button"
                  onClick={
                    handleAcknowledge
                  }
                  disabled={
                    loading
                  }
                  className="inline-flex min-h-13 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? "Preparing archive…"
                    : "Enter Image Archive"}
                </button>
              </div>

              <p className="mt-4 max-w-3xl text-xs leading-5 text-[#6f7680]">
                Entering the archive
                does not change your
                membership or access
                permissions.
                Restricted images
                remain protected.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /*
   * =======================================================
   * IMAGE ARCHIVE
   * =======================================================
   */

  return (
    <>
      <section className="border-t border-white/10 bg-[#0d1117] px-5 py-16 md:px-10 md:py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1500px]">
          {/* ARCHIVE HEADER */}
          <div className="flex flex-col justify-between gap-7 border-b border-white/10 pb-8 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e1c58f]">
                Visual evidence
              </p>

              <h2 className="mt-4 font-serif text-5xl font-medium leading-[0.95] text-[#f4f1e9] md:text-7xl">
                Case Image Archive
              </h2>

              <p className="mt-5 max-w-3xl text-base leading-7 text-[#a8adb5] md:text-lg md:leading-8">
                Photographs,
                visual evidence,
                and documented
                images preserved
                from the public
                record.
              </p>
            </div>

            {images.length > 0 ? (
              <div className="shrink-0 md:text-right">
                <span className="font-serif text-5xl text-[#e1c58f]">
                  {
                    images.length
                  }
                </span>

                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#747b84]">
                  {images.length ===
                  1
                    ? "Available image"
                    : "Available images"}
                </p>
              </div>
            ) : null}
          </div>

          {featuredImage ? (
            <div className="mt-10">
              {/* FEATURED + PREVIEW GRID */}
              <div
                className={
                  previewImages.length >
                  0
                    ? "grid gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.75fr)]"
                    : ""
                }
              >
                {/* FEATURED IMAGE */}
                <article>
                  <SecureGalleryImage
                    image={
                      featuredImage
                    }
                    index={0}
                    variant="featured"
                    onOpen={
                      openLightbox
                    }
                  />

                  <div className="mt-6">
                    <ImageDetails
                      image={
                        featuredImage
                      }
                    />
                  </div>
                </article>

                {/* PREVIEW IMAGES */}
                {previewImages.length >
                0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                    {previewImages.map(
                      (
                        image,
                        index,
                      ) => (
                        <article
                          key={
                            image.id
                          }
                          className="min-w-0"
                        >
                          <SecureGalleryImage
                            image={
                              image
                            }
                            index={
                              index +
                              1
                            }
                            variant="preview"
                            onOpen={
                              openLightbox
                            }
                          />

                          <div className="mt-3">
                            <ImageDetails
                              image={
                                image
                              }
                              compact
                            />
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                ) : null}
              </div>

              {/* COMPLETE ARCHIVE */}
              {remainingImages.length >
              0 ? (
                <div className="mt-14 border-t border-white/10 pt-9">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
                        Complete
                        archive
                      </p>

                      <p className="mt-2 text-base leading-7 text-[#a8adb5]">
                        {
                          remainingImages.length
                        }{" "}
                        additional{" "}
                        {remainingImages.length ===
                        1
                          ? "image"
                          : "images"}{" "}
                        in this case
                        collection.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setArchiveExpanded(
                          (
                            current,
                          ) =>
                            !current,
                        );
                      }}
                      aria-expanded={
                        archiveExpanded
                      }
                      className="inline-flex min-h-12 items-center justify-center border border-[#c8a66a] px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#e1c58f] transition hover:bg-[#c8a66a] hover:text-[#111318]"
                    >
                      {archiveExpanded
                        ? "Hide additional images"
                        : `View all ${images.length} images`}
                    </button>
                  </div>

                  {archiveExpanded ? (
                    <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                      {remainingImages.map(
                        (
                          image,
                          index,
                        ) => {
                          const absoluteIndex =
                            index +
                            5;

                          return (
                            <article
                              key={
                                image.id
                              }
                              className="min-w-0"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="font-serif text-xl text-[#8d744b]">
                                  {String(
                                    absoluteIndex +
                                      1,
                                  ).padStart(
                                    2,
                                    "0",
                                  )}
                                </span>
                              </div>

                              <SecureGalleryImage
                                image={
                                  image
                                }
                                index={
                                  absoluteIndex
                                }
                                variant="archive"
                                onOpen={
                                  openLightbox
                                }
                              />

                              <div className="mt-4">
                                <ImageDetails
                                  image={
                                    image
                                  }
                                  compact
                                />
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-10 border border-white/10 bg-[#10151b] p-8">
              <p className="m-0 text-lg text-[#a8adb5]">
                No case images are
                currently available
                to this viewer.
              </p>
            </div>
          )}

          {/* RESTRICTED MEMBER IMAGES */}
          {restrictedImageCount >
            0 &&
          !hasMemberAccess ? (
            <div className="mt-14 max-w-5xl overflow-hidden border border-[#c8a66a]/40 bg-[#c8a66a]/5">
              <div className="border-b border-[#c8a66a]/20 px-6 py-4 md:px-8">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#e1c58f]">
                  Extended image
                  archive
                </p>
              </div>

              <div className="px-6 py-7 md:px-8">
                <p className="max-w-3xl text-lg leading-8 text-[#c8cbd0]">
                  {
                    restrictedImageCount
                  }{" "}
                  additional{" "}
                  {restrictedImageCount ===
                  1
                    ? "image is"
                    : "images are"}{" "}
                  available to active
                  Crime Recordings
                  members.
                </p>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8f959e]">
                  Member access may
                  include additional
                  evidence photographs
                  and extended visual
                  case materials.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {!signedIn ? (
                    <Link
                      href="/login"
                      className="inline-flex min-h-12 items-center justify-center border border-white/15 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#d8d9dc] transition hover:border-white/30 hover:text-white"
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
            </div>
          ) : null}
        </div>
      </section>

      <ImageLightbox
        lightbox={
          lightbox
        }
        images={images}
        onClose={
          closeLightbox
        }
        onNavigate={
          navigateLightbox
        }
      />
    </>
  );
}