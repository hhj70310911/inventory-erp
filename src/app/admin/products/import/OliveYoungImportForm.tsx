"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import {
  confirmOliveYoungImportAction,
  previewOliveYoungImportAction,
  type OliveYoungImportPreview,
} from "@/app/actions/product-import";
import { type ProductFormState } from "@/app/actions/product";
import { CategorySelect } from "@/components/CategorySelect";
import { ProductSpecEditor } from "@/app/admin/products/ProductSpecEditor";
import type { CategoryNavItem } from "@/lib/categories";

const initial: ProductFormState = {};
const MAX_IMAGES = 15;

type Props = { categories: CategoryNavItem[] };

export function OliveYoungImportForm({ categories }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OliveYoungImportPreview | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [isPreviewing, startPreview] = useTransition();
  const [state, formAction] = useFormState(confirmOliveYoungImportAction, initial);

  useEffect(() => {
    if (state?.success) router.push("/admin/products");
  }, [state?.success, router]);

  useEffect(() => {
    if (preview) {
      setSelectedImages(preview.imageUrls);
      setHasVariants(false);
    }
  }, [preview]);

  const inputClass = "border border-neutral-300 px-3 py-2 text-base w-full rounded";

  function removeImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selectedImages.length) return;
    setSelectedImages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setCoverAt(index: number) {
    if (index === 0) return;
    setSelectedImages((prev) => {
      const next = [...prev];
      const [cover] = next.splice(index, 1);
      next.unshift(cover);
      return next;
    });
  }

  function handlePreview() {
    setPreviewError(null);
    startPreview(async () => {
      const result = await previewOliveYoungImportAction(url);
      if (result.error) {
        setPreview(null);
        setPreviewError(result.error);
        return;
      }
      setPreview(result.preview ?? null);
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span>Olive Young 商品網址</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=..."
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewing || !url.trim()}
          className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPreviewing ? "抓取中…" : "抓取預覽"}
        </button>
        {previewError ? (
          <p className="text-sm text-red-600">{previewError}</p>
        ) : null}
      </div>

      {preview ? (
        <form action={formAction} className="flex flex-col gap-5 border-t border-neutral-200 pt-6">
          <input type="hidden" name="sourceUrl" value={preview.sourceUrl} />
          <input type="hidden" name="sourceTitle" value={preview.sourceTitle} />
          {selectedImages.map((imageUrl) => (
            <input key={imageUrl} type="hidden" name="imageUrls" value={imageUrl} />
          ))}

          <div className="rounded border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <p className="mb-1 font-medium text-neutral-700">原文標題（唯讀，可複製給 Gemini）</p>
            <p className="whitespace-pre-wrap text-neutral-900">{preview.sourceTitle}</p>
            {preview.brand ? (
              <p className="mt-2 text-neutral-600">品牌：{preview.brand}</p>
            ) : null}
            <p className="mt-2 break-all text-xs text-neutral-500">{preview.sourceUrl}</p>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            <span>上架標題</span>
            <input
              name="title"
              required
              defaultValue={preview.suggestedTitle}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            <span>說明</span>
            <textarea
              name="description"
              rows={10}
              required
              defaultValue={preview.suggestedDescription}
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {!hasVariants ? (
              <>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  <span>韓元參考價</span>
                  <input
                    name="priceKrw"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={preview.priceKrw}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  <span>NT$ 售價（整數）</span>
                  <input
                    name="priceTwd"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    required
                    defaultValue={preview.priceTwd}
                    className={inputClass}
                  />
                </label>
              </>
            ) : (
              <p className="sm:col-span-2 text-xs text-neutral-500">
                已開啟多規格：請在下方「影響價格」的規格類別中填寫各尺寸售價（抓取到的價格已預填在第一列供參考）。
              </p>
            )}
          </div>

          <CategorySelect categories={categories} inputClass={inputClass} />

          <ProductSpecEditor
            key={preview.sourceUrl}
            initial={{
              hasVariants: false,
              options: [
                {
                  name: "尺寸",
                  affectsPrice: true,
                  values: [
                    {
                      value: "",
                      priceTwd: preview.priceTwd,
                      priceKrw: preview.priceKrw,
                      acceptOrders: true,
                    },
                  ],
                },
              ],
            }}
            onHasVariantsChange={setHasVariants}
          />

          <div className="flex flex-col gap-2 text-sm font-medium">
            <span>圖片預覽（可移除不要的；第一張為封面）</span>
            <p className="text-xs font-normal text-neutral-500">
              已選 {selectedImages.length} 張，最多 {MAX_IMAGES} 張。確認上架時會轉存至 Cloudinary。
            </p>
            {selectedImages.length === 0 ? (
              <p className="text-sm font-normal text-amber-700">請至少保留一張圖片。</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded border border-neutral-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`預覽 ${index + 1}`}
                      className="h-40 w-full object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute left-2 top-2 rounded bg-neutral-900/80 px-2 py-0.5 text-xs text-white">
                        封面
                      </span>
                    ) : (
                      <span className="absolute left-2 top-2 rounded bg-neutral-600/70 px-2 py-0.5 text-xs text-white">
                        {index + 1}
                      </span>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        className="rounded bg-white/90 px-2 py-1 text-xs shadow disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="上移"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === selectedImages.length - 1}
                        className="rounded bg-white/90 px-2 py-1 text-xs shadow disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="下移"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="absolute right-2 top-2 flex flex-col gap-1">
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => setCoverAt(index)}
                          className="rounded bg-white/90 px-2 py-1 text-xs text-neutral-800 shadow"
                        >
                          設為封面
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="rounded bg-white/90 px-2 py-1 text-xs text-red-600 shadow"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!hasVariants ? (
            <label className="flex items-center gap-3 text-sm font-medium">
              <input name="acceptOrders" type="checkbox" defaultChecked className="h-5 w-5" />
              <span>接受訂購</span>
            </label>
          ) : null}

          <label className="flex items-center gap-3 text-sm font-medium">
            <input name="published" type="checkbox" className="h-5 w-5" />
            <span>立即上架（預設先存為草稿）</span>
          </label>

          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <button
            type="submit"
            disabled={selectedImages.length === 0}
            className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            建立商品
          </button>
        </form>
      ) : null}
    </div>
  );
}
