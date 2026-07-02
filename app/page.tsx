// Home route. Each section is wrapped in <FadeInSection> so it animates into
// view on scroll — you get that modern narrative-scroll feel for free.
//
// This route is now an async Server Component: it fetches the entire
// `/content` bundle from the FastAPI backend ONCE, then slices the
// response into props for each section. Benefits:
//   - One network round-trip per page render instead of six.
//   - Components stay dumb: they receive their data as props.
//   - All credentials / fetching logic stay on the server.
//
// Portfolio still does its own fetch internally (see components/Portfolio.tsx)
// because /works is a separate, larger endpoint with its own caching needs.

import Header from "@/components/Header";
import About from "@/components/About";
import ExperienceEducation from "@/components/ExperienceEducation";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Travel from "@/components/Travel";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FadeInSection from "@/components/animations/FadeInSection";
import { fetchContent } from "@/lib/api";

// Same 60s window as the underlying fetcher in lib/api.ts. Declaring it
// at the page level too makes the cache behavior obvious when reading
// this file.
export const revalidate = 60;

export default async function HomePage() {
  const content = await fetchContent();

  return (
    // `overflow-clip` is a safety net: decorative glows/auras are absolutely
    // positioned and several hang past their section edges. Anything that
    // overflows BELOW the last in-flow element (the footer) would otherwise
    // extend the page's scroll height and leave a dead glowing gap under the
    // footer. Clipping at the page container caps the document exactly at the
    // footer's bottom. (It does NOT clip the fixed navbar or the fixed
    // PageBackground — those aren't laid out inside this box.)
    <main className="overflow-clip">
      <Header
        rotatingRoles={content.rotating_roles}
        stats={content.stats}
        orbitServices={content.orbit_services}
      />

      <FadeInSection>
        <About
          skills={content.skills}
          candidPhotos={content.candid_photos}
        />
      </FadeInSection>

      <FadeInSection>
        <ExperienceEducation
          experience={content.experience}
          education={content.education}
        />
      </FadeInSection>

      <FadeInSection>
        <Services services={content.services} />
      </FadeInSection>

      <FadeInSection>
        {/* Portfolio fetches its own /works list, but categories ride along
            in the /content bundle we already fetched above. */}
        <Portfolio categories={content.categories} />
      </FadeInSection>

      <FadeInSection>
        <Travel places={content.places} />
      </FadeInSection>

      <FadeInSection>
        <Contact
          contactInfo={content.contact_info}
          socialLinks={content.social_links}
        />
      </FadeInSection>

      <Footer />
    </main>
  );
}
