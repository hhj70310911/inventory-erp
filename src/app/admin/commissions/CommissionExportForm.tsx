"use client";

import { useFormState } from "react-dom";
import {
  exportCommissionExcelAction,
  type ExportCommissionState,
} from "@/app/actions/commission-export";
import { useEffect } from "react";

const initial: ExportCommissionState = {};

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function CommissionExportForm() {
  const [state, formAction] = useFormState(exportCommissionExcelAction, initial);

  useEffect(() => {
    if (!state?.base64 || !state.filename) return;
    const bytes = Uint8Array.from(atob(state.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = state.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [state?.base64, state?.filename]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span>月份</span>
        <input
          name="yearMonth"
          type="month"
          defaultValue={currentYearMonth()}
          required
          className="border border-neutral-300 px-3 py-2"
        />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        className="w-fit bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
      >
        匯出 CSV（Excel 可開）
      </button>
      <p className="text-xs text-neutral-500">
        僅含「已完成」訂單；含訂單明細與代理月結兩個工作表。
      </p>
    </form>
  );
}
