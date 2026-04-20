export default function Footer() {
  const year = new Date().getFullYear();
  return (
    // Translucent + backdrop-blur so the global starfield shows through
    // softly at the very end — the "universe" continues all the way down.
    <footer className="relative w-full border-t border-white/5 bg-white/[0.02] py-6 text-center text-sm font-light text-muted backdrop-blur-md">
      {/* A very faint top glow references the hero palette one last time. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />
      <p>© {year} Nabil Ananta Satria Gaharu. Built with Next.js &amp; Tailwind.</p>
    </footer>
  );
}
