// Horizontally scrolling strip of tech logos. Pure CSS animation (see
// `.marquee-track` in globals.css) so it doesn't need to be a Client Component.

import {
  SiPython,
  SiJavascript,
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiMysql,
  SiSelenium,
  SiCucumber,
  SiJenkins,
  SiGit,
  SiDocker,
  SiTailwindcss,
  SiNodedotjs,
} from "react-icons/si";
import { FaJava, FaDatabase } from "react-icons/fa";
import type { IconType } from "react-icons";

// Tuple: [logo component, label, brand color]. The color tints the icon.
const STACK: [IconType, string, string][] = [
  [SiPython, "Python", "#3776ab"],
  [FaJava, "Java", "#f89820"],
  [SiJavascript, "JavaScript", "#f7df1e"],
  [SiTypescript, "TypeScript", "#3178c6"],
  [SiReact, "React", "#61dafb"],
  [SiNextdotjs, "Next.js", "#ffffff"],
  [SiNodedotjs, "Node.js", "#5fa04e"],
  [SiTailwindcss, "Tailwind", "#38bdf8"],
  [SiMysql, "SQL", "#4479a1"],
  [FaDatabase, "Oracle / SSMS", "#f80000"],
  [SiSelenium, "Selenium", "#43b02a"],
  [SiCucumber, "Cucumber", "#23d96c"],
  [SiJenkins, "Jenkins", "#d24939"],
  [SiGit, "Git", "#f05032"],
  [SiDocker, "Docker", "#2496ed"],
];

function Chip({ Icon, label, color }: { Icon: IconType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 backdrop-blur">
      <Icon className="text-xl shrink-0" style={{ color }} />
      <span className="text-sm font-medium text-white/90">{label}</span>
    </div>
  );
}

export default function TechMarquee() {
  return (
    <section className="relative overflow-hidden py-12">
      {/* Fade the edges into the background for a nice visual fade-out */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />

      {/* The track animates translateX(-50%). We duplicate the list so the
          second half slides in just as the first half finishes — seamless loop. */}
      <div className="marquee-track">
        {[...STACK, ...STACK].map(([Icon, label, color], i) => (
          <Chip key={`${label}-${i}`} Icon={Icon} label={label} color={color} />
        ))}
      </div>
    </section>
  );
}
