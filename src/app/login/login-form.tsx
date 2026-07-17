"use client";

import { useActionState } from "react";
import {
  requestMagicLink,
  type LoginState,
} from "./actions";

const INITIAL_STATE: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="login-form">
      <div className="form-field">
        <label htmlFor="email">Email address</label>

        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
        />
      </div>

      <button className="login-submit" type="submit" disabled={pending}>
        {pending ? "Sending secure link…" : "Email me a sign-in link"}
      </button>

      {state.error && (
        <p className="form-message form-error" role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="form-message form-success" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}