"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { syncProductSpecs } from "@/lib/product-variant-sync";
import { parseSpecPayload } from "@/lib/variants";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

export type ProductFormState = { error?: string; success?: boolean };

function parseIntSafe(v: FormDataEntryValue | null, fallback: number) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

async function resolveCategoryId(
  formData: FormData,
): Promise<{ categoryId: string | null } | { error: string }> {
  const raw = String(formData.get("categoryId") || "").trim();
  if (!raw) return { categoryId: null };

  const category = await prisma.category.findUnique({
    where: { id: raw },
    select: { id: true },
  });
  if (!category) return { error: "分類無效" };
  return { categoryId: raw };
}

async function revalidateCategoryPages() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  for (const { slug } of categories) {
    revalidatePath(`/category/${slug}`);
  }
}

function productImageData(urls: string[]) {
  const imageUrl = urls[0] ?? null;
  const images =
    urls.length > 0
      ? {
          create: urls.map((url, i) => ({ url, sortOrder: i })),
        }
      : undefined;
  return { imageUrl, images };
}

type ParsedProductBase =
  | { error: string }
  | {
      title: string;
      adminLabel: string;
      description: string;
      imageUrls: string[];
      unitLabel: string;
      priceTwd: number;
      priceKrwValue: number | null;
      acceptOrders: boolean;
      published: boolean;
      payload: NonNullable<ReturnType<typeof parseSpecPayload>>;
    };

function parseProductBase(formData: FormData): ParsedProductBase {
  const title = String(formData.get("title") || "").trim();
  const adminLabel = String(formData.get("adminLabel") || "").trim();
  const description = String(formData.get("description") || "");
  const imageUrls = parseImageUrls(formData);
  const unitLabel = String(formData.get("unitLabel") || "").trim();
  const priceTwd = parseIntSafe(formData.get("priceTwd"), NaN);
  const priceKrwRaw = formData.get("priceKrw");
  let priceKrwValue: number | null = null;
  if (priceKrwRaw != null && String(priceKrwRaw).trim() !== "") {
    const n = parseIntSafe(priceKrwRaw, NaN);
    if (!Number.isFinite(n) || n < 0) return { error: "韓元參考價無效" };
    priceKrwValue = n;
  }
  const published = formData.get("published") === "on";
  const variantsRaw = String(formData.get("variantsData") || "");
  const payload = parseSpecPayload(variantsRaw);

  if (!title) return { error: "請填商品名稱" };
  if (!payload) return { error: "規格資料格式錯誤" };

  const acceptOrders = payload.hasVariants ? true : formData.get("acceptOrders") === "on";

  if (!payload.hasVariants) {
    if (!Number.isFinite(priceTwd) || priceTwd < 0) return { error: "台幣價無效" };
  }

  return {
    title,
    adminLabel,
    description,
    imageUrls,
    unitLabel,
    priceTwd,
    priceKrwValue,
    acceptOrders,
    published,
    payload,
  };
}

export async function createProductAction(
  _prev: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "無權限" };
  }

  const parsed = parseProductBase(formData);
  if ("error" in parsed) return { error: parsed.error };

  const categoryResult = await resolveCategoryId(formData);
  if ("error" in categoryResult) return { error: categoryResult.error };

  const { imageUrls, payload, ...base } = parsed;
  const { imageUrl, images } = productImageData(imageUrls);

  const product = await prisma.product.create({
    data: {
      title: base.title,
      adminLabel: base.adminLabel,
      description: base.description,
      imageUrl,
      images,
      unitLabel: base.unitLabel,
      priceTwd: payload.hasVariants ? 0 : base.priceTwd,
      priceKrw: payload.hasVariants ? null : base.priceKrwValue,
      stock: 0,
      hasVariants: payload.hasVariants,
      published: base.published,
      categoryId: categoryResult.categoryId,
    },
  });

  const synced = await syncProductSpecs(product.id, payload, {
    priceTwd: base.priceTwd,
    priceKrw: base.priceKrwValue,
    acceptOrders: base.acceptOrders,
  });
  if ("error" in synced) {
    await prisma.product.delete({ where: { id: product.id } });
    return { error: synced.error };
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { priceTwd: synced.priceTwd },
  });

  revalidatePath("/");
  revalidatePath("/admin/products");
  await revalidateCategoryPages();
  return { success: true };
}

export async function updateProductAction(
  _prev: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "無權限" };
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "缺少商品 ID" };

  const parsed = parseProductBase(formData);
  if ("error" in parsed) return { error: parsed.error };

  const categoryResult = await resolveCategoryId(formData);
  if ("error" in categoryResult) return { error: categoryResult.error };

  const { imageUrls, payload, ...base } = parsed;
  const { imageUrl, images } = productImageData(imageUrls);

  const synced = await syncProductSpecs(id, payload, {
    priceTwd: base.priceTwd,
    priceKrw: base.priceKrwValue,
    acceptOrders: base.acceptOrders,
  });
  if ("error" in synced) return { error: synced.error };

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.product.update({
      where: { id },
      data: {
        title: base.title,
        adminLabel: base.adminLabel,
        description: base.description,
        imageUrl,
        images,
        unitLabel: base.unitLabel,
        priceTwd: synced.priceTwd,
        priceKrw: payload.hasVariants ? null : base.priceKrwValue,
        stock: 0,
        hasVariants: payload.hasVariants,
        published: base.published,
        categoryId: categoryResult.categoryId,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath(`/products/${id}`);
  await revalidateCategoryPages();
  return { success: true };
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/products");
  await revalidateCategoryPages();
}
