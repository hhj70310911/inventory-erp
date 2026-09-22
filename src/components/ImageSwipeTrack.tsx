"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_RATIO = 0.22;
const SNAP_MS = 300;

type TouchState = {
  startX: number;
  startY: number;
  locked: boolean;
  horizontal: boolean;
};

type Props = {
  urls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onTap?: () => void;
  className?: string;
  imgClassName?: string;
  disabled?: boolean;
};

export function ImageSwipeTrack({
  urls,
  index,
  onIndexChange,
  onTap,
  className = "",
  imgClassName = "h-full w-full object-contain",
  disabled = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<TouchState | null>(null);
  const dragPxRef = useRef(0);
  const skipClickRef = useRef(false);
  const indexMounted = useRef(false);
  const [dragPx, setDragPx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const safeIndex = urls.length === 0 ? 0 : Math.min(Math.max(0, index), urls.length - 1);
  const atStart = safeIndex === 0;
  const atEnd = safeIndex === urls.length - 1;
  const canSwipe = !disabled && urls.length > 1;

  dragPxRef.current = dragPx;

  useEffect(() => {
    if (!indexMounted.current) {
      indexMounted.current = true;
      return;
    }
    setDragPx(0);
    setAnimating(true);
    const t = window.setTimeout(() => setAnimating(false), SNAP_MS);
    return () => window.clearTimeout(t);
  }, [safeIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onTouchMove(e: TouchEvent) {
      if (touchRef.current?.horizontal) e.preventDefault();
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const finishDrag = useCallback(() => {
    const el = containerRef.current;
    const px = dragPxRef.current;
    if (!el || !canSwipe) {
      setDragPx(0);
      return false;
    }
    const threshold = el.clientWidth * SWIPE_RATIO;
    let next = safeIndex;
    if (px < -threshold && !atEnd) next = safeIndex + 1;
    else if (px > threshold && !atStart) next = safeIndex - 1;

    setAnimating(true);
    setDragPx(0);
    if (next !== safeIndex) onIndexChange(next);
    window.setTimeout(() => setAnimating(false), SNAP_MS);
    return next !== safeIndex;
  }, [canSwipe, safeIndex, atStart, atEnd, onIndexChange]);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled || e.touches.length !== 1) return;
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      locked: false,
      horizontal: false,
    };
    setAnimating(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current || disabled || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    if (!touchRef.current.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      touchRef.current.locked = true;
      touchRef.current.horizontal = Math.abs(dx) > Math.abs(dy);
    }

    if (!touchRef.current.horizontal || !canSwipe) return;

    let px = dx;
    if (atStart && px > 0) px *= 0.35;
    if (atEnd && px < 0) px *= 0.35;
    setDragPx(px);
  }

  function onTouchEnd() {
    const t = touchRef.current;
    touchRef.current = null;
    if (!t) return;

    if (t.locked && t.horizontal && canSwipe) {
      finishDrag();
      return;
    }

    const moved = Math.abs(dragPxRef.current);
    setDragPx(0);
    if (!t.locked && moved < 12 && onTap) {
      skipClickRef.current = true;
      onTap();
      window.setTimeout(() => {
        skipClickRef.current = false;
      }, 400);
    }
  }

  function onClick() {
    if (skipClickRef.current || dragPxRef.current !== 0) return;
    onTap?.();
  }

  if (urls.length === 0) return null;

  const slideWidthPercent = urls.length > 1 ? 100 / urls.length : 100;
  const trackWidthPercent = urls.length > 1 ? urls.length * 100 : 100;
  const trackOffsetPercent = urls.length > 1 ? (safeIndex / urls.length) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
      onKeyDown={
        onTap
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTap();
              }
            }
          : undefined
      }
      style={onTap ? { cursor: "zoom-in" } : undefined}
    >
      <div
        className={`flex h-full ${animating ? "transition-transform duration-300 ease-out" : ""}`}
        style={{
          width: `${trackWidthPercent}%`,
          transform: `translateX(calc(-${trackOffsetPercent}% + ${dragPx}px))`,
        }}
      >
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="flex h-full shrink-0 grow-0 items-center justify-center"
            style={{ width: `${slideWidthPercent}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className={imgClassName} draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
