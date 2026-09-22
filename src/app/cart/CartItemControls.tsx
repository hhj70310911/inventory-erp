"use client";

import { useTransition } from "react";
import { removeFromCartAction, updateCartQuantityAction } from "@/app/actions/cart";
import { CART_MAX_QUANTITY } from "@/lib/variants";

type Props = {
  cartItemId: string;
  quantity: number;
};

export function CartItemControls({ cartItemId, quantity }: Props) {
  const [pending, startTransition] = useTransition();

  function updateQty(qty: number) {
    startTransition(async () => {
      await updateCartQuantityAction(cartItemId, qty);
    });
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={pending || quantity <= 1}
        onClick={() => updateQty(quantity - 1)}
        className="border border-neutral-300 px-2 py-0.5 disabled:opacity-40"
      >
        −
      </button>
      <span>{quantity}</span>
      <button
        type="button"
        disabled={pending || quantity >= CART_MAX_QUANTITY}
        onClick={() => updateQty(quantity + 1)}
        className="border border-neutral-300 px-2 py-0.5 disabled:opacity-40"
      >
        +
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { await removeFromCartAction(cartItemId); })}
        className="text-red-600 underline"
      >
        移除
      </button>
    </div>
  );
}
