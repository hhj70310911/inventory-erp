"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import {
  updateChildRateAction,
  type UpdateChildRateState,
} from "@/app/actions/child-rate";
import {
  MAX_ASSIGNED_RATE,
  PLATFORM_BASE_RATE,
} from "@/lib/commission";

const initial: UpdateChildRateState = {};

type Props = {
  memberId: string;
  displayName: string;
  email: string;
  roleLabel: string;
  depthLabel: string;
  myRatePercent: number;
};

export function DownlineRateRow({
  memberId,
  displayName,
  email,
  roleLabel,
  depthLabel,
  myRatePercent,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateChildRateAction, initial);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <li className="border-b border-neutral-100 px-3 py-3 last:border-b-0">
      <form
        action={formAction}
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_5rem_6rem_auto] sm:items-center sm:gap-x-2"
      >
        <input type="hidden" name="memberId" value={memberId} />
        <div>
          <p className="font-medium text-ink">
            {displayName.trim() || email}
          </p>
          <p className="text-xs text-muted">{email}</p>
        </div>
        <p className="text-sm text-muted">{roleLabel}</p>
        <p className="text-sm text-muted">{depthLabel}</p>
        <div className="flex items-center gap-1">
          <input
            key={`${memberId}-${myRatePercent}`}
            name="myRatePercent"
            type="number"
            min={PLATFORM_BASE_RATE}
            max={MAX_ASSIGNED_RATE}
            step={0.1}
            defaultValue={myRatePercent}
            required
            className="h-8 w-full rounded border border-neutral-300 px-2 text-sm"
          />
          <span className="text-xs text-muted">%</span>
        </div>
        <button
          type="submit"
          className="h-8 rounded bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
        >
          儲存
        </button>
        {state?.error || state?.success ? (
          <p
            className={`text-xs sm:col-span-5 ${state.error ? "text-red-600" : "text-green-700"}`}
          >
            {state.error ?? "已更新"}
          </p>
        ) : null}
      </form>
      <p className="mt-1 text-xs text-muted">
        可設 {PLATFORM_BASE_RATE}%～{MAX_ASSIGNED_RATE}%，僅更新此會員
      </p>
    </li>
  );
}
