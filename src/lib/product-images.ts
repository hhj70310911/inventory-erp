type ProductWithImages = {
  imageUrl: string | null;
  images: { url: string; sortOrder: number }[];
};

export function resolveProductImageUrls(product: ProductWithImages): string[] {
  if (product.images.length > 0) {
    return [...product.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => img.url);
  }
  return product.imageUrl ? [product.imageUrl] : [];
}
