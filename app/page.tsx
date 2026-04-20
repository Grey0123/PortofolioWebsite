// Home route. Each section is wrapped in <FadeInSection> so it animates into
// view on scroll — you get that modern narrative-scroll feel for free.
//
// Notes:
// - Header renders its own Navbar + StatsStrip internally, so those are
//   NOT rendered again here.
// - Header also now embeds the interactive <OrbitSystem/> beside the hero
//   text, so the standalone <TechMarquee/> section is intentionally removed
//   to avoid showing the same widget twice.

import Header from "@/components/Header";
import About from "@/components/About";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Travel from "@/components/Travel";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FadeInSection from "@/components/animations/FadeInSection";

export default function HomePage() {
  return (
    <main>
      {/* Hero owns its own Navbar, background, spotlight, stats strip, AND
          the interactive services orbit. */}
      <Header />

      <FadeInSection>
        <About />
      </FadeInSection>

      <FadeInSection>
        <Services />
      </FadeInSection>

      <FadeInSection>
        <Portfolio />
      </FadeInSection>

      <FadeInSection>
        <Travel />
      </FadeInSection>

      <FadeInSection>
        <Contact />
      </FadeInSection>

      <Footer />
    </main>
  );
}
