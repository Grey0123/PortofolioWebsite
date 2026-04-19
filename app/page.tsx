// Home route. Each section is wrapped in <FadeInSection> so it animates into
// view on scroll — you get that modern narrative-scroll feel for free.
//
// Note: Header renders its own Navbar + StatsStrip internally, so those are
// NOT rendered again here.

import Header from "@/components/Header";
import TechMarquee from "@/components/TechMarquee";
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
      {/* Hero owns its own Navbar, background, spotlight, and StatsStrip. */}
      <Header />

      <FadeInSection delay={0.1}>
        <TechMarquee />
      </FadeInSection>

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
