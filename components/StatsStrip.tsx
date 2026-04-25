"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getIcon } from "@/lib/icons";
import type { ApiStat } from "@/lib/api";

// Local view-model: discriminated union exactly like the old hardcoded
// version, but now we BUILD it from the API response in the component
// instead of declaring it inline. The advantage: TypeScript still keeps
// `value`/`text` mutually exclusive, so the rest of the file is unchanged.
type StatVM =
  | { iconName: string; label: string; value: number; suffix?: string }
  | { iconName: string; label: string; text: string };

function toViewModel(api: ApiStat[]): StatVM[] {
  return api.map((s) => {
    if (typeof s.value_number === "number") {
      return {
        iconName: s.icon,
        label: s.label,
        value: s.value_number,
        suffix: s.suffix ?? undefined,
      };
    }
    return {
      iconName: s.icon,
      label: s.label,
      text: s.value_text ?? "",
    };
  });
}

// Small helper component to count a number from 0 to `to` once it's visible.
function Counter({ to, suffix }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
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

export default function StatsStrip({ stats }: { stats?: ApiStat[] }) {
  const items = toViewModel(stats ?? []);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-4 md:p-8">
        {items.map((stat) => {
          // Resolve icon string → component via the registry.
          const Icon = getIcon(stat.iconName);
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
