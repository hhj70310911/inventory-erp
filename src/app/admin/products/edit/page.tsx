import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveProductImageUrls } from "@/lib/product-images";
import { getSingleAcceptOrders, productToSpecPayload } from "@/lib/product-variant-serialize";
import { getCategoryNavItems } from "@/lib/categories";
import { ProductEditForm } from "./ProductEditForm";

type Props = { searchParams: Promise<{ id?: string }> };

export default async function EditProductPage({ searchParams }: Props) {
  const { id } = await searchParams;
  if (!id) notFound();
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      options: { include: { values: true } },
      variants: { include: { values: { include: { optionValue: { include: { option: true } } } } } },
    },
  });
  if (!product) notFound();
  const categories = await getCategoryNavItems();
  const initialImageUrls = resolveProductImageUrls(product);
  const specInitial = productToSpecPayload(product);
  const initialAcceptOrders = getSingleAcceptOrders(product);
  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">編輯商品</h1>
        <Link href="/admin/products" className="text-sm underline underline-offset-4">
          ← 商品管理
        </Link>
      </div>
      <ProductEditForm
        product={product}
        categories={categories}
        initialImageUrls={initialImageUrls}
        specInitial={specInitial}
        initialAcceptOrders={initialAcceptOrders}
      />
    </div>
  );
}
