"use client";
// Error boundaries in the App Router MUST be Client Components. Next.js needs
// to attach a `reset()` callback and re-render on the client after a failure,
// neither of which is possible in a server-rendered component.
//
// This catches anything thrown while rendering /projects/[slug] — in practice,
// `fetchProject` throwing because the backend is unreachable or returned a 5xx.
//
// Why this file exists at all: without it, a thrown error bubbles to Next's
// default error screen, which in production is a bare "Application error: a
// server-side exception has occurred". That tells a visitor nothing and tells
// YOU nothing. Distinguishing "this project doesn't exist" (not-found.tsx)
// from "we couldn't load it" (this file) is the whole point of making
// fetchProject throw instead of returning null.

import { useEffect } from "react";
import Link from "next/link";
import { FaArrowLeft, FaRedo } from "react-icons/fa";

export default function ProjectError({
  error,
  reset,
}: {
  // `digest` is a hash Next generates for server-side errors. The full message
  // is stripped from the client bundle in production (it could leak internals),
  // but the digest lets you match what the visitor saw against the real stack
  // trace in your Vercel function logs.
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the browser console during local dev, where messages are
    // NOT stripped. In production this is where you'd call Sentry et al.
    console.error("[projects/[slug]] render failed:", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl font-semibold md:text-4xl">
          Couldn&apos;t load this project
        </h1>
        <p className="mt-4 text-muted">
          The project is probably fine — the server just couldn&apos;t answer.
          It may be waking up from idle, which takes up to a minute.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-white/30">
            ref: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {/* reset() re-renders the segment from scratch. For a cold-start
              502 that's genuinely all it takes — by the second attempt the
              backend is usually awake. */}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <FaRedo className="text-xs" />
            Try again
          </button>
          <Link
            href="/#portfolio"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            <FaArrowLeft className="text-xs" />
            Back to all work
          </Link>
        </div>
      </div>
    </main>
  );
}
