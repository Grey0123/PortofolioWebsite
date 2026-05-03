"use client";

// PlaceLightbox — full-screen modal that shows a single place photo with
// its name and caption. Used by <Travel/> when a tile is clicked.
//
// Behavior worth knowing as a learner:
//   • The modal is rendered *inside* the parent component (not via a portal).
//     That's fine for a small site — portals matter when you need to escape
//     a parent's overflow/z-index, which we don't here. If you ever want a
//     proper portal: import { createPortal } from "react-dom".
//   • Body scroll is locked while open by setting document.body.style.overflow
//     in a useEffect. The cleanup function restores it — important so the
//     scroll lock never "leaks" if the component unmounts unexpectedly.
//   • Keyboard support: Esc closes, ArrowLeft/Right cycle through places.
//     The keydown listener is attached to `window` (not the modal node) so
//     it works even before the user has clicked into the modal for focus.
//   • Clicking the dimmed backdrop closes; clicks inside the inner card are
//     stopped so they don't bubble up to the backdrop.

import Image from "next/image";
import { useCallback, useEffect } from "react";
import { FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaTimes } from "react-icons/fa";

export type PlaceItem = {
  src: string;
  place: string;
  caption: string;
};

export default function PlaceLightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: PlaceItem[];
  /** Index of the currently shown place, or null when the modal is closed. */
  index: number | null;
  onClose: () => void;
  onChange: (nextIndex: number) => void;
}) {
  const isOpen = index !== null;
  const total = items.length;

  // Wrap-around navigation. useCallback so the keyboard effect below has
  // a stable reference and doesn't re-bind on every render.
  const goRelative = useCallback(
    (delta: number) => {
      if (index === null || total === 0) return;
      onChange(((index + delta) % total + total) % total);
    },
    [index, total, onChange],
  );

  // Body scroll lock + keyboard handling — both run only while open.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goRelative(1);
      else if (e.key === "ArrowLeft") goRelative(-1);
    };
    window.addEventListener("keydown", handleKey);

    // Cleanup runs when `isOpen` flips back to false OR the component
    // unmounts. Restoring overflow here is what makes the lock leak-proof.
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose, goRelative]);

  if (!isOpen || index === null) return null;
  const current = items[index];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.place}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-10"
    >
      {/* Close button — top-right corner of the viewport */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/40 p-3 text-white transition hover:border-accent/60 hover:bg-black/60"
      >
        <FaTimes />
      </button>

      {/* Prev / next — only show when there's more than one place */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goRelative(-1);
            }}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-3 text-white transition hover:border-accent/60 hover:bg-black/60 md:left-8"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goRelative(1);
            }}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-3 text-white transition hover:border-accent/60 hover:bg-black/60 md:right-8"
          >
            <FaChevronRight />
          </button>
        </>
      )}

      {/* Inner card — clicks inside should NOT bubble up and close */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink shadow-2xl"
      >
        {/* The image area uses an aspect ratio so layout doesn't jump while
            the next photo is loading. 4/3 covers most of our shots; tall
            portraits will be letterboxed inside it. */}
        <div className="relative aspect-[4/3] w-full bg-black">
          <Image
            src={current.src}
            alt={current.caption || current.place}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-contain"
            priority
          />
        </div>

        <div className="border-t border-white/10 bg-card/40 px-6 py-5">
          <p className="flex items-center gap-2 text-base font-semibold text-white">
            <FaMapMarkerAlt className="text-accent" />
            {current.place}
          </p>
          <p className="mt-1 text-sm text-muted">{current.caption}</p>
          {total > 1 && (
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted/70">
              {index + 1} / {total}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
