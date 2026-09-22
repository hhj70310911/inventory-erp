"use client";

type Props = {
  visible: boolean;
  itemCount: number;
  onContinue: () => void;
  onViewCart: () => void;
};

export function CartAddedToast({ visible, itemCount, onContinue, onViewCart }: Props) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-[60] px-4 md:bottom-6 md:left-auto md:right-24 md:max-w-sm md:px-0"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-lg">
        <p className="text-sm font-medium text-neutral-900">已加入購物車</p>
        {itemCount > 0 ? (
          <p className="mt-0.5 text-xs text-neutral-500">購物車共 {itemCount} 件</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded border border-neutral-300 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            繼續購物
          </button>
          <button
            type="button"
            onClick={onViewCart}
            className="flex-1 rounded bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            查看購物車
          </button>
        </div>
      </div>
    </div>
  );
}
