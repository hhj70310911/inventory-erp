import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { canShopRole } from "@/lib/shop";
import type { Prisma } from "@prisma/client";

type Props = {
  where: Prisma.ProductWhereInput;
  emptyMessage?: string;
  heading: string;
  sectionTitle?: string;
};

function ProductGrid({
  products,
  showPrices,
}: {
  products: Parameters<typeof ProductCard>[0]["product"][];
  showPrices: boolean;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {products.map((p) => (
        <li key={p.id} className="h-full">
          <ProductCard product={p} showPrices={showPrices} />
        </li>
      ))}
    </ul>
  );
}

export async function ProductListing({
  where,
  emptyMessage = "暫無商品",
  heading,
  sectionTitle,
}: Props) {
  const session = await auth();
  const showPrices = canShopRole(session?.user?.role);

  if (showPrices) {
    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        unitLabel: true,
        hasVariants: true,
        priceTwd: true,
        priceKrw: true,
        variants: { select: { priceTwd: true, acceptOrders: true } },
      },
    });

    return (
      <div>
        <h1 className="sr-only">{heading}</h1>
        {sectionTitle ? (
          <h2 className="mb-6 text-lg font-semibold tracking-tight text-ink md:text-xl">
            {sectionTitle}
          </h2>
        ) : null}
        {products.length === 0 ? (
          <p className="text-center text-sm text-muted">{emptyMessage}</p>
        ) : (
          <ProductGrid products={products} showPrices />
        )}
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      unitLabel: true,
    },
  });

  return (
    <div>
      <h1 className="sr-only">{heading}</h1>
      {sectionTitle ? (
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-ink md:text-xl">
          {sectionTitle}
        </h2>
      ) : null}
      {products.length === 0 ? (
        <p className="text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ProductGrid products={products} showPrices={false} />
      )}
    </div>
  );
}
