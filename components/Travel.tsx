"use client";

// Bento-grid gallery for travel/scenery photos.
//
// Why this is now a Client Component:
//   The lightbox modal needs interactive state (which tile is open). We
//   keep the section's data flow simple by accepting `places` as a prop —
//   the parent server component (app/page.tsx) fetches it from FastAPI
//   and passes it down. If the prop is missing or empty, we fall back
//   to FALLBACK_PLACES so the page never renders an empty section while
//   the database is being set up.
//
// HOW TO UPDATE PHOTOS once the DB is wired:
//   • Source images live (untracked) in /images/background — they're
//     processed into /public/images/background/place-N.jpg.
//   • Add or rename rows in the `places` table in Supabase. Captions and
//     bento layout (`span`) are editable from the dashboard with no code
//     changes or redeploys.

import Image from "next/image";
import { useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import SectionAura from "./background/SectionAura";
import PlaceLightbox, { type PlaceItem } from "./PlaceLightbox";
import type { ApiPlace } from "@/lib/api";

type Place = {
  place: string;
  caption: string;
  src?: string;        // leave blank for placeholder
  placeholder?: boolean;
  // Tailwind grid placement — lets some tiles be bigger than others
  // ("bento" style). Override per-item to build any layout.
  span?: string;
};

// Used only when the API returns no places (DB not seeded yet, or backend
// is down). Once the seed runs, the real data takes over.
const FALLBACK_PLACES: Place[] = [
  {
    place: "A scene worth remembering",
    caption: "One of those views I keep coming back to.",
    src: "/images/background/place-1.jpg",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    place: "A scene worth remembering",
    caption: "Quiet moment, captured in passing.",
    src: "/images/background/place-2.jpg",
  },
  {
    place: "A scene worth remembering",
    caption: "A favorite frame from the trip.",
    src: "/images/background/place-3.jpg",
  },
  {
    place: "A scene worth remembering",
    caption: "Light, shape, distance — all lined up.",
    src: "/images/background/place-4.jpg",
    span: "md:col-span-2",
  },
  {
    place: "A scene worth remembering",
    caption: "A pause in the middle of the day.",
    src: "/images/background/place-5.jpg",
  },
  {
    place: "A scene worth remembering",
    caption: "The kind of view that resets you.",
    src: "/images/background/place-6.jpg",
    span: "md:row-span-2",
  },
  {
    place: "A scene worth remembering",
    caption: "Wandering somewhere new.",
    src: "/images/background/place-7.jpg",
  },
  {
    place: "A scene worth remembering",
    caption: "Ordinary day, extraordinary light.",
    src: "/images/background/place-8.jpg",
  },
  {
    place: "A scene worth remembering",
    caption: "Another reason to keep exploring.",
    src: "/images/background/place-9.jpg",
    span: "md:col-span-2",
  },
  {
    place: "A scene worth remembering",
    caption: "Tucked away, easy to miss.",
    src: "/images/background/place-10.jpg",
  },
];

// Adapter: API rows use snake_case (image_path) and the DB version of `span`
// is nullable. Convert into the local Place shape the JSX already uses.
function fromApi(rows: ApiPlace[]): Place[] {
  return rows.map((r) => ({
    place: r.place,
    caption: r.caption,
    src: r.image_path,
    span: r.span ?? undefined,
  }));
}

export default function Travel({ places: placesProp }: { places?: ApiPlace[] } = {}) {
  // Pick API data when present, otherwise the fallback. This keeps the
  // page useful during the DB-migration phase.
  const places: Place[] =
    placesProp && placesProp.length > 0 ? fromApi(placesProp) : FALLBACK_PLACES;

  // Tiles we can actually open — placeholders aren't clickable. We keep
  // a parallel list of openable items + a map back to their grid index
  // so prev/next inside the lightbox skips placeholders cleanly.
  const openable: PlaceItem[] = places
    .filter((p) => !p.placeholder && p.src)
    .map((p) => ({ src: p.src as string, place: p.place, caption: p.caption }));

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
            IDE matters too. Click a tile to view the photo full size.
          </p>
        </div>

        <div
          className="mt-12 grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {places.map((p, i) => {
            const tileClass = `group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition-all hover:border-white/20 ${
              p.span ?? ""
            }`;

            if (p.placeholder || !p.src) {
              // Placeholder tile — gradient + marker icon. Not interactive.
              return (
                <article key={i} className={tileClass}>
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.03] via-white/[0.06] to-white/[0.03] p-6 text-center">
                    <FaMapMarkerAlt className="text-3xl text-accent/70" />
                    <p className="text-sm font-medium text-white/80">
                      {p.place}
                    </p>
                    <p className="text-xs text-muted">{p.caption}</p>
                  </div>
                </article>
              );
            }

            // Find this tile's index inside `openable` so the lightbox
            // can navigate prev/next among only real photos.
            const openIndex = openable.findIndex((o) => o.src === p.src);

            return (
              <button
                type="button"
                key={i}
                onClick={() => setLightboxIndex(openIndex)}
                aria-label={`Open photo: ${p.place}`}
                className={`${tileClass} text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
              >
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
              </button>
            );
          })}
        </div>
      </div>

      <PlaceLightbox
        items={openable}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={setLightboxIndex}
      />
    </section>
  );
}
