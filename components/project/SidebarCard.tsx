// The bordered sidebar card used for About / Context / Metrics on a project
// page, plus the two row primitives those cards are built from.
//
// Three small exports rather than three near-identical blocks of Tailwind
// inline in page.tsx. The value isn't saving keystrokes — it's that the
// card border, radius, and background now have exactly ONE definition. When
// you decide the borders are too bright, you change this file, not five
// places that were supposed to match and probably didn't.

import type { ReactNode } from "react";

export function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.09] bg-white/[0.018] px-5 py-[18px]">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * A label/value pair as a stacked row — used for Role, Timeframe, Outcome.
 * Stacked rather than side-by-side because these values are sentences, not
 * numbers, and a narrow right-aligned column would wrap them badly.
 */
export function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.16em] text-white/35">
        {label}
      </dt>
      <dd className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
        {value}
      </dd>
    </div>
  );
}

/**
 * A label/number pair on one baseline — used for the metrics list, where
 * every value is short. `items-baseline` (not `items-center`) aligns the
 * bottoms of the two different type sizes, which is what stops the small
 * label from looking like it's floating.
 */
export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-white/[0.06] py-2.5">
      <dt className="text-[13px] text-white/55">{label}</dt>
      <dd className="font-mono text-[15px] font-semibold text-white">{value}</dd>
    </div>
  );
}
