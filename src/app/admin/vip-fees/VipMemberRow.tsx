"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import {
  updateVipMemberAction,
  type UpdateVipMemberState,
} from "@/app/actions/vip-member";
import {
  MAX_ASSIGNED_RATE,
  PLATFORM_BASE_RATE,
} from "@/lib/commission";

const inputClass =
  "h-8 w-full min-w-0 rounded border border-neutral-300 px-2 text-sm";

const ROW_GRID =
  "lg:grid-cols-[minmax(10rem,1.2fr)_6.5rem_5.5rem_minmax(12rem,2fr)_3rem]";

type Props = {
  userId: string;
  email: string;
  displayName: string;
  adminNote: string;
  myRatePercent: number;
  depthLabel: string;
  memberLabel: string;
  indentLevel: number;
};

export function VipMemberRow({
  userId,
  email,
  displayName,
  adminNote,
  myRatePercent,
  depthLabel,
  memberLabel,
  indentLevel,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateVipMemberAction, {} as UpdateVipMemberState);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <li className="border-b border-neutral-100 px-3 py-2 last:border-b-0">
      <form
        action={formAction}
        className={`grid grid-cols-1 gap-2 lg:items-center lg:gap-x-2 ${ROW_GRID}`}
      >
        <input type="hidden" name="userId" value={userId} />

        <div
          className="min-w-0"
          style={{ paddingLeft: `${indentLevel * 1.25}rem` }}
        >
          <p className="truncate text-sm font-medium text-neutral-800" title={memberLabel}>
            {indentLevel > 0 ? <span className="text-neutral-400">└ </span> : null}
            {memberLabel}
          </p>
          <p className="truncate text-xs text-neutral-500" title={email}>
            {email}
          </p>
          <span className="mt-0.5 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
            {depthLabel}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <input
            key={`${userId}-${myRatePercent}`}
            name="myRatePercent"
            type="number"
            min={PLATFORM_BASE_RATE}
            max={MAX_ASSIGNED_RATE}
            step={0.1}
            defaultValue={myRatePercent}
            required
            aria-label="指派費率"
            className={`${inputClass} min-w-[3.5rem]`}
          />
          <span className="shrink-0 text-xs text-neutral-500">%</span>
        </div>

        <label className="sr-only lg:not-sr-only lg:contents">
          <span className="text-xs text-neutral-500 lg:hidden">稱呼</span>
          <input
            name="displayName"
            type="text"
            defaultValue={displayName}
            placeholder="稱呼"
            className={`${inputClass} lg:max-w-[5.5rem]`}
          />
        </label>

        <label className="sr-only lg:not-sr-only lg:contents">
          <span className="text-xs text-neutral-500 lg:hidden">後台備註</span>
          <input
            name="adminNote"
            type="text"
            defaultValue={adminNote}
            placeholder="後台備註"
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="h-8 shrink-0 rounded bg-neutral-900 px-2.5 text-xs font-medium text-white hover:bg-neutral-800 lg:w-full"
        >
          儲存
        </button>

        {state?.error || state?.success ? (
          <p
            className={`text-xs lg:col-span-5 ${state.error ? "text-red-600" : "text-green-700"}`}
          >
            {state.error ?? "已更新"}
          </p>
        ) : null}
      </form>
      <p className="mt-1 text-xs text-neutral-400 lg:pl-3">
        可設 {PLATFORM_BASE_RATE}%～{MAX_ASSIGNED_RATE}%，僅更新此會員
      </p>
    </li>
  );
}
