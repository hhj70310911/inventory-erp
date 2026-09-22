"use client";

import { useFormState } from "react-dom";
import { updateSubRateAction, type UpdateSubRateState } from "@/app/actions/rate";
import { MAX_ASSIGNED_RATE, PLATFORM_BASE_RATE } from "@/lib/commission";
import { formatFeePercent } from "@/lib/service-fee";

const initial: UpdateSubRateState = {};

type Props = {
  userId: string;
  myRatePercent: number;
  subRatePercent: number;
};

export function MemberRateForm({
  userId,
  myRatePercent,
  subRatePercent,
}: Props) {
  const [state, formAction] = useFormState(updateSubRateAction, initial);

  return (
    <div className="mb-8 rounded-lg border border-border bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-ink">新邀請預設費率</h2>
      <p className="mb-3 text-sm text-muted">
        我的代購費率：{formatFeePercent(myRatePercent)}%
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="userId" value={userId} />
        <label className="flex flex-col gap-1 text-sm">
          <span>新會員預設費率（%）</span>
          <input
            name="subRatePercent"
            type="number"
            min={PLATFORM_BASE_RATE}
            max={MAX_ASSIGNED_RATE}
            step={0.1}
            defaultValue={subRatePercent}
            required
            className="w-28 rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          儲存費率
        </button>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="mt-2 text-sm text-green-700">費率已更新</p>
      ) : null}
    </div>
  );
}
