// Client Component because of form state + submit handler. Submissions go
// to the FastAPI backend at POST /messages, which validates the body
// (Pydantic) and writes it to Supabase using the service-role key.
//
// The contact info (email, phone, CV link) and social links are passed
// down as props from the parent server component — fetched once for the
// whole page in app/page.tsx.
"use client";

import { useState, type FormEvent } from "react";
import { FaPaperPlane, FaPhoneAlt } from "react-icons/fa";

import SectionAura from "./background/SectionAura";
import { submitMessage, type ApiContactInfo, type ApiSocialLink } from "@/lib/api";
import { getIcon } from "@/lib/icons";

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
              {info.email}
            </p>
            {info.phone && (
              <p className="mt-3 flex items-center gap-3 text-muted">
                <FaPhoneAlt className="text-accent" />
                {info.phone}
              </p>
            )}

            <div className="mt-8 flex gap-5 text-3xl text-muted">
              {socialLinks.map((link) => {
                const Icon = getIcon(link.icon);
                const isExternal = link.url.startsWith("http");
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    aria-label={link.platform}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="transition hover:-translate-y-1 hover:text-accent"
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>

            {info.cv_url && (
              <a
                href={info.cv_url}
                download
                className="mt-10 inline-block rounded-md bg-accent px-8 py-3 font-medium text-white transition-all hover:brightness-110"
              >
                Download CV
              </a>
            )}
          </div>

          <div className="md:basis-[55%]">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              name="submit-to-api"
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
