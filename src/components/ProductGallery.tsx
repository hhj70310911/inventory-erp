"use client";

import { useCallback, useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ImageSwipeTrack } from "@/components/ImageSwipeTrack";

export function ProductGallery({ urls }: { urls: string[] }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const safeActive = urls.length === 0 ? 0 : Math.min(active, urls.length - 1);

  const goTo = useCallback(
    (index: number) => {
      if (urls.length === 0) return;
      setActive(Math.max(0, Math.min(urls.length - 1, index)));
    },
    [urls.length],
  );

  const goPrev = useCallback(() => goTo(safeActive - 1), [goTo, safeActive]);
  const goNext = useCallback(() => goTo(safeActive + 1), [goTo, safeActive]);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-neutral-100 text-neutral-400">
        無圖
      </div>
    );
  }

  const hasMultiple = urls.length > 1;
  const atStart = safeActive === 0;
  const atEnd = safeActive === urls.length - 1;

  function stopNavPointer(e: React.PointerEvent) {
    e.stopPropagation();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        <ImageSwipeTrack
          urls={urls}
          index={safeActive}
          onIndexChange={goTo}
          onTap={() => setLightboxOpen(true)}
          className="absolute inset-0 h-full w-full"
        />
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              onPointerDown={stopNavPointer}
              disabled={atStart}
              aria-label="上一張"
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              onPointerDown={stopNavPointer}
              disabled={atEnd}
              aria-label="下一張"
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white disabled:opacity-30"
            >
              ›
            </button>
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
              {safeActive + 1} / {urls.length}
            </span>
          </>
        ) : null}
      </div>

      <ImageLightbox
        urls={urls}
        index={safeActive}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={goTo}
      />
      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden border-2 ${
                safeActive === i ? "border-neutral-900" : "border-transparent opacity-70"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
