// Client Component because of form state + fetch submit handler.
"use client";

import { useState } from "react";
import {
  FaPaperPlane,
  FaPhoneAlt,
  FaFacebook,
  FaTwitterSquare,
  FaInstagram,
  FaLinkedin,
} from "react-icons/fa";

// Google Apps Script endpoint from the original site. Kept verbatim so the
// existing submissions pipeline keeps working. Feel free to replace later.
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbywExUvEaXXFbtgayhW3utw6mU7YGUnD573zMhKbBI89M6QFMzUwBUKn9SAK0g4GE6g/exec";

// TypeScript "FormEvent" is the typed version of the browser FormEvent.
// We tell React which element triggered it (HTMLFormElement) so `e.currentTarget`
// is correctly typed below.
import type { FormEvent } from "react";
import SectionAura from "./background/SectionAura";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    try {
      const formData = new FormData(e.currentTarget);
      await fetch(SHEET_URL, { method: "POST", body: formData });
      setStatus("sent");
      e.currentTarget.reset();
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      {/* Cyan bottom-right — closes the scroll with the same aurora note the
          hero opens with (pink → cyan → magenta loop). */}
      <SectionAura color="cyan" position="bottom-right" opacity={0.16} />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-12 md:flex-row md:items-start">
          <div className="md:basis-[40%]">
            <h2 className="text-4xl font-semibold md:text-6xl">Contact Me</h2>
            <p className="mt-6 flex items-center gap-3 text-muted">
              <FaPaperPlane className="text-accent" />
              nabilgaharu@gmail.com
            </p>
            <p className="mt-3 flex items-center gap-3 text-muted">
              <FaPhoneAlt className="text-accent" />
              +62 812 8998 870
            </p>

            <div className="mt-8 flex gap-5 text-3xl text-muted">
              <a href="#" aria-label="Facebook" className="transition hover:-translate-y-1 hover:text-accent">
                <FaFacebook />
              </a>
              <a href="#" aria-label="Twitter" className="transition hover:-translate-y-1 hover:text-accent">
                <FaTwitterSquare />
              </a>
              <a
                href="https://instagram.com/nabilgaharu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition hover:-translate-y-1 hover:text-accent"
              >
                <FaInstagram />
              </a>
              <a
                href="https://www.linkedin.com/in/nabil-gaharu-601535215/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="transition hover:-translate-y-1 hover:text-accent"
              >
                <FaLinkedin />
              </a>
            </div>

            <a
              href="/images/CV_Nabil Ananta Satria Gaharu_Updated 2025.pdf"
              download
              className="mt-10 inline-block rounded-md bg-accent px-8 py-3 font-medium text-white transition-all hover:brightness-110"
            >
              Download CV
            </a>
          </div>

          <div className="md:basis-[55%]">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              name="submit-to-google-sheet"
            >
              <input
                type="text"
                name="Name"
                placeholder="Your Name"
                required
                className="rounded-md bg-card p-4 text-white outline-none transition-all focus:ring-2 focus:ring-accent"
              />
              <input
                type="email"
                name="Email"
                placeholder="Your Email"
                required
                className="rounded-md bg-card p-4 text-white outline-none transition-all focus:ring-2 focus:ring-accent"
              />
              <textarea
                name="Message"
                rows={6}
                placeholder="Your Message"
                className="resize-none rounded-md bg-card p-4 text-white outline-none transition-all focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-fit rounded-md bg-accent px-10 py-3 font-medium text-white transition-all hover:brightness-110 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Submit"}
              </button>

              {status === "sent" && (
                <p className="text-green-400">
                  Message sent successfully. Thank you!
                </p>
              )}
              {status === "error" && (
                <p className="text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
