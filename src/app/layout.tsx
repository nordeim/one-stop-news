import type { Metadata } from "next";
import { Newsreader, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const commitMono = localFont({
  src: "../../public/fonts/commit-mono-400.woff2",
  variable: "--font-mono",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — OneStopNews",
    default: "OneStopNews — Your Briefing Room",
  },
  description:
    "Topic-first news aggregation with source-cited AI summaries. Every story, organized by what it's about — not who published it.",
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${newsreader.variable} ${instrumentSans.variable} ${commitMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-paper-50 text-ink-600 font-ui antialiased">
        {/* Skip-to-content link — first focusable element for keyboard users (WCAG AAA).
            Visually hidden by default via `sr-only`; becomes visible on focus via
            `focus:not-sr-only`. The href targets the <main id="main-content"> element
            rendered by each page. Pages without a <main id="main-content"> will leave
            the skip link non-functional — every page template that renders body content
            must include <main id="main-content">. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-ink-900 focus:text-paper-50 focus:font-ui focus:text-sm focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-dispatch-ember"
        >
          Skip to content
        </a>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
