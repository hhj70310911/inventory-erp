"use client";

import { useState } from "react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const MAX_IMAGES = 15;

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) throw new Error("upload failed");
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

type Props = {
  initialUrls?: string[];
  onUploadingChange?: (uploading: boolean) => void;
};

export function ProductImageUploader({ initialUrls = [], onUploadingChange }: Props) {
  const [urls, setUrls] = useState(initialUrls);
  const [uploading, setUploading] = useState(false);

  async function setUploadingState(v: boolean) {
    setUploading(v);
    onUploadingChange?.(v);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = MAX_IMAGES - urls.length;
    if (remaining <= 0) {
      alert(`最多 ${MAX_IMAGES} 張圖片`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploadingState(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        uploaded.push(await uploadToCloudinary(file));
      }
      setUrls((prev) => [...prev, ...uploaded]);
    } catch {
      alert("圖片上傳失敗，請再試一次");
    } finally {
      setUploadingState(false);
    }
  }

  function removeAt(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function moveAt(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    setUrls((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setCoverAt(index: number) {
    if (index === 0) return;
    setUrls((prev) => {
      const next = [...prev];
      const [cover] = next.splice(index, 1);
      next.unshift(cover);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500">順序即前台展示順序；第一張為封面。可用 ↑↓ 調整。</p>
      {urls.map((url, i) => (
        <div key={`${url}-${i}`} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-32 w-full rounded object-cover" />
          {i === 0 ? (
            <span className="absolute left-2 top-2 rounded bg-neutral-900/80 px-2 py-0.5 text-xs text-white">
              封面
            </span>
          ) : (
            <span className="absolute left-2 top-2 rounded bg-neutral-600/70 px-2 py-0.5 text-xs text-white">
              {i + 1}
            </span>
          )}
          <div className="absolute bottom-2 left-2 flex gap-1">
            <button
              type="button"
              onClick={() => moveAt(i, -1)}
              disabled={i === 0}
              className="rounded bg-white/90 px-2 py-1 text-xs shadow disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="上移"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveAt(i, 1)}
              disabled={i === urls.length - 1}
              className="rounded bg-white/90 px-2 py-1 text-xs shadow disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="下移"
            >
              ↓
            </button>
          </div>
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            {i > 0 ? (
              <button
                type="button"
                onClick={() => setCoverAt(i)}
                className="rounded bg-white/90 px-2 py-1 text-xs text-neutral-800 shadow"
              >
                設為封面
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="rounded bg-white/90 px-2 py-1 text-xs text-red-600 shadow"
            >
              移除
            </button>
          </div>
          <input type="hidden" name="imageUrls" value={url} />
        </div>
      ))}

      {urls.length < MAX_IMAGES ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-neutral-600 active:bg-neutral-100">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="sr-only"
            onChange={handleFiles}
            disabled={uploading}
          />
          {uploading
            ? "上傳中…"
            : urls.length === 0
              ? "📷 點此選擇或拍攝圖片（可多張）"
              : `📷 新增圖片（${urls.length}/${MAX_IMAGES}）`}
        </label>
      ) : (
        <p className="text-xs text-neutral-500">已達上限 {MAX_IMAGES} 張</p>
      )}
    </div>
  );
}
