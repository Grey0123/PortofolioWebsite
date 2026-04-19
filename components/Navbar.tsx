"use client";
// "use client" tells Next.js this component runs in the browser because it uses
// state (useState) and event handlers. Without it, Next.js tries to render this
// on the server (the default in App Router) and state/hooks won't work.
// NOTE: the directive must be the FIRST line of the file — it cannot sit after
// any code or JSDoc-style comments.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaBars, FaTimes } from "react-icons/fa";

const links = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#travel", label: "Travel" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 md:px-[10%]">
        <Link href="#home" className="flex items-center gap-3">
          {/* next/image optimizes images automatically (lazy-loading, responsive
              sizing, modern formats). width/height prevent layout shift. */}
          <Image
            src="/images/ng-logo.png"
            alt="NG logo"
            width={55}
            height={55}
            priority
          />
          <Image
            src="/images/nabil-logo.png"
            alt="Nabil logo"
            width={140}
            height={40}
            className="hidden sm:block"
            priority
          />
        </Link>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href} className="group/menu-item">
              <a
                href={link.href}
                className="relative inline-block pb-1.5 text-base text-white transition-colors group-hover/menu-item:text-accent"
              >
                {link.label}
                <span className="pointer-events-none absolute -bottom-1 left-1/2 block h-[3px] w-full -translate-x-1/2 origin-center scale-x-0 rounded-full bg-accent opacity-0 transition duration-300 ease-out group-hover/menu-item:scale-x-100 group-hover/menu-item:opacity-100" />
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-2xl md:hidden"
          aria-label="Open menu"
        >
          <FaBars />
        </button>
      </div>

      {/* Mobile sidebar — slides in from the right. `translate-x-full` parks it
          off-screen; toggling `translate-x-0` slides it into view. */}
      <div
        className={`fixed right-0 top-0 z-[110] h-screen w-56 bg-accent pt-16 transition-transform duration-500 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute left-4 top-5 text-2xl"
          aria-label="Close menu"
        >
          <FaTimes />
        </button>

        <ul className="flex flex-col items-start gap-4 px-8">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-2 text-xl text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
