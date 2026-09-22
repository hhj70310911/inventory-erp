"use client";

import { useFormState } from "react-dom";
import { placeOrderAction, type PlaceOrderState } from "@/app/actions/order";

const initial: PlaceOrderState = {};

export function CheckoutForm() {
  const [state, formAction] = useFormState(placeOrderAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-600">備註（選填）</span>
        <textarea name="note" rows={3} className="border border-neutral-300 px-3 py-2 rounded" />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        className="rounded bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700"
      >
        確認送出訂單
      </button>
    </form>
  );
}
