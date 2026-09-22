"use client";

import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { acceptInviteAction, type AcceptInviteState } from "@/app/actions/invite";

const initial: AcceptInviteState = {};

type Props = {
  token: string;
  prefilledDisplayName: string;
};

export function InviteAcceptForm({ token, prefilledDisplayName }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(acceptInviteAction, initial);
  const needsDisplayName = !prefilledDisplayName.trim();

  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => router.push("/login"), 1200);
      return () => clearTimeout(t);
    }
  }, [state?.success, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {needsDisplayName ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">稱呼</span>
          <input
            name="displayName"
            type="text"
            required
            placeholder="例：王小明"
            className="input-field"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">設定密碼</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-field"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">確認密碼</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-field"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700">開通成功，正轉至登入</p>
      ) : null}
      <button type="submit" className="btn-primary w-full">
        完成開通
      </button>
    </form>
  );
}
