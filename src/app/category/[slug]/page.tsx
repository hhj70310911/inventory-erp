import { notFound } from "next/navigation";
import { CategoryPageHeader } from "@/components/CategoryPageHeader";
import { ProductListing } from "@/components/ProductListing";
import { getCategoryBySlug } from "@/lib/categories";

type Props = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <>
      <CategoryPageHeader title={category.name} />
      <ProductListing
        heading={category.name}
        emptyMessage={`「${category.name}」分類暫無商品`}
        where={{ published: true, categoryId: category.id }}
      />
    </>
  );
}
