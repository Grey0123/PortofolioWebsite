// Rendered when the page above calls notFound() — i.e. FastAPI returned 404
// for this slug. Next.js looks for the nearest not-found.tsx up the folder
// tree, so placing it here scopes it to project URLs specifically; a typo'd
// slug gets a "no such project" message rather than a generic site-wide 404.
//
// This also sends a real HTTP 404 status, which matters: a "not found" page
// served with a 200 is a soft 404, and search engines will happily index it.

import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";

export default function ProjectNotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold md:text-4xl">
          No such project
        </h1>
        <p className="mt-4 text-muted">
          That link doesn&apos;t match anything in the portfolio. It may have
          been renamed, or the URL might have a typo.
        </p>
        <Link
          href="/#portfolio"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white"
        >
          <FaArrowLeft className="text-xs" />
          Back to all work
        </Link>
      </div>
    </main>
  );
}
