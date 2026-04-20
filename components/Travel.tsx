// Bento-grid gallery for travel/scenery photos.
//
// HOW TO ADD YOUR PHOTOS:
// 1. Drop your images into public/images/travel/ (e.g. public/images/travel/bali.jpg)
// 2. Edit the PLACES array below: set `src` to the path like "/images/travel/bali.jpg"
//    and update `place` and `caption`.
// 3. Delete the `placeholder: true` line once you have a real image.
//
// Tip for nice images: 1600px wide, max 400KB. Use squoosh.app to compress.

import Image from "next/image";
import { FaMapMarkerAlt } from "react-icons/fa";
import SectionAura from "./background/SectionAura";

type Place = {
  place: string;
  caption: string;
  src?: string;        // leave blank for placeholder
  placeholder?: boolean;
  // Tailwind grid placement — lets some tiles be bigger than others
  // ("bento" style). Override per-item to build any layout.
  span?: string;
};

const PLACES: Place[] = [
  {
    place: "Add a place",
    caption: "A favorite view from somewhere you've been.",
    placeholder: true,
    span: "md:col-span-2 md:row-span-2",
  },
  {
    place: "Add a place",
    caption: "Mountain, beach, city — anything.",
    placeholder: true,
  },
  {
    place: "Add a place",
    caption: "Another spot worth sharing.",
    placeholder: true,
  },
  {
    place: "Add a place",
    caption: "Some sceneries stay with you.",
    placeholder: true,
    span: "md:col-span-2",
  },
  {
    place: "Add a place",
    caption: "A quick escape from routine.",
    placeholder: true,
  },
];

export default function Travel() {
  return (
    <section
      id="travel"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      <SectionAura color="amber" position="center-left" opacity={0.14} />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-2">
          <span className="text-sm uppercase tracking-[0.3em] text-accent">
            Beyond the code
          </span>
          <h2 className="text-4xl font-semibold md:text-6xl">
            Places I&apos;ve Been
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            A few scenes from trips I&apos;ve taken — because life outside the
            IDE matters too.
          </p>
        </div>

        <div
          className="mt-12 grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {PLACES.map((p, i) => (
            <article
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition-all hover:border-white/20 ${
                p.span ?? ""
              }`}
            >
              {p.placeholder || !p.src ? (
                // Placeholder tile — gradient + marker icon. Replace by setting
                // `src` in the PLACES array above.
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.03] via-white/[0.06] to-white/[0.03] p-6 text-center">
                  <FaMapMarkerAlt className="text-3xl text-accent/70" />
                  <p className="text-sm font-medium text-white/80">
                    {p.place}
                  </p>
                  <p className="text-xs text-muted">{p.caption}</p>
                </div>
              ) : (
                <>
                  <Image
                    src={p.src}
                    alt={p.caption}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <FaMapMarkerAlt className="text-accent" />
                      {p.place}
                    </p>
                    <p className="mt-1 text-xs text-white/80">{p.caption}</p>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
