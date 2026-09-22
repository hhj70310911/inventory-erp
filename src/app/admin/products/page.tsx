import Link from "next/link";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { AdminProductsList } from "./AdminProductsList";

type SearchParams = { q?: string; view?: string };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const view = sp.view === "grid" ? "grid" : "list";

  const products = await prisma.product.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { adminLabel: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      adminLabel: true,
      imageUrl: true,
      priceTwd: true,
      published: true,
      hasVariants: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">商品</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/products/new" className="underline underline-offset-4">
            新增商品
          </Link>
          <Link href="/admin/products/import" className="underline underline-offset-4">
            從 Olive Young 匯入
          </Link>
          <Link href="/admin" className="underline underline-offset-4">
            ← 後台
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-sm text-neutral-500">載入中…</p>}>
        <AdminProductsList products={products} initialQuery={q} initialView={view} />
      </Suspense>
    </div>
  );
}
