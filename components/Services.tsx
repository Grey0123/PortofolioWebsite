// No "use client" here — this section is fully static, so it renders on the
// server. That means less JavaScript shipped to the browser.

import {
  FaDatabase,
  FaRobot,
  FaMicroscope,
  FaCode,
  FaMobileAlt,
  FaGamepad,
} from "react-icons/fa";
import type { IconType } from "react-icons";

// Type alias for a single service row. Useful so we can build a typed array
// below and get autocomplete on every field.
type Service = {
  icon: IconType;
  title: string;
  description: string;
};

const SERVICES: Service[] = [
  {
    icon: FaDatabase,
    title: "Data Analytics",
    description:
      "Versatile in database management and SQL (Oracle, SSMS, Excel). Designing, querying, and maintaining complex databases to support data-driven decision-making.",
  },
  {
    icon: FaRobot,
    title: "Artificial Intelligence",
    description:
      "Designing AI-driven functionality — smarter recommendations, automated data processing, personalized experiences across e-commerce platforms.",
  },
  {
    icon: FaMicroscope,
    title: "Quality Assurance",
    description:
      "Building robust automation with Selenium, Cucumber, and Playwright (Java). Comfortable with DB verification and parallel Jenkins pipelines.",
  },
  {
    icon: FaCode,
    title: "Web Development",
    description:
      "Building responsive, dynamic websites with HTML, CSS, JavaScript, and React. Integrating APIs and managing state for scalable front-end solutions.",
  },
  {
    icon: FaMobileAlt,
    title: "App Development",
    description:
      "Designing and building mobile applications with a focus on clean UX and reliable performance across devices.",
  },
  {
    icon: FaGamepad,
    title: "Game Development",
    description:
      "Exploring game mechanics, interactive systems, and engaging experiences for players across platforms.",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      {/* Subtle radial glow behind the grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,79,0.12),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1400px]">
        <h2 className="text-4xl font-semibold md:text-6xl">My Services</h2>
        <p className="mt-4 max-w-2xl text-muted">
          What I bring to the table — across data, engineering, and design.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="glow-ring group rounded-2xl bg-card p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_15px_rgba(0,183,255,0.6)]"
            >
              {/* Wrapper div so all content lives in one direct child of
                  .glow-ring and stays above the ::after mask (see globals.css). */}
              <div>
                <Icon className="text-5xl text-accent transition-colors group-hover:text-cyanGlow" />
                <h3 className="mt-6 text-2xl font-medium text-white">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {description}
                </p>
                <a
                  href="#contact"
                  className="mt-6 inline-block text-sm font-medium text-white transition-colors hover:text-accent"
                >
                  Learn More →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
