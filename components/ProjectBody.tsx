// Renders a project's long-form markdown write-up (`works.body_md`).
//
// This is a SERVER COMPONENT — no "use client". Markdown → HTML is a pure
// transformation with no interactivity, so it runs entirely on the server and
// ships zero JavaScript to the browser. The visitor downloads finished HTML.
// (If you ever add something interactive here — a copy-to-clipboard button on
// code blocks, say — that button becomes its own small Client Component,
// rather than making this whole file client-side.)
//
// SECURITY: react-markdown does NOT render raw HTML unless you explicitly add
// the `rehype-raw` plugin. We don't. So even if a stray <script> tag ends up
// in the database, it renders as visible text rather than executing. Keep it
// that way — the moment you add rehype-raw, your database becomes an XSS
// vector.

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Why the explicit `components` map instead of Tailwind's typography plugin
 * (`prose` classes)?
 *
 * The plugin is excellent, but it's another dependency, and its default theme
 * is tuned for light backgrounds — on this near-black site you'd spend as much
 * time overriding `prose-invert` as you would writing these ten lines. Mapping
 * each element explicitly also keeps the write-up visually consistent with the
 * rest of the page, since the classes here reuse the same tokens (`text-muted`,
 * `text-accent`, `border-white/10`) as every other component.
 */
export default function ProjectBody({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        // GitHub Flavored Markdown: tables, strikethrough, task lists, and
        // autolinked URLs. Base markdown has none of those, and tables in
        // particular are genuinely useful in a technical write-up (e.g. a
        // before/after benchmark).
        remarkPlugins={[remarkGfm]}
        components={{
          // h1 is deliberately absent: the PAGE already renders the project
          // title as the one and only h1. A second h1 inside the body would
          // break the document outline that screen readers and search engines
          // rely on. Start your write-up at "##".
          h2: ({ children }) => (
            <h2 className="mt-12 text-2xl font-semibold text-white first:mt-0 md:text-3xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 text-lg font-semibold text-white md:text-xl">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mt-5 text-base leading-relaxed text-white/85">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mt-5 list-disc space-y-2 pl-5 text-white/85 marker:text-accent">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-white/85 marker:text-white/40">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          blockquote: ({ children }) => (
            // A left border rather than italics — italic body text at length
            // is genuinely harder to read, and the border reads as "aside"
            // just as clearly.
            <blockquote className="mt-6 border-l-2 border-accent/60 pl-5 text-white/70">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => {
            // Internal links (e.g. "/projects/other-thing") go through
            // next/link for client-side navigation — no full page reload.
            // External ones get the standard new-tab + rel hardening.
            const isInternal = href?.startsWith("/");
            if (isInternal) {
              return (
                <Link
                  href={href!}
                  className="text-accent underline underline-offset-4 hover:opacity-80"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4 hover:opacity-80"
              >
                {children}
              </a>
            );
          },
          // Inline code AND fenced code blocks both arrive as `code`. The
          // difference: a fenced block is wrapped in a <pre>, which
          // react-markdown signals by passing a className like
          // "language-python". Inline code has no className.
          code: ({ className, children }) => {
            const isBlock = Boolean(className);
            if (!isBlock) {
              return (
                <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-white/90">
                  {children}
                </code>
              );
            }
            return (
              <code className="block font-mono text-[13px] leading-relaxed text-white/85">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            // `overflow-x-auto` matters more than it looks: a long line in a
            // code block would otherwise stretch the whole page on mobile and
            // introduce horizontal scroll for every section.
            <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4">
              {children}
            </pre>
          ),
          hr: () => <hr className="mt-10 border-white/10" />,
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/15 px-3 py-2 text-left text-[11px] uppercase tracking-wider text-white/50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/5 px-3 py-2 text-white/85">
              {children}
            </td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
