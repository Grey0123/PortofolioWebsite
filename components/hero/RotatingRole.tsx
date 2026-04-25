"use client";
// Client Component — cycles through roles using setInterval + state.
//
// The list of roles now comes from the backend (`/content` endpoint).
// We accept it as a prop so the parent server component can fetch once
// and pass it down — keeping all data loading on the server side.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// Sensible fallback if the API ever returns an empty list — ensures the
// hero never renders a blank "I'm a ____" line.
const FALLBACK = ["Developer"];

export default function RotatingRole({ roles }: { roles?: string[] }) {
  // Empty array → use fallback so the component is robust to bad data.
  const list = roles && roles.length > 0 ? roles : FALLBACK;
  const [i, setI] = useState(0);

  useEffect(() => {
    // Reset to the first role any time the list changes (e.g. ISR refresh
    // brings down a different ordering).
    setI(0);
    const id = setInterval(() => {
      setI((prev) => (prev + 1) % list.length);
    }, 2400);
    return () => clearInterval(id);
  }, [list]);

  return (
    <span className="relative inline-block align-top">
      <AnimatePresence mode="wait">
        <motion.span
          key={list[i]}
          initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -20, opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-block bg-gradient-to-r from-accent via-magentaGlow to-cyanGlow bg-clip-text text-transparent"
        >
          {list[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
