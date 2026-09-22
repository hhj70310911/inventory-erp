"use client";

import { useFormState } from "react-dom";
import { loginAction, type LoginState } from "@/app/actions/login";

const initial: LoginState = { ok: true };

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-field"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">密碼</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-field"
        />
      </label>
      {state?.ok === false && state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn-primary w-full">
        登入
      </button>
    </form>
  );
}
