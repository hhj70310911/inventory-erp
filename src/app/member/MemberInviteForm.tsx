"use client";

import { useFormState } from "react-dom";
import {
  createMemberInviteAction,
  type CreateInviteState,
} from "@/app/actions/invite";
import { InviteLinkBox } from "@/components/InviteLinkBox";
import type { InviteMode } from "@/lib/agent-tree";

const initial: CreateInviteState = {};

type Props = {
  canInvite: boolean;
  inviteMode: InviteMode;
};

export function MemberInviteForm({ canInvite, inviteMode }: Props) {
  const [state, formAction] = useFormState(createMemberInviteAction, initial);

  if (!canInvite) {
    return (
      <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        您目前無法再邀請下線。
      </p>
    );
  }

  const title =
    inviteMode === "buyer" ? "邀請消費者加入" : "邀請下線代理加入";

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <form action={formAction} className="flex max-w-md flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>稱呼（選，留空由對方註冊時填寫）</span>
          <input
            name="displayName"
            type="text"
            placeholder="例：王小明"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <button
          type="submit"
          className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          產生邀請連結
        </button>
      </form>
      {state?.link ? <InviteLinkBox link={state.link} /> : null}
    </div>
  );
}
