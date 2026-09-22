"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageSwipeTrack } from "@/components/ImageSwipeTrack";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type Props = {
  urls: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

function touchDistance(touches: { length: number; 0?: Touch; 1?: Touch }) {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  if (!a || !b) return 0;
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

export function ImageLightbox({ urls, index, open, onClose, onIndexChange }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const scaleRef = useRef(1);
  const surfaceRef = useRef<HTMLDivElement>(null);

  scaleRef.current = scale;

  const safeIndex = urls.length === 0 ? 0 : Math.min(index, urls.length - 1);
  const hasMultiple = urls.length > 1;
  const url = urls[safeIndex] ?? "";
  const zoomed = scale > 1.02;

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pinchRef.current = null;
    panRef.current = null;
  }, []);

  const changeIndex = useCallback(
    (next: number) => {
      resetTransform();
      onIndexChange(next);
    },
    [resetTransform, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    resetTransform();
  }, [open, safeIndex, resetTransform]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (!hasMultiple) return;
      if (e.key === "ArrowLeft") changeIndex(Math.max(0, safeIndex - 1));
      if (e.key === "ArrowRight") changeIndex(Math.min(urls.length - 1, safeIndex + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasMultiple, safeIndex, urls.length, onClose, changeIndex]);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!open || !el) return;

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length >= 2 || scaleRef.current > 1.02) e.preventDefault();
    }

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [open]);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchRef.current = { distance: touchDistance(e.touches), scale: scaleRef.current };
      panRef.current = null;
    } else if (e.touches.length === 1 && scaleRef.current > 1.02) {
      panRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        ox: offset.x,
        oy: offset.y,
      };
      pinchRef.current = null;
    }
  }

  function onTouchMoveReact(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      const d = touchDistance(e.touches);
      if (d <= 0) return;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinchRef.current.scale * (d / pinchRef.current.distance)),
      );
      setScale(next);
      if (next <= 1) setOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && panRef.current && scaleRef.current > 1.02) {
      const dx = e.touches[0].clientX - panRef.current.x;
      const dy = e.touches[0].clientY - panRef.current.y;
      setOffset({
        x: panRef.current.ox + dx,
        y: panRef.current.oy + dy,
      });
    }
  }

  function onTouchEnd() {
    pinchRef.current = null;
    panRef.current = null;
    if (scale < MIN_SCALE) {
      resetTransform();
    }
  }

  if (!open || !url) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-white/45 backdrop-blur-xl supports-[backdrop-filter]:bg-white/35"
      role="dialog"
      aria-modal="true"
      aria-label="商品圖片放大"
    >
      <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] text-neutral-900">
        {hasMultiple ? (
          <span className="text-sm font-medium tabular-nums">
            {safeIndex + 1} / {urls.length}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-neutral-900 hover:bg-black/5"
        >
          ×
        </button>
      </div>

      <div
        ref={surfaceRef}
        className="relative min-h-0 flex-1 touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMoveReact}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          {zoomed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt=""
              draggable={false}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <ImageSwipeTrack
              urls={urls}
              index={safeIndex}
              onIndexChange={changeIndex}
              className="mx-auto h-full w-full max-w-full"
              imgClassName="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {hasMultiple ? (
          <>
            <button
              type="button"
              disabled={safeIndex === 0}
              aria-label="上一張"
              onClick={(e) => {
                e.stopPropagation();
                changeIndex(safeIndex - 1);
              }}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white shadow-sm disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={safeIndex === urls.length - 1}
              aria-label="下一張"
              onClick={(e) => {
                e.stopPropagation();
                changeIndex(safeIndex + 1);
              }}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white shadow-sm disabled:opacity-30"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
