// Server Component — runs on the server at request time, calls the
// FastAPI `/works` endpoint, and passes the result to the client-side
// UI (PortfolioClient).
//
// Why fetch here instead of in app/page.tsx like the other sections?
//   - Portfolio is a self-contained section with its own filter UX, so
//     keeping its data dependency local makes it easy to reuse.
//   - The /works payload can be larger over time; isolating its fetch
//     means a hiccup here doesn't break the rest of the page.

import SectionAura from "./background/SectionAura";
import PortfolioClient from "./PortfolioClient";
import type { ApiCategory } from "@/lib/api";
import { fetchWorks } from "@/lib/api";
import { toWork } from "@/lib/works";

// Categories come from the page-level /content fetch and are passed in as a
// prop (works still has its own /works fetch below).
export default async function Portfolio({
  categories = [],
}: {
  categories?: ApiCategory[];
}) {
  const apiWorks = await fetchWorks();
  const works = apiWorks.map(toWork);

  // IMPORTANT: pass the RAW, serializable category data (icon is a string
  // name here) straight to the client. We must NOT resolve icon names to
  // react-icons components on the server — a component is a function, and
  // functions can't cross the Server→Client boundary (Next serializes props
  // as JSON, which is why doing so throws "Functions cannot be passed
  // directly to Client Components"). PortfolioClient resolves the icons and
  // applies the empty-list fallback in the client bundle instead.
  return (
    <section
      id="portfolio"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      <SectionAura color="pink" position="top-right" opacity={0.16} />
      <div className="relative mx-auto max-w-[1400px]">
        <PortfolioClient works={works} categories={categories} />
      </div>
    </section>
  );
}
