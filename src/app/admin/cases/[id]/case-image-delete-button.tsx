"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CaseImageDeleteButtonProps = {
  imageId: string;
  imageTitle: string;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
};

export default function CaseImageDeleteButton({
  imageId,
  imageTitle,
}: CaseImageDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete this image?\n\n"${imageTitle}"\n\nThis will remove the file from Cloudflare R2 and delete the database record.`,
    );

    if (!confirmed) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/case-images/${imageId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as DeleteResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "The image could not be deleted.",
        );
      }

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The image could not be deleted.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center border border-red-400/50 bg-red-400/10 px-4 text-xs font-extrabold uppercase tracking-[0.09em] text-red-200 transition hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete image"}
      </button>

      {error ? (
        <p
          role="alert"
          className="text-sm leading-6 text-red-300"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}