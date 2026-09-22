/** Square crop for admin thumbnails. */
export function cloudinaryThumbnail(url: string, size = 80): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill/`);
}

/** Fit inside square without cropping (product list cards). */
export function cloudinaryThumbnailFit(url: string, size = 400): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${size},h_${size},c_fit/`);
}
