"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cloudinaryThumbnail } from "@/lib/cloudinary-thumb";
import { DeleteButton } from "./DeleteButton";

export type AdminProductRow = {
  id: string;
  title: string;
  adminLabel: string;
  imageUrl: string | null;
  priceTwd: number;
  published: boolean;
  hasVariants: boolean;
  category: { name: string } | null;
};

type Props = {
  products: AdminProductRow[];
  initialQuery: string;
  initialView: "list" | "grid";
};

function ProductThumb({ imageUrl, size }: { imageUrl: string | null; size: "sm" | "lg" }) {
  const box = size === "sm" ? "h-16 w-16" : "aspect-square w-full";
  if (!imageUrl) {
    return (
      <div
        className={`${box} flex shrink-0 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400`}
      >
        無圖
      </div>
    );
  }
  const src = cloudinaryThumbnail(imageUrl, size === "sm" ? 128 : 320);
  return (
    <div className={`${box} shrink-0 overflow-hidden rounded bg-neutral-100`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

function StatusBadges({
  published,
  hasVariants,
  categoryName,
}: {
  published: boolean;
  hasVariants: boolean;
  categoryName: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {!published ? (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">未上架</span>
      ) : null}
      {categoryName ? (
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">{categoryName}</span>
      ) : (
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">未分類</span>
      )}
      {hasVariants ? (
        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700">多規格</span>
      ) : null}
    </div>
  );
}

function ProductTitleBlock({ adminLabel, title }: { adminLabel: string; title: string }) {
  if (adminLabel) {
    return (
      <div className="min-w-0">
        <p className="font-medium text-neutral-900">{adminLabel}</p>
        <p className="line-clamp-2 text-xs text-neutral-500" title={title}>
          {title}
        </p>
      </div>
    );
  }
  return (
    <p className="line-clamp-2 font-medium text-neutral-900" title={title}>
      {title}
    </p>
  );
}

function ProductActions({ id }: { id: string }) {
  return (
    <div className="flex shrink-0 items-center gap-3 text-sm">
      <Link href={`/admin/products/edit?id=${id}`} className="underline underline-offset-4 hover:text-neutral-600">
        編輯
      </Link>
      <DeleteButton id={id} />
    </div>
  );
}

function ListRow({ p }: { p: AdminProductRow }) {
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <Link href={`/admin/products/edit?id=${p.id}`} className="shrink-0">
        <ProductThumb imageUrl={p.imageUrl} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/admin/products/edit?id=${p.id}`} className="block hover:opacity-80">
          <ProductTitleBlock adminLabel={p.adminLabel} title={p.title} />
        </Link>
        <div className="mt-1.5">
          <StatusBadges
            published={p.published}
            hasVariants={p.hasVariants}
            categoryName={p.category?.name ?? null}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="whitespace-nowrap text-sm text-neutral-500">NT. {p.priceTwd.toLocaleString()}</span>
        <ProductActions id={p.id} />
      </div>
    </li>
  );
}

function GridCard({ p }: { p: AdminProductRow }) {
  return (
    <div className="flex flex-col overflow-hidden rounded border border-neutral-200 bg-white">
      <Link href={`/admin/products/edit?id=${p.id}`} className="block hover:opacity-90">
        <ProductThumb imageUrl={p.imageUrl} size="lg" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/admin/products/edit?id=${p.id}`} className="hover:opacity-80">
          <ProductTitleBlock adminLabel={p.adminLabel} title={p.title} />
        </Link>
        <StatusBadges
          published={p.published}
          hasVariants={p.hasVariants}
          categoryName={p.category?.name ?? null}
        />
        <p className="text-sm text-neutral-500">NT. {p.priceTwd.toLocaleString()}</p>
        <ProductActions id={p.id} />
      </div>
    </div>
  );
}

export function AdminProductsList({ products, initialQuery, initialView }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const view = initialView;

  function buildHref(nextView: "list" | "grid") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const q = query.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    if (!params.get("view")) params.set("view", view);
    startTransition(() => {
      router.push(params.toString() ? `/admin/products?${params.toString()}` : "/admin/products");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋名稱或後台簡稱…"
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            搜尋
          </button>
        </form>
        <div className="flex rounded border border-neutral-300 text-sm">
          <Link
            href={buildHref("list")}
            className={`px-3 py-1.5 ${view === "list" ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
          >
            列表
          </Link>
          <Link
            href={buildHref("grid")}
            className={`px-3 py-1.5 ${view === "grid" ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
          >
            卡片
          </Link>
        </div>
      </div>

      {initialQuery ? (
        <p className="text-sm text-neutral-500">
          搜尋「{initialQuery}」共 {products.length} 筆
          {products.length === 0 ? (
            <>
              {" "}
              ·{" "}
              <Link href="/admin/products" className="underline">
                清除搜尋
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-neutral-500">共 {products.length} 筆商品</p>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {initialQuery ? "找不到符合的商品" : "尚無商品"}
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <GridCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded">
          {products.map((p) => (
            <ListRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
