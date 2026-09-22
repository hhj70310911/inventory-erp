"use client";

type Props = { count: number; onClick: () => void };

export function FloatingCartButton({ count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="購物車"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand/85 text-white shadow-card-hover backdrop-blur-sm transition hover:bg-brand active:scale-95"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
        <path d="M6 6h15l-1.5 9h-12L6 6z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
