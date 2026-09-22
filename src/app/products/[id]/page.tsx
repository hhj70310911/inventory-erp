import { notFound } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveProductImageUrls } from "@/lib/product-images";
import { buildPurchasePanelData } from "@/lib/product-client-data";
import { canShopRole } from "@/lib/shop";
import { ProductBackNav, ProductBreadcrumb } from "@/components/ProductBackNav";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const showPrices = canShopRole(session?.user?.role);

  const product = await prisma.product.findFirst({
    where: { id, published: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      options: { orderBy: { sortOrder: "asc" }, include: { values: { orderBy: { sortOrder: "asc" } } } },
      variants: {
        include: { values: { select: { optionValueId: true } } },
      },
      category: { select: { name: true, slug: true } },
    },
  });

  if (!product) notFound();
  const imageUrls = resolveProductImageUrls(product);
  const panelData = await buildPurchasePanelData(product);

  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL?.trim();
  const backHref = product.category
    ? `/category/${product.category.slug}`
    : "/";

  return (
    <article className="mx-auto min-w-0 max-w-3xl">
      <ProductBackNav fallbackHref={backHref} />
      <ProductBreadcrumb
        homeHref="/"
        category={product.category}
        title={product.title}
      />

      <div className="grid min-w-0 gap-8 md:grid-cols-2 md:gap-10">
        <div className="min-w-0">
          <ProductGallery urls={imageUrls} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h1 className="break-words text-xl font-semibold tracking-tight text-ink md:text-2xl">
              {product.title}
            </h1>
          </div>
          <div className="card-surface p-5">
            <ProductPurchasePanel
              showPrices={showPrices}
              hasVariants={product.hasVariants}
              unitLabel={product.unitLabel}
              options={panelData.options}
              variants={panelData.variants}
              defaultVariantId={panelData.defaultVariantId}
            />
          </div>
          <div className="card-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">商品說明</h2>
            <div className="break-words whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {product.description}
            </div>
          </div>
          {lineUrl ? (
            <a
              href={lineUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-outline inline-flex w-fit"
            >
              LINE 洽詢
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
