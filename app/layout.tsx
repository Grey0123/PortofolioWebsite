// Root layout — wraps every page in the app.
// In the App Router this replaces the old <html>/<body> in index.html.

import type { Metadata } from "next";
import { Poppins, Space_Grotesk } from "next/font/google";
import "./globals.css";
import PageBackground from "@/components/background/PageBackground";

// next/font auto-optimizes Google Fonts: no <link> tag, no FOIT.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Heading font. Pairing a distinctive display face (headings) with a neutral
// body face (Poppins) is the classic two-font system — it makes the type feel
// designed rather than defaulted. Applied globally to h1–h3 in globals.css.
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

// -----------------------------------------------------------------------------
// SEO metadata
// -----------------------------------------------------------------------------
// The metadata API replaces <title>/<meta> tags from the old <head>. Next.js
// reads this object at build time and injects the corresponding tags into the
// rendered HTML. That's what powers:
//   • Browser tab title + favicon
//   • Google search snippets (title + description)
//   • LinkedIn / Twitter / Discord link previews (Open Graph + Twitter Card)
//
// Why bother for a portfolio? When a recruiter pastes your URL into a Slack
// channel or LinkedIn DM, the unfurled preview is the FIRST impression they
// get of your work. A blank or generic preview reads as "this person didn't
// finish setting up their site." A rich preview reads as "this person is
// thoughtful." Cheap signal, high impact.

// Canonical site URL. Set NEXT_PUBLIC_SITE_URL in Vercel env vars to your
// real domain (e.g. https://nabilgaharu.com). The metadataBase is what makes
// relative image paths (like "/images/og-image.png" below) resolve to absolute
// URLs in the OG tags — which OG/Twitter scrapers REQUIRE.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // `title.template` lets future pages override JUST their part. If a page
  // sets `title: "Projects"` it becomes "Projects | Nabil Gaharu", with no
  // need to retype the suffix. `default` is what the home page uses.
  title: {
    default: "Nabil Gaharu — Data Analyst & Software Engineer",
    template: "%s | Nabil Gaharu",
  },

  description:
    "Data Analyst and Software Engineer based in Indonesia. I build data " +
    "pipelines, QA automation, AI integrations, and modern web apps. " +
    "Available for freelance projects and full-time roles.",

  // Searchable keywords. Modern search engines weight these very lightly,
  // but they cost nothing and help the occasional niche query.
  keywords: [
    "Nabil Gaharu",
    "Data Analyst",
    "Software Engineer in Test",
    "QA Automation",
    "Next.js",
    "FastAPI",
    "Supabase",
    "Indonesia",
    "Portfolio",
  ],

  authors: [{ name: "Nabil Ananta Satria Gaharu", url: SITE_URL }],
  creator: "Nabil Ananta Satria Gaharu",

  icons: {
    icon: "/images/ng-logo.png",
  },

  // ---- Open Graph (Facebook, LinkedIn, Slack, Discord, etc.) -------------
  // Spec: https://ogp.me/ — `image` should ideally be 1200x630 PNG/JPG.
  // Until you make a dedicated og-image.png, profile.png is a sensible
  // stand-in; swap when you have one.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Nabil Gaharu Portfolio",
    title: "Nabil Gaharu — Data Analyst & Software Engineer",
    description:
      "Portfolio of Nabil Gaharu — data pipelines, QA automation, AI, " +
      "and modern web development.",
    images: [
      {
        url: "/images/profile.png",
        width: 1200,
        height: 630,
        alt: "Nabil Gaharu portrait",
      },
    ],
  },

  // ---- Twitter Card ------------------------------------------------------
  // `summary_large_image` is the wide preview card; falls back gracefully
  // to small-image on clients that don't support it.
  twitter: {
    card: "summary_large_image",
    title: "Nabil Gaharu — Data Analyst & Software Engineer",
    description:
      "Portfolio of Nabil Gaharu — data pipelines, QA automation, AI, " +
      "and modern web development.",
    images: ["/images/profile.png"],
  },

  // Hint to search engines. "index, follow" is the default — being explicit
  // here means future-you can flip it to noindex on staging deploys.
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  // `children` is typed as React.ReactNode — it's whatever is rendered inside.
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${grotesk.variable}`}>
      <body className="bg-ink font-sans text-white antialiased">
        {/* Global deep-space layer. Sits BEHIND every section so stars and
            nebula washes continue from the hero through About → Services →
            Portfolio → Travel → Contact, giving the whole page a single
            cohesive "universe". */}
        <PageBackground />
        {children}
      </body>
    </html>
  );
}
