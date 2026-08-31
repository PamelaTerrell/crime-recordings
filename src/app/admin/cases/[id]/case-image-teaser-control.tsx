"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CaseImageTeaserControlProps = {
  imageId: string;
  imageTitle: string;
  isPublished: boolean;
  isPublicTeaser: boolean;
};

type UpdateResponse = {
  success?: boolean;
  error?: string;
};

export default function CaseImageTeaserControl({
  imageId,
  imageTitle,
  isPublished,
  isPublicTeaser,
}: CaseImageTeaserControlProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    isPublicTeaser,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function updateTeaser(nextSelected: boolean) {
    if (nextSelected && !isPublished) {
      setError(
        "Publish this image before using it as the public archive teaser.",
      );
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/case-images/${imageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isPublicTeaser: nextSelected,
          }),
        },
      );

      const data = (await response.json()) as UpdateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "The public archive teaser could not be updated.",
        );
      }

      setSelected(nextSelected);
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The public archive teaser could not be updated.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 border border-white/10 bg-[#080b0f] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#d8d9dc]">
          Archive teaser preview
        </strong>

        {selected ? (
          <span className="border border-[#c8a66a] bg-[#c8a66a]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e1c58f]">
            Public archive teaser
          </span>
        ) : null}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/case-images/${imageId}/thumbnail`}
        alt={`Archive teaser preview for ${imageTitle}`}
        className="h-auto w-full max-w-[380px] border border-white/10 bg-black object-contain"
      />

      <label
        className={`flex items-start gap-3 ${
          !isPublished
            ? "cursor-not-allowed opacity-50"
            : ""
        }`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => {
            void updateTeaser(event.target.checked);
          }}
          disabled={pending || !isPublished}
          className="mt-0.5 h-5 w-5 accent-[#c8a66a]"
        />

        <span>
          <strong className="block text-sm font-medium text-[#d8d9dc]">
            Public archive teaser
          </strong>

          <small className="mt-1 block text-xs leading-5 text-[#747b84]">
            Show this image on the public case archive card.
            Its normal access level does not change.
          </small>

          {!isPublished ? (
            <small className="mt-1 block text-xs leading-5 text-[#a8adb5]">
              This image must be published before it can be
              selected.
            </small>
          ) : null}
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="m-0 text-sm leading-6 text-red-300"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
