import type { SpecPayload } from "@/lib/variants";

type ProductWithSpecs = {
  hasVariants: boolean;
  variants: { acceptOrders: boolean }[];
  options: {
    name: string;
    sortOrder: number;
    affectsPrice: boolean;
    values: {
      value: string;
      sortOrder: number;
      priceTwd: number | null;
      priceKrw: number | null;
      acceptOrders: boolean;
    }[];
  }[];
};

export function productToSpecPayload(product: ProductWithSpecs): SpecPayload {
  if (!product.hasVariants) {
    return { hasVariants: false, options: [] };
  }

  const options = [...product.options]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((o) => ({
      name: o.name,
      affectsPrice: o.affectsPrice,
      values: [...o.values]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => ({
          value: v.value,
          priceTwd: o.affectsPrice ? (v.priceTwd ?? 0) : undefined,
          priceKrw: o.affectsPrice ? v.priceKrw : undefined,
          acceptOrders: v.acceptOrders,
        })),
    }));

  return { hasVariants: true, options };
}

export function getSingleAcceptOrders(product: ProductWithSpecs): boolean {
  return product.variants[0]?.acceptOrders ?? true;
}
