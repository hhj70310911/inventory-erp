"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  fallbackHref: string;
};

export function ProductBackNav({ fallbackHref }: Props) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-6 hidden text-sm text-muted transition hover:text-ink md:inline-flex md:items-center md:gap-1"
    >
      <span aria-hidden>←</span>
      <span>返回繼續選購</span>
    </button>
  );
}

export function ProductBreadcrumb({
  homeHref,
  category,
  title,
}: {
  homeHref: string;
  category: { name: string; slug: string } | null;
  title: string;
}) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted md:mb-8">
      <Link href={homeHref} className="transition hover:text-ink">
        首頁
      </Link>
      {category ? (
        <>
          <span aria-hidden>/</span>
          <Link href={`/category/${category.slug}`} className="transition hover:text-ink">
            {category.name}
          </Link>
        </>
      ) : null}
      <span aria-hidden className="hidden md:inline">
        /
      </span>
      <span className="hidden line-clamp-1 text-ink md:inline">{title}</span>
    </nav>
  );
}
