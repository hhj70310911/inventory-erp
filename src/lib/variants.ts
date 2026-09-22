export type ValueInput = {
  value: string;
  priceTwd?: number;
  priceKrw?: number | null;
  acceptOrders?: boolean;
};

export type OptionInput = {
  name: string;
  affectsPrice: boolean;
  values: ValueInput[];
};

export type SpecPayload = {
  hasVariants: boolean;
  options: OptionInput[];
};

export const CART_MAX_QUANTITY = 99;
export const MAX_SPEC_OPTIONS = 3;

export function parseSpecPayload(raw: string): SpecPayload | null {
  try {
    const data = JSON.parse(raw) as SpecPayload;
    if (typeof data.hasVariants !== "boolean") return null;
    if (!Array.isArray(data.options)) return null;
    return data;
  } catch {
    return null;
  }
}

export function countCombinations(options: OptionInput[]): number {
  const counts = options
    .map((o) => o.values.map((v) => v.value.trim()).filter(Boolean).length)
    .filter((n) => n > 0);
  if (counts.length === 0) return 0;
  return counts.reduce((a, b) => a * b, 1);
}

export function variantSpecLabel(
  values: { optionValue: { value: string; option: { name: string; sortOrder: number } } }[],
): string {
  return [...values]
    .sort((a, b) => a.optionValue.option.sortOrder - b.optionValue.option.sortOrder)
    .map((v) => v.optionValue.value)
    .join(" / ");
}

export function priceRangeFromVariants(variants: { priceTwd: number; acceptOrders?: boolean }[]): {
  min: number;
  max: number;
} | null {
  const accepting = variants.filter((v) => v.acceptOrders !== false);
  const list = accepting.length > 0 ? accepting : variants;
  if (list.length === 0) return null;
  const prices = list.map((v) => v.priceTwd);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatPriceRange(min: number, max: number): string {
  if (min === max) return `NT$ ${min.toLocaleString()}`;
  return `NT$ ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

export type VariantForClient = {
  id: string;
  priceTwd: number;
  priceKrw: number | null;
  acceptOrders: boolean;
  valueIds: string[];
};

export type OptionForClient = {
  id: string;
  name: string;
  sortOrder: number;
  affectsPrice: boolean;
  values: { id: string; value: string; sortOrder: number }[];
};

/** True if some accepting variant matches this value and current partial selection. */
export function isOptionValueSelectable(
  valueId: string,
  optionId: string,
  selectedByOptionId: Record<string, string>,
  options: OptionForClient[],
  variants: VariantForClient[],
): boolean {
  return variants.some((variant) => {
    if (!variant.acceptOrders) return false;
    if (!variant.valueIds.includes(valueId)) return false;

    for (const opt of options) {
      if (opt.id === optionId) continue;
      const label = selectedByOptionId[opt.id];
      if (!label) continue;
      const chosen = opt.values.find((v) => v.value === label);
      if (!chosen || !variant.valueIds.includes(chosen.id)) return false;
    }
    return true;
  });
}
