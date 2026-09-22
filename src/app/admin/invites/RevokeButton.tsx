"use client";

import { useTransition } from "react";
import { revokeInviteAction } from "@/app/actions/invite";

export function RevokeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  function handleRevoke() {
    if (!window.confirm("確定要撤銷這個邀請嗎？")) return;
    startTransition(async () => { await revokeInviteAction(id); });
  }
  return (
    <button onClick={handleRevoke} disabled={pending}
      className="text-red-500 underline underline-offset-4 hover:text-red-700 disabled:opacity-50">
      {pending ? "撤銷中…" : "撤銷"}
    </button>
  );
}
