// The repo file browser: a latest-commit header bar over a list of root
// files and folders, mirroring GitHub's own layout.
//
// Server Component — it renders links and SVG, nothing interactive.
//
// The design constraint that shaped this file: the commit message column
// only has data when GITHUB_TOKEN is set (see the rate-limit note in
// lib/github.ts). Rather than reserving an empty column when it's missing,
// the grid template below changes shape — so an unenriched list looks
// deliberately minimal instead of visibly broken.

import type { RepoFile, RepoMeta } from "@/lib/github";

/* ---- icons -------------------------------------------------------- */
// Inlined rather than pulled from react-icons because these are GitHub's
// own glyphs and there's no react-icons equivalent that matches. Three
// small paths cost less than the mismatch would.

function FolderIcon() {
  return (
    <svg width="17" height="16" viewBox="0 0 16 16" fill="#6cb6ff" aria-hidden="true" className="shrink-0">
      <path d="M1.5 3.25c0-.69.56-1.25 1.25-1.25h3.19c.4 0 .77.19 1 .5l.6.8c.05.06.12.1.2.1h5.51c.69 0 1.25.56 1.25 1.25v7.35c0 .69-.56 1.25-1.25 1.25H2.75c-.69 0-1.25-.56-1.25-1.25V3.25Z" />
    </svg>
  );
}

function FileIcon({ accent = false }: { accent?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke={accent ? "#ff004f" : "#8a8a99"}
      strokeWidth="1.2"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M9 1.75H3.75c-.55 0-1 .45-1 1v10.5c0 .55.45 1 1 1h8.5c.55 0 1-.45 1-1V5.5L9 1.75Z" />
      <path d="M9 1.75V5.5h4" />
    </svg>
  );
}

/* ---- component ---------------------------------------------------- */

export default function RepoFileList({ repo }: { repo: RepoMeta }) {
  if (repo.files.length === 0) return null;

  // One check drives the whole layout: if no file carries a commit message,
  // the enrichment step was skipped and the message/time columns shouldn't
  // exist at all.
  const enriched = repo.files.some((f) => f.message);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.012]">
      {/* ---- latest commit bar ---- */}
      {repo.latestCommit && (
        <div className="flex items-center justify-between gap-4 bg-white/[0.03] px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element --
                next/image would need avatars.githubusercontent.com added to
                next.config's remotePatterns, and this is a 24px decorative
                avatar — not worth the config surface. The gradient dot below
                is the fallback when there's no avatar at all. */}
            {repo.latestCommit.avatar ? (
              <img
                src={repo.latestCommit.avatar}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded-full"
              />
            ) : (
              <span className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-accent to-magentaGlow" />
            )}
            <span className="shrink-0 text-[13px] font-medium text-white/80">
              {repo.latestCommit.author}
            </span>
            <span className="truncate font-mono text-xs text-white/45">
              {repo.latestCommit.message}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3.5 font-mono text-[11.5px] text-white/40">
            <a
              href={repo.latestCommit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {repo.latestCommit.sha}
            </a>
            {repo.commitCount !== null && (
              <span className="hidden sm:inline">
                {repo.commitCount.toLocaleString()} commits
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---- file rows ---- */}
      <ul>
        {repo.files.map((file) => (
          <li key={file.name}>
            <FileRow file={file} enriched={enriched} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileRow({ file, enriched }: { file: RepoFile; enriched: boolean }) {
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group grid items-center gap-3 border-t border-white/[0.06] px-5 py-2.5 transition-colors hover:bg-white/[0.028]",
        // Three columns when we have commit data, two when we don't.
        // `minmax(0,1fr)` rather than `1fr` on the message column matters:
        // a bare 1fr refuses to shrink below its content's intrinsic width,
        // so a long commit subject would push the timestamp off-screen
        // instead of ellipsing. This is the single most common cause of
        // "my truncation doesn't work" in CSS grid.
        enriched
          ? "grid-cols-[22px_minmax(0,auto)_minmax(0,1fr)_auto]"
          : "grid-cols-[22px_minmax(0,1fr)]",
      ].join(" ")}
    >
      {file.type === "dir" ? <FolderIcon /> : <FileIcon accent={file.isDoc} />}

      <span className="truncate text-[14.5px] text-white/85 transition-colors group-hover:text-accent">
        {file.name}
      </span>

      {enriched && (
        <>
          <span className="hidden truncate font-mono text-xs text-white/35 md:block">
            {file.message}
          </span>
          <span className="whitespace-nowrap font-mono text-[11.5px] text-white/40">
            {file.time}
          </span>
        </>
      )}
    </a>
  );
}
