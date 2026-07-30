// The screenshot gallery — a bento grid where the first shot is the hero
// and the rest stack beside it, matching the 2fr/1fr layout in the mockup.
//
// Server Component: next/image emits a plain <img> with a srcset, so
// nothing here needs the browser.
//
// The gallery comes from the `project_images` table (one row per image,
// each with its own alt text and optional caption). A project with no rows
// simply doesn't get this section — which is the normal state for a project
// you haven't screenshotted yet, not an error.

import Image from "next/image";
import type { ApiProjectImage } from "@/lib/api";

export default function ProjectScreenshots({
  images,
  title,
}: {
  images: ApiProjectImage[];
  title: string;
}) {
  if (images.length === 0) return null;

  // A single image has no "grid" to speak of — give it the full width at a
  // 16:9 ratio rather than squeezing it into a two-column layout with a
  // conspicuous hole next to it.
  if (images.length === 1) {
    return (
      <figure className="m-0">
        <Shot image={images[0]} title={title} className="aspect-video" priority />
        <Caption image={images[0]} />
      </figure>
    );
  }

  const [hero, ...rest] = images;

  return (
    <div className="grid gap-3.5 sm:grid-cols-[2fr_1fr]">
      {/* The hero spans as many rows as there are side images, so the left
          column always matches the right column's total height. `row-span-2`
          is the mockup's fixed value; deriving it means the layout doesn't
          break when a project has 2 screenshots or 5. Tailwind can't
          generate `row-span-${n}` from a variable (it scans for literal
          class names at build time), so this is a legitimate inline style. */}
      <figure
        className="m-0 min-h-[300px]"
        style={{ gridRow: `span ${Math.max(1, rest.length)}` }}
      >
        <Shot image={hero} title={title} className="h-full min-h-[300px]" priority />
        <Caption image={hero} />
      </figure>

      {rest.map((image) => (
        <figure key={image.image_path} className="m-0">
          <Shot image={image} title={title} className="aspect-[4/3]" />
          <Caption image={image} />
        </figure>
      ))}
    </div>
  );
}

function Shot({
  image,
  title,
  className,
  priority = false,
}: {
  image: ApiProjectImage;
  title: string;
  className: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] ${className}`}
    >
      <Image
        src={image.image_path}
        // Falling back to the project title keeps the alt text from ever
        // being empty. An <img> with no alt is announced by screen readers
        // as its filename, which is worse than a generic description.
        alt={image.alt || `${title} screenshot`}
        fill
        // Tells next/image how wide this renders so it picks a sensible
        // source width. Without it Next assumes 100vw and ships a much
        // larger file than the slot needs.
        sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 560px"
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}

function Caption({ image }: { image: ApiProjectImage }) {
  if (!image.caption) return null;
  return (
    <figcaption className="mt-2 font-mono text-[11.5px] leading-relaxed text-white/40">
      {image.caption}
    </figcaption>
  );
}
