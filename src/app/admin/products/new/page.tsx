import Link from "next/link";
import { ProductCreateForm } from "@/app/admin/products/ProductCreateForm";
import { getCategoryNavItems } from "@/lib/categories";

export default async function NewProductPage() {
  const categories = await getCategoryNavItems();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{"\u65b0\u589e\u5546\u54c1"}</h1>
        <Link href="/admin/products" className="text-sm underline underline-offset-4">
          {"\u2190 \u5546\u54c1\u5217\u8868"}
        </Link>
      </div>
      <ProductCreateForm categories={categories} />
    </div>
  );
}
