import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CertPrep",
  description:
    "Minimal open-source certification prep starter built with Next.js 16.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-zinc-100 text-zinc-950 dark:bg-black dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
