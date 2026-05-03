"use client";

// CandidCarousel — a tiny image rotator used in the About section to show
// a few candid moments next to the formal portrait.
//
// Behavior:
//   • Auto-advances every `intervalMs` (default 5s) when more than 1 image.
//   • Pauses while the user hovers or focuses the carousel.
//   • Exposes prev/next arrows and dot indicators when there are 2+ images.
//   • Falls back to a single static frame (no controls) when only 1 image
//     is provided — so it stays useful even before more candids are added.
//
// All visual choices (rounded card, border, accent dot color) intentionally
// echo the rest of the About section so the carousel feels native to it.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export type CandidSlide = {
  src: string;
  alt: string;
  // CSS object-position for the cropped square frame. Default is "center"
  // which works for most portraits — but candid 16:9 photos often have
  // the subject off-center, so each slide can override its focal point.
  // Examples: "center", "30% center", "top", "left center", "50% 30%".
  position?: string;
};

export default function CandidCarousel({
  slides,
  intervalMs = 5000,
}: {
  slides: CandidSlide[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = slides.length;
  const canCycle = total > 1;

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      // wrap-around
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Auto-advance unless paused or there's nothing to cycle through.
  useEffect(() => {
    if (!canCycle || paused) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % total);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [canCycle, paused, index, intervalMs, total]);

  if (total === 0) return null;

  return (
    <div
      className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Candid photos of Nabil"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="(max-width: 768px) 100vw, 35vw"
            className="object-cover"
            // object-position drives WHERE inside the rectangle the crop
            // anchors. Inline style (not Tailwind class) because the value
            // is dynamic per-slide and Tailwind can't generate arbitrary
            // percentages at build time.
            style={{ objectPosition: slide.position ?? "center" }}
            priority={i === 0}
          />
        </div>
      ))}

      {/* Subtle bottom gradient for legibility of any future captions */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {canCycle && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition hover:border-accent/60 hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition hover:border-accent/60 hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <FaChevronRight className="text-xs" />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
