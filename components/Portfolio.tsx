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
import { fetchWorks } from "@/lib/api";
import { toWork } from "@/lib/works";

export default async function Portfolio() {
  const apiWorks = await fetchWorks();
  const works = apiWorks.map(toWork);

  return (
    <section
      id="portfolio"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      <SectionAura color="pink" position="top-right" opacity={0.16} />
      <div className="relative mx-auto max-w-[1400px]">
        <PortfolioClient works={works} />
      </div>
    </section>
  );
}
