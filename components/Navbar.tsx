// "use client" tells Next.js this component runs in the browser because it uses
// state (useState) and event handlers. Without it, Next.js tries to render this
// on the server (the default in App Router) and state/hooks won't work.
"use client";

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
    <nav className="flex items-center justify-between py-4">
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
          <li key={link.href}>
            <a
              href={link.href}
              className="group relative text-base text-white transition-colors hover:text-accent"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 block h-[3px] w-0 bg-accent transition-all duration-500 group-hover:w-full" />
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

      {/* Mobile sidebar */}
      <div
        className={`fixed right-0 top-0 z-50 h-screen w-56 bg-accent pt-16 transition-transform duration-500 md:hidden ${
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
        <ul className="flex flex-col gap-5 px-6">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-lg text-white"
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
