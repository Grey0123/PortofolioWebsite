export default function Footer() {
  const year = new Date().getFullYear();
  return (
    // Transparent on purpose. This used to have bg-white/[0.02] + backdrop-blur
    // + a full-width border-top, which made it read as a separate frosted panel
    // "hovering" over the page. Now it's just centered text sitting directly on
    // the continuous background, so the "universe" carries all the way down with
    // no seam.
    <footer className="relative w-full py-10 text-center text-sm font-light text-muted">
      {/* A soft, centered hairline — a whisper of separation, not a hard bar
          edge. Faded at both ends + width-capped so it never reads as a divider
          line across the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-[680px] bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <p>© {year} Nabil Ananta Satria Gaharu. Built with Next.js &amp; Tailwind.</p>
    </footer>
  );
}
