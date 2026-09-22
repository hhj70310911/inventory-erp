import Link from "next/link";
import { OliveYoungImportForm } from "@/app/admin/products/import/OliveYoungImportForm";
import { getCategoryNavItems } from "@/lib/categories";

export default async function OliveYoungImportPage() {
  const categories = await getCategoryNavItems();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">從 Olive Young 匯入</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/products" className="underline underline-offset-4">
            ← 商品列表
          </Link>
          <Link href="/admin" className="underline underline-offset-4">
            後台
          </Link>
        </div>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-neutral-600">
        貼上單一商品網址後抓取韓幣價格與圖片，依匯率換算台幣。請在說明欄貼上 Gemini 文案後再建立商品。
      </p>
      <OliveYoungImportForm categories={categories} />
    </div>
  );
}
