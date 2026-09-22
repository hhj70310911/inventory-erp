"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import type { CategoryNavItem } from "@/lib/categories";

type Props = {
  canShop: boolean;
  cartCount: number;
  isAdmin: boolean;
  isLoggedIn: boolean;
  categories: CategoryNavItem[];
};

function navClass(active: boolean) {
  return active
    ? "rounded-md bg-page px-2 py-1 font-medium text-ink"
    : "rounded-md px-2 py-1 text-muted transition hover:bg-page hover:text-ink";
}

function NavLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} className={navClass(!!active)}>
      {children}
    </Link>
  );
}

function CategoryLinks({
  categories,
  onNavigate,
}: {
  categories: CategoryNavItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          onClick={onNavigate}
          className="block py-2 text-muted transition hover:text-ink md:rounded-md md:px-4 md:py-2 md:hover:bg-page"
        >
          {category.name}
        </Link>
      ))}
    </>
  );
}

export function SiteHeaderNav({
  canShop,
  cartCount,
  isAdmin,
  isLoggedIn,
  categories,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  const homeActive = pathname === "/";
  const categoriesActive = pathname.startsWith("/category/");

  function closeMenu() {
    setOpen(false);
    setCategoriesOpen(false);
    setDesktopMenuOpen(false);
  }

  const cartLabel = (
    <>
      購物車
      {cartCount > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs text-white">
          {cartCount}
        </span>
      ) : null}
    </>
  );

  const links = (
    <>
      <NavLink href="/" active={homeActive} onNavigate={closeMenu}>
        首頁
      </NavLink>

      <div
        className="relative hidden md:block"
        onMouseEnter={() => setDesktopMenuOpen(true)}
        onMouseLeave={() => setDesktopMenuOpen(false)}
      >
        <button
          type="button"
          aria-expanded={desktopMenuOpen}
          aria-haspopup="true"
          className={navClass(categoriesActive)}
        >
          全部商品 <span className="text-[10px]">▼</span>
        </button>
        {desktopMenuOpen ? (
          <div className="absolute right-0 top-full z-50 pt-2">
            <div className="min-w-[9rem] rounded-lg border border-border bg-surface py-1 shadow-card">
              <CategoryLinks
                categories={categories}
                onNavigate={() => setDesktopMenuOpen(false)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={categoriesOpen}
          onClick={() => setCategoriesOpen((value) => !value)}
          className={navClass(categoriesActive)}
        >
          全部商品 <span className="text-[10px]">{categoriesOpen ? "▲" : "▼"}</span>
        </button>
        {categoriesOpen ? (
          <div className="mt-2 border-l border-border pl-3">
            <CategoryLinks categories={categories} onNavigate={closeMenu} />
          </div>
        ) : null}
      </div>

      {canShop ? (
        <NavLink href="/cart" onNavigate={closeMenu}>
          {cartLabel}
        </NavLink>
      ) : null}
      {canShop ? (
        <NavLink href="/orders" onNavigate={closeMenu}>
          我的訂單
        </NavLink>
      ) : null}
      {canShop ? (
        <NavLink href="/member" onNavigate={closeMenu}>
          會員中心
        </NavLink>
      ) : null}
      {isAdmin ? (
        <NavLink href="/admin" onNavigate={closeMenu}>
          後台
        </NavLink>
      ) : null}
      {isLoggedIn ? (
        <form action={signOutAction}>
          <button type="submit" className={navClass(false)}>
            登出
          </button>
        </form>
      ) : (
        <NavLink href="/login" onNavigate={closeMenu}>
          登入
        </NavLink>
      )}
    </>
  );

  return (
    <div className="flex items-center gap-3">
      <nav className="hidden items-center gap-2 text-sm md:flex">{links}</nav>

      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-ink md:hidden"
        aria-expanded={open}
        aria-label={open ? "關閉選單" : "開啟選單"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <span className="text-lg leading-none">×</span>
        ) : (
          <span className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        )}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full border-b border-border bg-surface px-4 py-4 shadow-card md:hidden">
          <nav className="flex flex-col gap-3 text-sm">{links}</nav>
        </div>
      ) : null}
    </div>
  );
}
