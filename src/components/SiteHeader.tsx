import Link from "next/link";
import { auth } from "@/auth";
import { getCartCount } from "@/app/actions/cart";
import { SiteHeaderNav } from "@/components/SiteHeaderNav";
import { getCategoryNavItems } from "@/lib/categories";
import { getSiteBrand } from "@/lib/site";
import { canShopRole } from "@/lib/shop";

export async function SiteHeader() {
  const session = await auth();
  const { name, tagline } = getSiteBrand();
  const categories = await getCategoryNavItems();
  const role = session?.user?.role;
  const canShop = canShopRole(role);
  const cartCount = canShop ? await getCartCount() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 shadow-header backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="shrink-0 leading-tight text-ink transition hover:opacity-80">
          <span className="block text-lg font-semibold tracking-[0.15em]">{name}</span>
          <span className="block text-[10px] font-normal text-muted md:text-xs">{tagline}</span>
        </Link>
        <SiteHeaderNav
          canShop={canShop}
          cartCount={cartCount}
          isAdmin={role === "ADMIN"}
          isLoggedIn={!!session}
          categories={categories}
        />
      </div>
    </header>
  );
}
