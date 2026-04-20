"use client";

import Image from "next/image";
import { useState } from "react";
import SectionAura from "./background/SectionAura";

// A literal union type: `TabKey` can only be one of these three strings. TS
// will flag typos. Great safety net.
type TabKey = "skills" | "experience" | "education";

type SkillItem = { title: string; detail: string };
type TimelineItem = {
  period: string;
  title: string;
  org: string;
  detail: string;
};

const SKILLS: SkillItem[] = [
  { title: "Data Analyst", detail: "Designing dashboards & analyzing key data points" },
  { title: "Quality Assurance", detail: "Automation frameworks, CI pipelines, DB verification" },
  { title: "Artificial Intelligence", detail: "Models, recommendations, intelligent systems" },
  { title: "Web Design", detail: "UI/UX for web and mobile apps" },
];

const EXPERIENCE: TimelineItem[] = [
  {
    period: "2024 – 2025",
    title: "Java Developer · Data Analytics · Business Analyst",
    org: "Cygnet Pericon",
    detail:
      "Multi-hat role spanning Java services, analytics work, and business analysis. Designed queries and reporting pipelines alongside product-facing work.",
  },
  {
    period: "2023 – 2024",
    title: "Software Engineer in Test",
    org: "Blibli.com",
    detail:
      "Built robust automation with Selenium, Cucumber, and Playwright (Java). Contributed to a parallel Jenkins pipeline and DB-verification layer for e-commerce flows.",
  },
];

const EDUCATION: TimelineItem[] = [
  {
    period: "2020 – 2023",
    title: "Bachelor of Computer Science",
    org: "Bina Nusantara University",
    detail: "Focus on software engineering, data structures, and intelligent systems.",
  },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
];

/* ----------------------- TIMELINE SUBCOMPONENT ---------------------- */
function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative ml-4 mt-6 space-y-8 border-l border-white/10 pl-8">
      {items.map((item, i) => (
        <li key={i} className="relative">
          {/* Dot on the timeline */}
          <span className="absolute -left-[33px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-accent bg-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {item.period}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-white">
            {item.title}
          </h4>
          <p className="text-sm text-white/70">{item.org}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {item.detail}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------- SKILLS SUBCOMPONENT ------------------------ */
function SkillsGrid({ items }: { items: SkillItem[] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-accent/40 hover:bg-white/[0.04]"
        >
          <p className="text-sm font-semibold text-accent">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* ----------------------- MAIN COMPONENT ----------------------------- */
export default function About() {
  const [active, setActive] = useState<TabKey>("skills");

  return (
    <section id="about" className="relative overflow-hidden px-6 py-24 md:px-[10%]">
      {/* Thematic accent — cyan top-left to echo the hero aurora. */}
      <SectionAura color="cyan" position="top-left" />
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 md:flex-row md:items-start">
        <div className="md:basis-[35%]">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/profile.png"
              alt="Nabil portrait"
              fill
              sizes="(max-width: 768px) 100vw, 35vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="md:basis-[60%]">
          <span className="text-sm uppercase tracking-[0.3em] text-accent">
            About Me
          </span>
          <h2 className="mt-2 text-4xl font-semibold md:text-6xl">
            Curious by nature, rigorous by habit
          </h2>
          <p className="mt-6 leading-relaxed text-muted">
            I&apos;m dedicated to continuous learning and adaptability — known
            for my diligence and ability to pick things up quickly. I thrive
            equally on independent problem-solving and team collaboration,
            always focused on both the craft and the outcome.
          </p>

          <div className="mt-8 flex gap-8 border-b border-white/10">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={`relative pb-3 text-base font-medium transition-colors md:text-lg ${
                  active === tab.key ? "text-white" : "text-muted hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute -bottom-[2px] left-0 h-[3px] bg-accent transition-all duration-500 ${
                    active === tab.key ? "w-full" : "w-0"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Swap the body based on active tab. Because this is the only piece
              that changes, React only re-renders this subtree. */}
          {active === "skills" && <SkillsGrid items={SKILLS} />}
          {active === "experience" && <Timeline items={EXPERIENCE} />}
          {active === "education" && <Timeline items={EDUCATION} />}
        </div>
      </div>
    </section>
  );
}
