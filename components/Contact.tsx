// Client Component because of the form state + submit handler. Submissions go
// to the FastAPI backend at POST /messages, which validates the body
// (Pydantic) and writes it to Supabase using the service-role key.
//
// Layout follows the standalone HTML's contact design: a centered call-to-
// action (eyebrow → gradient headline → email/résumé buttons → socials + phone)
// with the working message form kept below it. The contact info (email, phone,
// CV link) and social links are passed down as props from the parent server
// component — fetched once for the whole page in app/page.tsx.
"use client";

import { useState, type FormEvent } from "react";

import BlackHoleContact from "./background/BlackHoleContact";
import { submitMessage, type ApiContactInfo, type ApiSocialLink } from "@/lib/api";

// Sensible defaults so the section never looks empty if the API is down.
const FALLBACK: ApiContactInfo = {
  email: "nabilgaharu@gmail.com",
  phone: null,
  cv_url: null,
};

export default function Contact({
  contactInfo,
  socialLinks = [],
}: {
  contactInfo?: ApiContactInfo | null;
  socialLinks?: ApiSocialLink[];
}) {
  const info = contactInfo ?? FALLBACK;

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  // True while the black hole's warp animation is travelling — the section
  // content fades out so the plunge plays on a clean stage, and fades back
  // in when the return trip lands.
  const [veiled, setVeiled] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    // Snapshot the form BEFORE the await — React nulls e.currentTarget
    // after the handler yields.
    const form = e.currentTarget;
    const formData = new FormData(form);

    const ok = await submitMessage({
      name: String(formData.get("Name") ?? "").trim(),
      email: String(formData.get("Email") ?? "").trim(),
      message: String(formData.get("Message") ?? "").trim() || null,
    });

    if (!ok) {
      setStatus("error");
      return;
    }
    setStatus("sent");
    form.reset();
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <section
      id="contact"
      className="relative overflow-x-clip px-6 pt-24 pb-[30rem] md:px-[10%] md:pb-[34rem]"
    >
      {/* The event horizon rising from below — replaces the old CSS bottom
          glow. Canvas backdrop, pointer-events-none, so the form and buttons
          above are never blocked. The extra bottom padding (pb-56/72) is the
          room the horizon crest rises into. */}
      <BlackHoleContact onVeilChange={setVeiled} />

      {/* Everything inside this wrapper fades out during the warp (and is
          click-proofed via pointer-events-none) so the animation isn't
          cluttered by the form floating over it. */}
      <div
        className={`transition-opacity duration-700 ${
          veiled ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
      {/* ---------------- Centered call-to-action ---------------- */}
      <div className="relative mx-auto max-w-[1180px] text-center">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Get in touch
        </p>

        <h2 className="mx-auto mt-5 max-w-[780px] text-[clamp(38px,6vw,76px)] font-semibold leading-[1.0] tracking-tight">
          Let&apos;s build something{" "}
          {/* Serif italic + the site's gradient-text utility — the standalone's
              one headline flourish, reusing the existing gradient so it stays
              on-brand with the hero. */}
          <span className="gradient-text font-serif font-normal italic">
            worth shipping.
          </span>
        </h2>

        {/* Primary actions: email (mailto) + résumé download. */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href={`mailto:${info.email}`}
            className="rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-[0_0_26px_rgba(255,0,79,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(255,0,79,0.45)]"
          >
            {info.email}
          </a>
          {info.cv_url && (
            <a
              href={info.cv_url}
              download
              className="rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 font-medium text-white transition-all hover:-translate-y-0.5 hover:border-white/40"
            >
              Download résumé ↓
            </a>
          )}
        </div>

        {/* Socials + phone — mono row, echoing the HTML's "↗ Label" treatment. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 font-mono text-[13px] text-white/60">
          {socialLinks.map((link) => {
            const isExternal = link.url.startsWith("http");
            return (
              <a
                key={link.platform}
                href={link.url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
              >
                <span className="text-accent">↗</span>
                {link.platform}
              </a>
            );
          })}
          {info.phone && <span className="text-white/40">{info.phone}</span>}
        </div>
      </div>

      {/* ---------------- Kept working form ----------------
          The HTML design drops the form, but we keep it (your FastAPI /messages
          + Supabase pipeline) under a divider so visitors who prefer not to open
          their mail client can still reach you. */}
      <div className="relative mx-auto mt-20 max-w-[640px]">
        <div className="mb-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Or send a message
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          name="submit-to-api"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              name="Name"
              placeholder="Your Name"
              required
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white outline-none transition-all placeholder:text-white/40 focus:border-accent/60 focus:bg-white/[0.05]"
            />
            <input
              type="email"
              name="Email"
              placeholder="Your Email"
              required
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white outline-none transition-all placeholder:text-white/40 focus:border-accent/60 focus:bg-white/[0.05]"
            />
          </div>
          <textarea
            name="Message"
            rows={5}
            placeholder="Your Message"
            className="resize-none rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white outline-none transition-all placeholder:text-white/40 focus:border-accent/60 focus:bg-white/[0.05]"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="mx-auto w-fit rounded-full bg-accent px-10 py-3.5 font-medium text-white transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>

          {status === "sent" && (
            <p className="text-center text-green-400">
              Message sent successfully. Thank you!
            </p>
          )}
          {status === "error" && (
            <p className="text-center text-red-400">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      </div>
      </div>
      {/* end veil wrapper */}
    </section>
  );
}
