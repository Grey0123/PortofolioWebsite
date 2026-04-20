// Static Server Component (no "use client") — just markup.
// The glow hover effect and CSS variables carry all the interactivity.

import SectionAura from "./background/SectionAura";
import {
  FaDatabase,
  FaRobot,
  FaMicroscope,
  FaCode,
  FaMobileAlt,
  FaGamepad,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { CSSProperties } from "react";

// Each service carries its own accent color + tagline + tech stack. A richer
// data shape makes it trivial to change content without touching markup.
type Service = {
  icon: IconType;
  title: string;
  tagline: string;           // one-line value prop
  description: string;       // detailed copy
  tech: string[];            // tools/frameworks used
  color: string;             // brand accent for this card (CSS hex)
};

const SERVICES: Service[] = [
  {
    icon: FaDatabase,
    title: "Data Analytics",
    tagline: "Turning raw data into decisions.",
    description:
      "I design dashboards, write optimized queries, and build reporting pipelines that surface the insights driving business decisions. Comfortable in both operational reporting and exploratory analysis.",
    tech: ["SQL", "Oracle", "SSMS", "Excel", "Power BI"],
    color: "#00b7ff",
  },
  {
    icon: FaRobot,
    title: "Artificial Intelligence",
    tagline: "Smarter systems, personalized outcomes.",
    description:
      "I build AI-driven features — product recommendations, automated data processing, and intelligent decision layers — that bring measurable lift to e-commerce and SaaS experiences.",
    tech: ["Python", "TensorFlow", "Scikit-learn", "LLMs", "Vector DBs"],
    color: "#ff30ff",
  },
  {
    icon: FaMicroscope,
    title: "Quality Assurance",
    tagline: "Shipping with confidence, every release.",
    description:
      "I write test cases, build robust automation frameworks, and wire up parallel CI pipelines. Deep experience in UI, API, and database verification for complex e-commerce platforms.",
    tech: ["Selenium", "Playwright", "Cucumber", "Jenkins", "Java"],
    color: "#43b02a",
  },
  {
    icon: FaCode,
    title: "Web Development",
    tagline: "Fast, responsive, production-ready.",
    description:
      "I build modern web apps with React and Next.js — clean component architectures, smooth UX, and solid performance. From marketing sites to authenticated dashboards and everything between.",
    tech: ["React", "Next.js", "TypeScript", "Tailwind", "REST APIs"],
    color: "#ff004f",
  },
  {
    icon: FaMobileAlt,
    title: "App Development",
    tagline: "Native-feeling experiences on any device.",
    description:
      "I build cross-platform mobile apps with thoughtful UX and reliable performance — touch-first interactions, offline-friendly flows, and clean API integrations.",
    tech: ["React Native", "Expo", "Flutter", "Firebase"],
    color: "#f89820",
  },
  {
    icon: FaGamepad,
    title: "Game Development",
    tagline: "Play-first mechanics and interactive systems.",
    description:
      "Exploring game mechanics, interactive systems, and engaging loops for players — from gameplay prototyping to level design experiments.",
    tech: ["Unity", "C#", "Godot", "Game Design"],
    color: "#f7df1e",
  },
];

/* ----- Individual service card ----- */
function ServiceCard({
  service,
  index,
  total,
}: {
  service: Service;
  index: number;
  total: number;
}) {
  const { icon: Icon, title, tagline, description, tech, color } = service;

  // Two-digit zero-padded number, e.g. "01", "04". Pure JS — no lib.
  const num = String(index + 1).padStart(2, "0");
  const totalNum = String(total).padStart(2, "0");

  return (
    <article
      // Inline CSS custom property so we can style per-card accents in CSS
      // without generating a new Tailwind class per color. Casting to
      // CSSProperties keeps TS happy since `--accent` isn't a known prop.
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
              // The `color.slice` trick: append 15 hex = ~8% opacity background
              backgroundColor: `${color}1a`,
              borderColor: `${color}40`,
              color,
            }}
          >
            <Icon className="text-2xl" />
          </div>
        </div>

        <h3 className="mt-8 text-2xl font-semibold text-white">{title}</h3>
        <p
          className="mt-2 text-sm font-medium"
          style={{ color }}
        >
          {tagline}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {description}
        </p>

        {/* Tech chips — honest signal of "what I use for this". */}
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

        {/* Spacer pushes the link to the bottom so all cards end flush, even
            when their descriptions differ in length. mt-auto + flex-col above. */}
        <a
          href="#contact"
          className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-white transition-all group-hover:gap-3"
        >
          Let&apos;s talk
          <span
            className="transition-colors"
            style={{ color }}
            aria-hidden
          >
            →
          </span>
        </a>
      </div>
    </article>
  );
}

/* ----- Main services section ----- */
export default function Services() {
  return (
    <section
      id="services"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      {/* Soft radial glow at the top of the section for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(ellipse_at_top,rgba(255,0,79,0.08),transparent_60%)]"
      />
      {/* Magenta accent bottom-right — keeps the section feeling "plugged in"
          to the hero's universe without being a straight copy of it. */}
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
          {SERVICES.map((service, i) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={i}
              total={SERVICES.length}
            />
          ))}
        </div>

        {/* Subtle CTA strip below the grid — reinforces action. */}
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
