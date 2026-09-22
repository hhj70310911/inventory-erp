"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";
import { QuantityStepper } from "@/components/QuantityStepper";
import { formatPriceRange, isOptionValueSelectable } from "@/lib/variants";
import type { OptionForClient, VariantForClient } from "@/lib/variants";

type Props = {
  showPrices: boolean;
  hasVariants: boolean;
  unitLabel: string;
  options: OptionForClient[];
  variants: VariantForClient[];
  defaultVariantId: string;
};

export function ProductPurchasePanel({
  showPrices,
  hasVariants,
  unitLabel,
  options,
  variants,
  defaultVariantId,
}: Props) {
  const { showAddedToast, refreshCart } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.sortOrder - b.sortOrder),
    [options],
  );

  const matchedVariant = useMemo(() => {
    if (!hasVariants) {
      return variants[0] ?? null;
    }
    if (sortedOptions.some((o) => !selected[o.id])) return null;
    const chosenIds = sortedOptions.map((o) => {
      const val = o.values.find((v) => v.value === selected[o.id]);
      return val?.id;
    });
    if (chosenIds.some((id) => !id)) return null;
    return (
      variants.find((v) => {
        if (v.valueIds.length !== chosenIds.length) return false;
        return chosenIds.every((id) => v.valueIds.includes(id!));
      }) ?? null
    );
  }, [hasVariants, sortedOptions, selected, variants]);

  const activeVariant = hasVariants ? matchedVariant : variants[0] ?? null;
  const variantKey = activeVariant?.id ?? "";

  useEffect(() => {
    setQuantity(1);
  }, [variantKey]);

  const range = useMemo(() => {
    const accepting = variants.filter((v) => v.acceptOrders);
    const list = accepting.length > 0 ? accepting : variants;
    if (list.length === 0) return null;
    const prices = list.map((v) => v.priceTwd);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [variants]);

  function selectOption(optionId: string, value: string) {
    setSelected((prev) => ({ ...prev, [optionId]: value }));
    setMsg(null);
  }

  function handleAddToCart() {
    const variantId = hasVariants ? matchedVariant?.id : defaultVariantId;
    if (!variantId) {
      setMsg("請先選擇完整規格");
      return;
    }
    if (activeVariant && !activeVariant.acceptOrders) {
      return;
    }
    startTransition(async () => {
      const res = await addToCartAction(variantId, quantity);
      if (res.error) setMsg(res.error);
      else {
        setMsg(null);
        await refreshCart();
        showAddedToast();
      }
    });
  }

  const paused = activeVariant != null && !activeVariant.acceptOrders;
  const canAdd = showPrices && activeVariant != null && activeVariant.acceptOrders;

  return (
    <div className="flex flex-col gap-4">
      {showPrices ? (
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          {activeVariant && (hasVariants ? matchedVariant : true) ? (
            <>
              <p className="text-lg font-medium">
                NT. {activeVariant.priceTwd.toLocaleString()}
                {unitLabel ? ` / ${unitLabel}` : ""}
              </p>
              {activeVariant.priceKrw != null && activeVariant.priceKrw > 0 ? (
                <p className="text-sm text-muted">
                  參考 ₩ {activeVariant.priceKrw.toLocaleString()}
                </p>
              ) : null}
              {paused ? (
                <p className="text-sm text-red-600">此規格暫停接單</p>
              ) : null}
            </>
          ) : range ? (
            <p className="text-lg font-medium">
              {formatPriceRange(range.min, range.max)}
              {unitLabel ? ` / ${unitLabel}` : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">登入後顯示會員價</p>
      )}

      {hasVariants && showPrices
        ? sortedOptions.map((opt) => (
            <div key={opt.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{opt.name}</span>
              <div className="flex flex-wrap gap-2">
                {[...opt.values]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((v) => {
                    const selectable = isOptionValueSelectable(
                      v.id,
                      opt.id,
                      selected,
                      sortedOptions,
                      variants,
                    );
                    const isSelected = selected[opt.id] === v.value;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!selectable}
                        onClick={() => selectable && selectOption(opt.id, v.value)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed ${
                          !selectable
                            ? "border-border bg-page text-muted opacity-60"
                            : isSelected
                              ? "border-brand bg-brand text-white"
                              : "border-border bg-surface text-ink hover:border-brand/40"
                        }`}
                      >
                        {v.value}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))
        : null}

      {hasVariants && showPrices && sortedOptions.every((o) => selected[o.id]) && !matchedVariant ? (
        <p className="text-sm text-red-600">此規格組合暫無供應</p>
      ) : null}

      {!hasVariants && showPrices && paused ? (
        <p className="text-sm text-red-600">此規格暫停接單</p>
      ) : null}

      {showPrices ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">數量</span>
          <QuantityStepper
            quantity={quantity}
            onChange={setQuantity}
            disabled={!canAdd}
            pending={pending}
          />
        </div>
      ) : null}

      {showPrices ? (
        <button
          type="button"
          disabled={!canAdd || pending}
          onClick={handleAddToCart}
          className="btn-primary w-full"
        >
          {pending ? "處理中…" : "加入購物車"}
        </button>
      ) : null}

      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
    </div>
  );
}
