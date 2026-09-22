"use client";

import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateProductAction, type ProductFormState } from "@/app/actions/product";
import { ProductImageUploader } from "@/components/ProductImageUploader";
import { ProductSpecEditor } from "../ProductSpecEditor";
import { CategorySelect } from "@/components/CategorySelect";
import type { CategoryNavItem } from "@/lib/categories";
import type { SpecPayload } from "@/lib/variants";
import type { Product } from "@prisma/client";

type Props = {
  product: Product;
  categories: CategoryNavItem[];
  initialImageUrls: string[];
  specInitial: SpecPayload;
  initialAcceptOrders: boolean;
};

export function ProductEditForm({
  product,
  categories,
  initialImageUrls,
  specInitial,
  initialAcceptOrders,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateProductAction, {} as ProductFormState);
  const [uploading, setUploading] = useState(false);
  const [hasVariants, setHasVariants] = useState(product.hasVariants);

  useEffect(() => {
    if (state?.success) router.push("/admin/products");
  }, [state?.success, router]);

  const ic = "border border-neutral-300 px-3 py-2 text-base w-full rounded";

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      <input type="hidden" name="id" value={product.id} />

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>商品名稱</span>
        <input name="title" required defaultValue={product.title} className={ic} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>後台簡稱（選，僅管理列表顯示）</span>
        <input name="adminLabel" defaultValue={product.adminLabel} className={ic} placeholder="如：床墊-灰Q" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>描述</span>
        <textarea name="description" rows={4} required defaultValue={product.description} className={ic} />
      </label>

      <CategorySelect
        categories={categories}
        defaultCategoryId={product.categoryId}
        inputClass={ic}
      />

      <div className="flex flex-col gap-2 text-sm font-medium">
        <span>商品圖片（最多 15 張，可點「設為封面」）</span>
        <ProductImageUploader initialUrls={initialImageUrls} onUploadingChange={setUploading} />
      </div>

      <ProductSpecEditor initial={specInitial} onHasVariantsChange={setHasVariants} />

      {!hasVariants ? (
        <>
          <p className="text-xs text-neutral-500">單一規格：請填售價</p>
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span>NT$ 售價</span>
            <input name="priceTwd" type="number" inputMode="numeric" min={0} required defaultValue={product.priceTwd} className={ic} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span>韓元參考價（選）</span>
            <input name="priceKrw" type="number" inputMode="numeric" min={0} defaultValue={product.priceKrw ?? ""} className={ic} />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input name="acceptOrders" type="checkbox" defaultChecked={initialAcceptOrders} className="h-5 w-5" />
            <span>接受訂購（未勾選則前台顯示暫停接單）</span>
          </label>
        </>
      ) : (
        <p className="text-xs text-neutral-500">
          已開啟多規格：價格請在「影響價格」的規格類別中填寫。
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>單位</span>
        <input name="unitLabel" defaultValue={product.unitLabel} className={ic} />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input name="published" type="checkbox" defaultChecked={product.published} className="h-5 w-5" />
        <span>上架中</span>
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {uploading ? "圖片上傳中…" : "儲存變更"}
      </button>
    </form>
  );
}
