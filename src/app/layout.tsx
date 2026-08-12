import type { Metadata } from "next";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-background text-foreground min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
