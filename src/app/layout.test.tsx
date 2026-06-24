/**
 * layout.test.tsx — Tests for the root layout's skip-to-content link.
 *
 * WCAG AAA requires a skip-to-content link as the first focusable element
 * on every page, allowing keyboard users to bypass repetitive navigation.
 * The link is rendered in layout.tsx (root layout) so it appears on ALL
 * pages automatically.
 *
 * Tests:
 *   1. Renders a skip link with href="#main-content"
 *   2. Skip link is visually hidden by default (sr-only)
 *   3. Skip link becomes visible on focus (focus:not-sr-only)
 *   4. Skip link is the first <a> element in the body (first focusable)
 */

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock globals.css import (layout.tsx imports "./globals.css")
vi.mock("./globals.css", () => ({}));

// Mock next/font modules — they return objects with `.variable` strings.
vi.mock("next/font/google", () => ({
  Newsreader: () => ({ variable: "--font-editorial-mock" }),
  Instrument_Sans: () => ({ variable: "--font-ui-mock" }),
}));
vi.mock("next/font/local", () => ({
  default: () => ({ variable: "--font-mono-mock" }),
}));

describe("RootLayout — skip-to-content link", () => {
  it("renders a skip link with href='#main-content'", async () => {
    const { default: RootLayout } = await import("./layout");
    render(
      <RootLayout>
        <div>page content</div>
      </RootLayout>,
    );
    const skipLink = screen.getByRole("link", { name: /skip to content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute("href")).toBe("#main-content");
  });

  it("skip link is visually hidden by default (sr-only class present)", async () => {
    const { default: RootLayout } = await import("./layout");
    render(
      <RootLayout>
        <div>page content</div>
      </RootLayout>,
    );
    const skipLink = screen.getByRole("link", { name: /skip to content/i });
    expect(skipLink.className).toMatch(/\bsr-only\b/);
  });

  it("skip link becomes visible on focus (focus:not-sr-only class present)", async () => {
    const { default: RootLayout } = await import("./layout");
    render(
      <RootLayout>
        <div>page content</div>
      </RootLayout>,
    );
    const skipLink = screen.getByRole("link", { name: /skip to content/i });
    expect(skipLink.className).toMatch(/focus:not-sr-only/);
  });

  it("skip link is the first <a> element in the body (first focusable)", async () => {
    const { default: RootLayout } = await import("./layout");
    const { container } = render(
      <RootLayout>
        <div>
          <a href="/somewhere">other link</a>
        </div>
      </RootLayout>,
    );
    const allLinks = container.querySelectorAll("a");
    expect(allLinks.length).toBeGreaterThanOrEqual(1);
    expect(allLinks[0]?.textContent).toMatch(/skip to content/i);
  });
});
