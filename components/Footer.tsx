export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full bg-card py-6 text-center text-sm font-light text-muted">
      <p>© {year} Nabil Ananta Satria Gaharu. Built with Next.js &amp; Tailwind.</p>
    </footer>
  );
}
