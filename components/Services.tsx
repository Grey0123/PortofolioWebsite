// Server Component (no "use client") — just markup. Hover effects live in
// CSS / inline styles, no React state needed.
//
// Data now comes from the FastAPI `/content` endpoint via the parent
// page. We accept the services list as a prop so the parent can fetch
// once and reuse it across the page.

import SectionAura from "./background/SectionAura";
import { getIcon } from "@/lib/icons";
import type { ApiService } from "@/lib/api";
import type { CSSProperties } from "react";

/* ----- Individual service card ----- */
function ServiceCard({
  service,
  index,
  total,
}: {
  service: ApiService;
  index: number;
  total: number;
}) {
  const { icon, title, tagline, description, tech, color } = service;
  const Icon = getIcon(icon);

  // Two-digit zero-padded number, e.g. "01", "04". Pure JS — no lib.
  const num = String(index + 1).padStart(2, "0");
  const totalNum = String(total).padStart(2, "0");

  return (
    <article
      style={{ "--card-accent": color } as CSSProperties}
      className="glow-ring group relative rounded-2xl bg-card p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,183,255,0.25)]"
    >
      <div className="flex h-full flex-col">
        {/* Header row: service number + icon tile */}
        <div className="flex items-start justify-between">
          <span className="font-mono text-xs tracking-widest text-muted">
            {num} / {totalNum}
          </span>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-500 group-hover:scale-110"
            style={{
              backgroundColor: `${color}1a`,
              borderColor: `${color}40`,
              color,
            }}
          >
            <Icon className="text-2xl" />
          </div>
        </div>

        <h3 className="mt-8 text-2xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm font-medium" style={{ color }}>
          {tagline}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {tech.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors group-hover:border-white/20 group-hover:text-white/90"
            >
              {t}
            </span>
          ))}
        </div>

        <a
          href="#contact"
          className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-white transition-all group-hover:gap-3"
        >
          Let&apos;s talk
          <span className="transition-colors" style={{ color }} aria-hidden>
            →
          </span>
        </a>
      </div>
    </article>
  );
}

/* ----- Main services section ----- */
export default function Services({ services }: { services?: ApiService[] }) {
  const items = services ?? [];

  return (
    <section
      id="services"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(ellipse_at_top,rgba(255,0,79,0.08),transparent_60%)]"
      />
      <SectionAura color="magenta" position="bottom-right" opacity={0.14} />

      <div className="relative mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3">
          <span className="text-sm uppercase tracking-[0.3em] text-accent">
            What I Do
          </span>
          <h2 className="text-4xl font-semibold md:text-6xl">
            Services tailored to the problem
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            I work across the stack — from databases and automation to AI and
            interfaces. Here&apos;s where I can plug in on your project.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((service, i) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={i}
              total={items.length}
            />
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 md:flex-row md:p-10">
          <div>
            <h3 className="text-xl font-semibold text-white md:text-2xl">
              Have a project in mind?
            </h3>
            <p className="mt-1 text-sm text-muted">
              I&apos;m open to freelance work and full-time opportunities.
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-[0_0_30px_rgba(255,0,79,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(255,0,79,0.55)]"
          >
            Start a conversation →
          </a>
        </div>
      </div>
    </section>
  );
}
