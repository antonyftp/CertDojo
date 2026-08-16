import type { Metadata } from "next";

import { getThemePreference, themeAttribute } from "@/lib/theme";

// Fonts ship as versioned npm packages (self-hosted, no network request —
// SPECIFICATIONS.md §7 offline constraint). Roles per DESIGN.md: Plex Sans
// is the reading voice, Plex Mono the data voice (codes, counters, labels).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "CertDojo",
  description:
    "Open-source, single-user practice tool for tech certification MCQs.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Audit DS-01. Reading the cookie here makes the root layout dynamic, which
  // costs nothing in practice: every page in the app is already
  // force-dynamic. In exchange the correct palette is in the first byte of
  // HTML — no theme flash, and no client-side theme script.
  const theme = themeAttribute(await getThemePreference());

  return (
    <html lang="en" data-theme={theme} className="h-full antialiased">
      <body className="bg-background text-foreground min-h-full font-sans">
        {/* Audit A11Y-08: the header is retraversed on every navigation and
            the app had no bypass mechanism (WCAG 2.4.1). Visually hidden
            until focused, where it becomes the first thing a keyboard user
            reaches. Every <main> in the app carries #main-content. */}
        <a
          href="#main-content"
          // Padding lives on the focus variant: applied unconditionally it
          // wins over sr-only's `padding: 0` and leaves a 32px box sitting in
          // the layout even while the label is clipped.
          className="bg-card text-foreground ring-ring/60 sr-only rounded-md text-sm font-medium shadow-md focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
