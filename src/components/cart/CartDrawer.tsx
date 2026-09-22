"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  removeFromCartAction,
  updateCartQuantityAction,
  type CartLineItem,
} from "@/app/actions/cart";
import { OrderTotalsSummary } from "@/components/OrderTotalsSummary";
import type { OrderTotals } from "@/lib/service-fee";
import { CART_MAX_QUANTITY } from "@/lib/variants";

type Props = {
  open: boolean;
  onClose: () => void;
  items: CartLineItem[];
  totals: OrderTotals;
  onRefresh: () => Promise<void>;
};

function DrawerLine({
  item,
  onRefresh,
}: {
  item: CartLineItem;
  onRefresh: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function changeQty(qty: number) {
    startTransition(async () => {
      await updateCartQuantityAction(item.id, qty);
      await onRefresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeFromCartAction(item.id);
      await onRefresh();
    });
  }

  return (
    <li className="flex gap-3 border-b border-neutral-100 py-3">
      <div className="h-14 w-14 shrink-0 bg-neutral-100 md:h-16 md:w-16">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{item.productTitle}</p>
        {item.specLabel ? (
          <p className="text-xs text-neutral-500">{item.specLabel}</p>
        ) : null}
        {!item.acceptOrders ? (
          <p className="text-xs text-red-600">此規格暫停接單</p>
        ) : null}
        <p className="text-sm">
          NT$ {item.priceTwd.toLocaleString()} × {item.quantity}
        </p>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={pending || item.quantity <= 1}
            onClick={() => changeQty(item.quantity - 1)}
            className="border border-neutral-300 px-2 py-0.5 disabled:opacity-40"
          >
            −
          </button>
          <span>{item.quantity}</span>
          <button
            type="button"
            disabled={pending || item.quantity >= CART_MAX_QUANTITY}
            onClick={() => changeQty(item.quantity + 1)}
            className="border border-neutral-300 px-2 py-0.5 disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="ml-auto text-xs text-red-600 underline"
          >
            移除
          </button>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer({ open, onClose, items, totals, onRefresh }: Props) {
  const hasPaused = items.some((i) => !i.acceptOrders);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end">
      <button
        type="button"
        aria-label="關閉購物車"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        className="relative flex max-h-[78vh] w-full flex-col rounded-t-2xl border-t-4 border-brand bg-surface shadow-xl md:h-full md:max-h-none md:max-w-md md:rounded-none md:border-t-0 md:border-l md:border-brand"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2 md:py-3">
          <h2 id="cart-drawer-title" className="text-base font-semibold md:text-lg">
            購物車
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted hover:bg-page md:h-9 md:w-9 md:text-xl"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">購物車是空的</p>
          ) : (
            <ul>
              {items.map((item) => (
                <DrawerLine key={item.id} item={item} onRefresh={onRefresh} />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <div className="shrink-0 border-t border-border px-4 pt-3 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:pt-4 md:pb-4">
            <OrderTotalsSummary totals={totals} className="mb-2" size="sm" showCartHint />
            {hasPaused ? (
              <p className="mb-2 text-center text-xs text-red-600">請先移除暫停接單的商品</p>
            ) : null}
            <Link
              href="/checkout"
              onClick={onClose}
              className={`block w-full rounded-lg py-2.5 text-center text-sm font-medium text-white ${
                hasPaused
                  ? "pointer-events-none bg-muted"
                  : "bg-brand hover:bg-brand/90"
              }`}
            >
              前往結帳
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="mt-1.5 block text-center text-xs text-neutral-500 underline"
            >
              查看完整購物車頁
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
