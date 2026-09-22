export function getSiteBrand() {
  const name = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "KORA";
  const tagline = process.env.NEXT_PUBLIC_SITE_TAGLINE?.trim() || "韓國精選代購";
  const slogan =
    process.env.NEXT_PUBLIC_SITE_SLOGAN?.trim() || "精選韓國好物，會員專屬代購";
  const logoIcon = process.env.NEXT_PUBLIC_LOGO_ICON?.trim() || "/logo-icon.png";
  const logoFull = process.env.NEXT_PUBLIC_LOGO_FULL?.trim() || logoIcon;
  return { name, tagline, slogan, logoIcon, logoFull };
}
