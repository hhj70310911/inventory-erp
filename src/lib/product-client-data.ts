import { getDefaultVariantId } from "@/lib/product-variant-sync";
import type { OptionForClient, VariantForClient } from "@/lib/variants";

type ProductLoaded = {
  id: string;
  hasVariants: boolean;
  options: {
    id: string;
    name: string;
    sortOrder: number;
    affectsPrice: boolean;
    values: { id: string; value: string; sortOrder: number }[];
  }[];
  variants: {
    id: string;
    priceTwd: number;
    priceKrw: number | null;
    acceptOrders: boolean;
    values: { optionValueId: string }[];
  }[];
};

export async function buildPurchasePanelData(product: ProductLoaded) {
  const options: OptionForClient[] = product.options.map((o) => ({
    id: o.id,
    name: o.name,
    sortOrder: o.sortOrder,
    affectsPrice: o.affectsPrice,
    values: o.values.map((v) => ({ id: v.id, value: v.value, sortOrder: v.sortOrder })),
  }));

  const variants: VariantForClient[] = product.variants.map((v) => ({
    id: v.id,
    priceTwd: v.priceTwd,
    priceKrw: v.priceKrw,
    acceptOrders: v.acceptOrders,
    valueIds: v.values.map((x) => x.optionValueId),
  }));

  let defaultVariantId = product.variants[0]?.id ?? "";
  if (!defaultVariantId) {
    defaultVariantId = (await getDefaultVariantId(product.id)) ?? "";
  }

  return { options, variants, defaultVariantId };
}
