"use server";

import { auth } from "@/auth";
import { type ProductFormState } from "@/app/actions/product";
import { uploadRemoteImages } from "@/lib/cloudinary-server";
import { krwToTwd } from "@/lib/exchange";
import { buildPreviewFromScraped, scrapeOliveYoungProduct } from "@/lib/oliveyoung/scraper";
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

export type OliveYoungImportPreview = {
  goodsNo: string;
  sourceUrl: string;
  sourceTitle: string;
  brand?: string;
  priceKrw: number;
  priceTwd: number;
  imageUrls: string[];
  suggestedTitle: string;
  suggestedDescription: string;
};

export type OliveYoungPreviewState = {
  error?: string;
  preview?: OliveYoungImportPreview;
};

function parseImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function parseIntSafe(v: FormDataEntryValue | null, fallback: number) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
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

export async function previewOliveYoungImportAction(
  url: string,
): Promise<OliveYoungPreviewState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "無權限" };
  }

  const trimmed = url.trim();
  if (!trimmed) return { error: "請貼上 Olive Young 商品網址" };

  try {
    const scraped = await scrapeOliveYoungProduct(trimmed);
    const priceTwd = krwToTwd(scraped.priceKrw);
    const preview = buildPreviewFromScraped(scraped, priceTwd);
    const goodsNoMatch = scraped.sourceUrl.match(/goodsNo=([A-Z0-9]+)/i);

    return {
      preview: {
        goodsNo: goodsNoMatch?.[1] ?? "",
        ...preview,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "抓取失敗";
    return { error: message };
  }
}

export async function confirmOliveYoungImportAction(
  _prev: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "無權限" };
  }

  const sourceUrl = String(formData.get("sourceUrl") || "").trim();
  const sourceTitle = String(formData.get("sourceTitle") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "");
  const remoteImageUrls = parseImageUrls(formData);
  const priceTwd = parseIntSafe(formData.get("priceTwd"), NaN);
  const priceKrwRaw = formData.get("priceKrw");
  const published = formData.get("published") === "on";
  const variantsRaw =
    String(formData.get("variantsData") || "") ||
    JSON.stringify({ hasVariants: false, options: [] });
  const payload = parseSpecPayload(variantsRaw);

  if (!sourceUrl) return { error: "缺少來源網址" };
  if (!title) return { error: "請填商品名稱" };
  if (!payload) return { error: "規格資料格式錯誤" };
  if (!payload.hasVariants && (!Number.isFinite(priceTwd) || priceTwd < 0)) {
    return { error: "台幣價無效" };
  }
  if (remoteImageUrls.length === 0) return { error: "至少需要一張圖片" };

  let priceKrwValue: number | null = null;
  if (priceKrwRaw != null && String(priceKrwRaw).trim() !== "") {
    const n = parseIntSafe(priceKrwRaw, NaN);
    if (!Number.isFinite(n) || n < 0) return { error: "韓元參考價無效" };
    priceKrwValue = n;
  }

  const categoryResult = await resolveCategoryId(formData);
  if ("error" in categoryResult) return { error: categoryResult.error };

  const existing = await prisma.product.findUnique({
    where: { sourceUrl },
    select: { id: true, title: true },
  });
  if (existing) {
    return { error: `此商品已匯入：${existing.title}` };
  }

  let cloudinaryUrls: string[];
  try {
    cloudinaryUrls = await uploadRemoteImages(remoteImageUrls);
  } catch (err) {
    const message = err instanceof Error ? err.message : "圖片上傳失敗";
    return { error: message };
  }

  const { imageUrl, images } = productImageData(cloudinaryUrls);
  const acceptOrders = payload.hasVariants ? true : formData.get("acceptOrders") === "on";

  const product = await prisma.product.create({
    data: {
      title,
      adminLabel: "",
      description,
      imageUrl,
      images,
      unitLabel: "",
      priceTwd: payload.hasVariants ? 0 : priceTwd,
      priceKrw: payload.hasVariants ? null : priceKrwValue,
      stock: 0,
      hasVariants: payload.hasVariants,
      published,
      categoryId: categoryResult.categoryId,
      sourceUrl,
      sourceTitle: sourceTitle || null,
    },
  });

  const synced = await syncProductSpecs(product.id, payload, {
    priceTwd,
    priceKrw: priceKrwValue,
    acceptOrders,
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
