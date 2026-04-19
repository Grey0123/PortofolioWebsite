// Root layout — wraps every page in the app.
// In the App Router this replaces the old <html>/<body> in index.html.

import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// next/font auto-optimizes Google Fonts: no <link> tag, no FOIT.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// The metadata API replaces <title>/<meta> tags from the old <head>.
export const metadata: Metadata = {
  title: "Nabil Gaharu — Portfolio",
  description:
    "Data Analyst and Software Engineer based in Indonesia. Data analytics, QA automation, AI, and web development.",
  icons: {
    icon: "/images/ng-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  // `children` is typed as React.ReactNode — it's whatever is rendered inside.
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-ink font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
