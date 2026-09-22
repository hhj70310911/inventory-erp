import Link from "next/link";
import { cloudinaryThumbnailFit } from "@/lib/cloudinary-thumb";
import { formatPriceRange, priceRangeFromVariants } from "@/lib/variants";

type PublicFields = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  unitLabel: string;
};

type VipFields = PublicFields & {
  hasVariants: boolean;
  priceTwd: number;
  priceKrw: number | null;
  variants: { priceTwd: number }[];
};

type Props = {
  product: PublicFields | VipFields;
  showPrices: boolean;
};

export function ProductCard({ product, showPrices }: Props) {
  let priceText = "";
  if (showPrices && "priceTwd" in product) {
    const range = product.hasVariants
      ? priceRangeFromVariants(product.variants)
      : null;
    priceText = range
      ? formatPriceRange(range.min, range.max)
      : `NT$ ${product.priceTwd.toLocaleString()}`;
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card-hover"
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-page">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryThumbnailFit(product.imageUrl, 400)}
            alt=""
            className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            無圖
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 p-3">
        <h2
          className="line-clamp-2 break-words text-xs font-semibold leading-snug text-ink md:text-sm"
          title={product.title}
        >
          {product.title}
        </h2>
        {showPrices && priceText ? (
          <p className="line-clamp-1 text-xs font-medium text-brand md:text-sm">
            {priceText}
            {product.unitLabel ? ` / ${product.unitLabel}` : ""}
          </p>
        ) : (
          <p className="text-xs text-muted">登入後顯示會員價</p>
        )}
      </div>
    </Link>
  );
}
