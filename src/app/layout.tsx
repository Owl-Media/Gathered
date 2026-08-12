import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

/**
 * Fraunces is a soft, slightly old-style serif. Warm without being twee, and
 * Inter carries the UI text. Both are self-hosted by next/font at build time,
 * so no request ever leaves the user's browser for a font.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Gathered",
    template: "%s · Gathered",
  },
  description: "A simple, elegant way to plan a baby shower and collect RSVPs.",
  /**
   * The platform holds private invitations; nothing here belongs in a search
   * index. Individual public event pages restate this (Spec 5.3, 15.10).
   */
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fdf8f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
