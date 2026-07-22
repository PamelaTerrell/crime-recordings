"use client";

import { useState } from "react";

type PortalResponse = {
  portalUrl?: string;
  error?: string;
  requiresSignIn?: boolean;
  noMembership?: boolean;
};

export default function ManageMembershipButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        "/api/stripe/create-portal-session",
        {
          method: "POST",
        },
      );

      const data =
        (await response.json()) as PortalResponse;

      if (data.requiresSignIn) {
        window.location.href = "/login?next=/account";
        return;
      }

      if (!response.ok || !data.portalUrl) {
        throw new Error(
          data.error ??
            "The billing portal could not be opened.",
        );
      }

      window.location.href = data.portalUrl;
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : "The billing portal could not be opened.",
      );

      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={pending}
        className="inline-flex min-h-14 items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-7 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Opening billing portal…"
          : "Manage membership"}
      </button>

      {error ? (
        <p
          role="alert"
          className="mt-5 border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}