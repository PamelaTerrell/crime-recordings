"use client";

import { useState } from "react";

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
  requiresSignIn?: boolean;
  alreadySubscribed?: boolean;
};

export default function CheckoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
        },
      );

      const data =
        (await response.json()) as CheckoutResponse;

      if (data.requiresSignIn) {
        window.location.href = "/login?next=/membership";
        return;
      }

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(
          data.error ?? "Checkout could not be started.",
        );
      }

      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started.",
      );
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={pending}
        className="inline-flex min-h-14 w-full items-center justify-center border border-[#c8a66a] bg-[#c8a66a] px-8 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111318] transition hover:bg-[#e1c58f] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {pending
          ? "Preparing secure checkout…"
          : "Become a member"}
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