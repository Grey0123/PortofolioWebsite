"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FaBriefcase, FaProjectDiagram, FaUserTie, FaMapMarkerAlt } from "react-icons/fa";
import type { IconType } from "react-icons";

// Each stat has either a numeric `value` (which counts up) or a `text` value
// (which just displays). TypeScript's discriminated union keeps these
// mutually exclusive so the component can't be misused.
type Stat =
  | { icon: IconType; label: string; value: number; suffix?: string }
  | { icon: IconType; label: string; text: string };

const STATS: Stat[] = [
  { icon: FaBriefcase, label: "Years in tech", value: 3, suffix: "+" },
  { icon: FaProjectDiagram, label: "Projects shipped", value: 12, suffix: "+" },
  { icon: FaUserTie, label: "Roles held", value: 4 },
  { icon: FaMapMarkerAlt, label: "Based in", text: "Indonesia" },
];

// Small helper component to count a number from 0 to `to` once it's visible.
function Counter({ to, suffix }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  // `useMotionValue` holds a number that can drive animations without re-render.
  const count = useMotionValue(0);
  // `useTransform` derives a new value — here, rounding the float for display.
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Framer's `animate` tweens the motion value from 0 to `to` over 1.2s.
    const controls = animate(count, to, { duration: 1.2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, count, rounded]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export default function StatsStrip() {
  return (
    <div className="relative z-10 mx-auto -mt-12 max-w-[1400px] px-6 md:-mt-16 md:px-[10%]">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-4 md:p-8">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="text-xl" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white md:text-3xl">
                  {"value" in stat ? (
                    <Counter to={stat.value} suffix={stat.suffix} />
                  ) : (
                    stat.text
                  )}
                </div>
                <div className="text-xs uppercase tracking-wider text-muted">
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
