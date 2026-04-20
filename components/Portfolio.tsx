import Image from "next/image";
import { FaLink } from "react-icons/fa";
import SectionAura from "./background/SectionAura";

type Work = {
  image: string;
  title: string;
  description: string;
  href: string;
};

const WORKS: Work[] = [
  {
    image: "/images/work-1.png",
    title: "Web Scraping + Telegram Bot",
    description:
      "A web scraping solution integrated with a Telegram bot that summarizes real-time pricing across car e-commerce platforms for seamless updates.",
    href: "#",
  },
  {
    image: "/images/work-2.png",
    title: "Multi-Platform Product Comparison",
    description:
      "A comparison tool that aggregates product listings from multiple e-commerce platforms so users can compare prices, availability, and details in one place.",
    href: "#",
  },
  {
    image: "/images/work-3.png",
    title: "AML Reporting System",
    description:
      "An Anti-Money Laundering XML reporting system integrated with an Oracle database — ensures compliance and streamlines transaction monitoring.",
    href: "#",
  },
];

export default function Portfolio() {
  return (
    <section
      id="portfolio"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      <SectionAura color="pink" position="top-right" opacity={0.16} />
      <div className="relative mx-auto max-w-[1400px]">
        <h2 className="text-4xl font-semibold md:text-6xl">My Work</h2>
        <p className="mt-4 max-w-2xl text-muted">
          A selection of projects across data engineering, automation, and AI.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {WORKS.map((work) => (
            <article
              key={work.title}
              className="group relative overflow-hidden rounded-2xl"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              {/* Hover overlay — the classic reveal from the old site, modernized. */}
              <div className="absolute inset-0 flex translate-y-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-black/60 to-accent px-6 text-center transition-transform duration-500 group-hover:translate-y-0">
                <h3 className="text-xl font-semibold text-white">
                  {work.title}
                </h3>
                <p className="text-sm text-white/90">{work.description}</p>
                <a
                  href={work.href}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-accent transition-transform hover:scale-110"
                  aria-label={`Open ${work.title}`}
                >
                  <FaLink />
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="#"
            className="inline-block rounded-md border-2 border-accent px-10 py-3 font-medium text-white transition-all hover:bg-accent"
          >
            See More
          </a>
        </div>
      </div>
    </section>
  );
}
