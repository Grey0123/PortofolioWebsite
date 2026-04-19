"use client";
// Client Component — cycles through roles using setInterval + state.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const ROLES = [
  "Data Analyst",
  "Software Engineer in Test",
  "Java Developer",
  "Business Analyst",
  "AI Engineer",
];

export default function RotatingRole() {
  // `useState` with a number + setter typed automatically from the initial value
  const [i, setI] = useState(0);

  useEffect(() => {
    // setInterval returns a handle we store; the cleanup function clears it
    // when the component unmounts. Classic React effect pattern.
    const id = setInterval(() => {
      setI((prev) => (prev + 1) % ROLES.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-block align-top">
      <AnimatePresence mode="wait">
        <motion.span
          key={ROLES[i]}
          // AnimatePresence watches the `key` — when it changes, Framer Motion
          // animates the OLD node out with `exit` and the NEW node in with
          // `initial` → `animate`. mode="wait" waits for exit to finish first.
          initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -20, opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-block bg-gradient-to-r from-accent via-magentaGlow to-cyanGlow bg-clip-text text-transparent"
        >
          {ROLES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
