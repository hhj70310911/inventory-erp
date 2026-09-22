import prisma from "@/lib/prisma";
import type { OptionInput, SpecPayload } from "@/lib/variants";
import { MAX_SPEC_OPTIONS } from "@/lib/variants";

type Combo = { labels: string[]; priceTwd: number; priceKrw: number | null; acceptOrders: boolean };

function buildCombos(options: OptionInput[]): Combo[] {
  const prepared = options.map((opt) => ({
    affectsPrice: opt.affectsPrice,
    values: opt.values
      .map((v) => ({
        label: v.value.trim(),
        priceTwd: v.priceTwd ?? 0,
        priceKrw: v.priceKrw ?? null,
        acceptOrders: v.acceptOrders !== false,
      }))
      .filter((v) => v.label),
  }));

  function recur(index: number, acc: Combo): Combo[] {
    if (index >= prepared.length) return [acc];
    const opt = prepared[index];
    const out: Combo[] = [];
    for (const val of opt.values) {
      const next: Combo = {
        labels: [...acc.labels, val.label],
        priceTwd: opt.affectsPrice ? val.priceTwd : acc.priceTwd,
        priceKrw: opt.affectsPrice ? val.priceKrw : acc.priceKrw,
        acceptOrders: acc.acceptOrders && val.acceptOrders,
      };
      out.push(...recur(index + 1, next));
    }
    return out;
  }

  return recur(0, { labels: [], priceTwd: 0, priceKrw: null, acceptOrders: true });
}

export async function syncProductSpecs(
  productId: string,
  payload: SpecPayload,
  fallback: { priceTwd: number; priceKrw: number | null; acceptOrders: boolean },
): Promise<{ error: string } | { priceTwd: number }> {
  await prisma.productVariantValue.deleteMany({
    where: { variant: { productId } },
  });
  await prisma.productVariant.deleteMany({ where: { productId } });
  await prisma.productOptionValue.deleteMany({
    where: { option: { productId } },
  });
  await prisma.productOption.deleteMany({ where: { productId } });

  if (!payload.hasVariants) {
    await prisma.productVariant.create({
      data: {
        productId,
        priceTwd: fallback.priceTwd,
        priceKrw: fallback.priceKrw,
        acceptOrders: fallback.acceptOrders,
      },
    });
    return { priceTwd: fallback.priceTwd };
  }

  if (payload.options.length === 0) {
    return { error: "請至少新增一個規格類別" };
  }
  if (payload.options.length > MAX_SPEC_OPTIONS) {
    return { error: `規格類別最多 ${MAX_SPEC_OPTIONS} 個` };
  }

  const pricingCount = payload.options.filter((o) => o.affectsPrice).length;
  if (pricingCount !== 1) {
    return { error: "請恰好指定一個「影響價格」的規格類別（例如尺寸）" };
  }

  const optionRecords: {
    name: string;
    affectsPrice: boolean;
    valueMap: Map<string, { id: string; priceTwd: number; priceKrw: number | null; acceptOrders: boolean }>;
  }[] = [];

  for (let oi = 0; oi < payload.options.length; oi++) {
    const opt = payload.options[oi];
    const name = opt.name.trim();
    if (!name) return { error: "規格類別名稱不可為空" };

    const values = opt.values.map((v) => ({ ...v, value: v.value.trim() })).filter((v) => v.value);
    if (values.length === 0) return { error: `「${name}」至少需要一個選項` };

    if (opt.affectsPrice) {
      for (const v of values) {
        const price = v.priceTwd ?? NaN;
        if (!Number.isFinite(price) || price < 0) {
          return { error: `「${name}」選項「${v.value}」請填寫有效售價` };
        }
      }
    }

    const option = await prisma.productOption.create({
      data: { productId, name, sortOrder: oi, affectsPrice: opt.affectsPrice },
    });

    const valueMap = new Map<
      string,
      { id: string; priceTwd: number; priceKrw: number | null; acceptOrders: boolean }
    >();

    for (let vi = 0; vi < values.length; vi++) {
      const v = values[vi];
      const val = await prisma.productOptionValue.create({
        data: {
          optionId: option.id,
          value: v.value,
          sortOrder: vi,
          priceTwd: opt.affectsPrice ? (v.priceTwd ?? 0) : null,
          priceKrw: opt.affectsPrice ? (v.priceKrw ?? null) : null,
          acceptOrders: v.acceptOrders !== false,
        },
      });
      valueMap.set(v.value, {
        id: val.id,
        priceTwd: val.priceTwd ?? 0,
        priceKrw: val.priceKrw,
        acceptOrders: val.acceptOrders,
      });
    }
    optionRecords.push({ name, affectsPrice: opt.affectsPrice, valueMap });
  }

  const combos = buildCombos(payload.options);
  if (combos.length === 0) return { error: "無法產生規格組合" };

  for (const combo of combos) {
    const valueIds: string[] = [];
    for (let i = 0; i < combo.labels.length; i++) {
      const id = optionRecords[i].valueMap.get(combo.labels[i])?.id;
      if (!id) return { error: "規格組合資料異常" };
      valueIds.push(id);
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        priceTwd: combo.priceTwd,
        priceKrw: combo.priceKrw,
        acceptOrders: combo.acceptOrders,
      },
    });

    await prisma.productVariantValue.createMany({
      data: valueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId })),
    });
  }

  const prices = combos.map((c) => c.priceTwd);
  return { priceTwd: Math.min(...prices) };
}

export async function getDefaultVariantId(productId: string): Promise<string | null> {
  const v = await prisma.productVariant.findFirst({
    where: { productId },
    select: { id: true },
  });
  return v?.id ?? null;
}
