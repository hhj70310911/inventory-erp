"use client";

import { CART_MAX_QUANTITY } from "@/lib/variants";

type Props = {
  quantity: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
  pending?: boolean;
  min?: number;
  max?: number;
};

export function QuantityStepper({
  quantity,
  onChange,
  disabled = false,
  pending = false,
  min = 1,
  max = CART_MAX_QUANTITY,
}: Props) {
  const blocked = disabled || pending;

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={blocked || quantity <= min}
        onClick={() => onChange(quantity - 1)}
        className="border border-neutral-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="減少數量"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center tabular-nums">{quantity}</span>
      <button
        type="button"
        disabled={blocked || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className="border border-neutral-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="增加數量"
      >
        +
      </button>
    </div>
  );
}
