"use client";

import { useMemo, useState } from "react";
import type { OptionInput, SpecPayload, ValueInput } from "@/lib/variants";
import { countCombinations, MAX_SPEC_OPTIONS } from "@/lib/variants";

type Props = {
  initial: SpecPayload;
  onHasVariantsChange?: (v: boolean) => void;
};

function emptyValue(affectsPrice: boolean): ValueInput {
  return affectsPrice
    ? { value: "", priceTwd: 0, priceKrw: null, acceptOrders: true }
    : { value: "", acceptOrders: true };
}

function emptyOption(): OptionInput {
  return { name: "", affectsPrice: false, values: [emptyValue(false)] };
}

export function ProductSpecEditor({ initial, onHasVariantsChange }: Props) {
  const [hasVariants, setHasVariantsState] = useState(initial.hasVariants);
  const [options, setOptions] = useState<OptionInput[]>(
    initial.options.length > 0 ? initial.options : [emptyOption()],
  );

  const payload: SpecPayload = useMemo(
    () => ({
      hasVariants,
      options: hasVariants ? options : [],
    }),
    [hasVariants, options],
  );

  const comboCount = hasVariants ? countCombinations(options) : 0;

  function handleHasVariantsChange(v: boolean) {
    setHasVariantsState(v);
    onHasVariantsChange?.(v);
  }

  function updateOption(i: number, patch: Partial<OptionInput>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function setAffectsPrice(oi: number, checked: boolean) {
    setOptions((prev) =>
      prev.map((o, idx) => {
        if (idx === oi) {
          return {
            ...o,
            affectsPrice: checked,
            values: o.values.map((v) =>
              checked
                ? {
                    value: v.value,
                    priceTwd: v.priceTwd ?? 0,
                    priceKrw: v.priceKrw ?? null,
                    acceptOrders: v.acceptOrders !== false,
                  }
                : { value: v.value, acceptOrders: v.acceptOrders !== false },
            ),
          };
        }
        return checked ? { ...o, affectsPrice: false } : o;
      }),
    );
  }

  function addOption() {
    if (options.length >= MAX_SPEC_OPTIONS) return;
    setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(i: number) {
    if (options.length <= 1) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateValue(oi: number, vi: number, patch: Partial<ValueInput>) {
    setOptions((prev) =>
      prev.map((o, idx) =>
        idx === oi
          ? { ...o, values: o.values.map((v, j) => (j === vi ? { ...v, ...patch } : v)) }
          : o,
      ),
    );
  }

  function addValue(oi: number) {
    const affectsPrice = options[oi]?.affectsPrice ?? false;
    setOptions((prev) =>
      prev.map((o, idx) =>
        idx === oi ? { ...o, values: [...o.values, emptyValue(affectsPrice)] } : o,
      ),
    );
  }

  function removeValue(oi: number, vi: number) {
    setOptions((prev) =>
      prev.map((o, idx) =>
        idx === oi && o.values.length > 1
          ? { ...o, values: o.values.filter((_, j) => j !== vi) }
          : o,
      ),
    );
  }

  const ic = "border border-neutral-300 px-2 py-1.5 text-sm w-full rounded";

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="variantsData" value={JSON.stringify(payload)} />

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={hasVariants}
          onChange={(e) => handleHasVariantsChange(e.target.checked)}
          className="h-5 w-5"
        />
        <span>開啟多規格販售</span>
      </label>

      {hasVariants ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            每個規格類別可設「影響價格」（例如尺寸）；其餘為純選項（例如顏色），亦可個別設定是否接單。系統會自動產生所有組合。
            {comboCount > 0 ? (
              <span className="ml-1 font-medium text-neutral-800">將產生 {comboCount} 種組合</span>
            ) : null}
          </p>

          {options.map((opt, oi) => (
            <div key={oi} className="rounded border border-neutral-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  placeholder="規格名稱（如 顏色、尺寸）"
                  value={opt.name}
                  onChange={(e) => updateOption(oi, { name: e.target.value })}
                  className={`${ic} max-w-xs flex-1`}
                />
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={opt.affectsPrice}
                    onChange={(e) => setAffectsPrice(oi, e.target.checked)}
                    className="h-4 w-4"
                  />
                  影響價格
                </label>
                {options.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeOption(oi)}
                    className="text-xs text-red-600 underline"
                  >
                    刪除類別
                  </button>
                ) : null}
              </div>

              {opt.affectsPrice ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border border-neutral-200 text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border-b px-2 py-2 text-left">選項</th>
                        <th className="border-b px-2 py-2 text-left">售價 NT$</th>
                        <th className="border-b px-2 py-2 text-left">韓元（選）</th>
                        <th className="border-b px-2 py-2 text-left">接單</th>
                        <th className="border-b px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {opt.values.map((val, vi) => (
                        <tr key={vi} className="border-b border-neutral-100">
                          <td className="px-2 py-2">
                            <input
                              value={val.value}
                              onChange={(e) => updateValue(oi, vi, { value: e.target.value })}
                              className={ic}
                              placeholder="如 BB、S"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={val.priceTwd ?? 0}
                              onChange={(e) =>
                                updateValue(oi, vi, {
                                  priceTwd: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className={ic}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={val.priceKrw ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateValue(oi, vi, {
                                  priceKrw: raw === "" ? null : parseInt(raw, 10) || 0,
                                });
                              }}
                              className={ic}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={val.acceptOrders !== false}
                              onChange={(e) =>
                                updateValue(oi, vi, { acceptOrders: e.target.checked })
                              }
                              className="h-5 w-5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeValue(oi, vi)}
                              className="text-xs text-red-600 underline"
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => addValue(oi)}
                    className="mt-2 text-sm underline"
                  >
                    + 新增選項
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] border border-neutral-200 text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border-b px-2 py-2 text-left">選項</th>
                        <th className="border-b px-2 py-2 text-left">接單</th>
                        <th className="border-b px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {opt.values.map((val, vi) => (
                        <tr key={vi} className="border-b border-neutral-100">
                          <td className="px-2 py-2">
                            <input
                              placeholder={`選項 ${vi + 1}`}
                              value={val.value}
                              onChange={(e) => updateValue(oi, vi, { value: e.target.value })}
                              className={ic}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={val.acceptOrders !== false}
                              onChange={(e) =>
                                updateValue(oi, vi, { acceptOrders: e.target.checked })
                              }
                              className="h-5 w-5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            {opt.values.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeValue(oi, vi)}
                                className="text-xs text-red-600 underline"
                              >
                                刪除
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => addValue(oi)}
                    className="mt-2 text-sm underline"
                  >
                    + 新增選項
                  </button>
                </div>
              )}
            </div>
          ))}

          {options.length < MAX_SPEC_OPTIONS ? (
            <button type="button" onClick={addOption} className="text-sm underline">
              + 新增規格類別
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
