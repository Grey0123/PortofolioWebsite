// Reusable scroll-triggered animation wrapper.
// Wrap any section in <FadeInSection>...</FadeInSection> and it'll fade/slide
// in once it enters the viewport — once only, so scrolling back doesn't
// replay. The `delay` prop lets you stagger siblings.
"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;      // seconds before this element starts animating
  y?: number;          // how far to slide up from (default 40px)
  className?: string;
  as?: "div" | "section" | "article" | "header" | "footer";
};

// Variants let you name animation states ("hidden", "visible") and reuse them.
// Framer Motion will tween between whichever variants you set on `initial`
// and `whileInView`.
const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function FadeInSection({
  children,
  delay = 0,
  y = 40,
  className,
  as = "div",
}: Props) {
  // MotionComponents for each HTML tag are available as `motion.div`, etc.
  // We pick the right one based on the `as` prop.
  const MotionTag = motion[as];

  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      // `once: true` — only animate the first time it enters the viewport.
      // `margin: "-80px"` — trigger 80px before it technically enters (nicer).
      viewport={{ once: true, margin: "-80px" }}
      variants={variants ?? defaultVariants}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
