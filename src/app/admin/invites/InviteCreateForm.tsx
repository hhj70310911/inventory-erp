"use client";

import { useFormState } from "react-dom";
import { createInviteAction, type CreateInviteState } from "@/app/actions/invite";
import { InviteLinkBox } from "@/components/InviteLinkBox";

const initial: CreateInviteState = {};

type SponsorOption = {
  id: string;
  label: string;
};

type Props = {
  sponsorOptions: SponsorOption[];
};

export function InviteCreateForm({ sponsorOptions }: Props) {
  const [state, formAction] = useFormState(createInviteAction, initial);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex max-w-md flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>稱呼（選，留空由客戶註冊時填寫）</span>
          <input
            name="displayName"
            type="text"
            placeholder="例：王小明、阿哲"
            className="border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            className="border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>指定上線 VIP（選，留空為頂層代理）</span>
          <select name="sponsorId" className="border border-neutral-300 px-3 py-2" defaultValue="">
            <option value="">頂層代理（無上線）</option>
            {sponsorOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <button
          type="submit"
          className="w-fit bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          產生邀請連結
        </button>
      </form>
      {state?.link ? <InviteLinkBox link={state.link} /> : null}
    </div>
  );
}
