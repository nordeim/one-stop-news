/**
 * error-boundaries.test.tsx — Tests for branded error boundary pages.
 *
 * Phase 19 (High H5): Previously no error.tsx, not-found.tsx, or
 * global-error.tsx existed. Thrown errors and 404s rendered Next.js's
 * default error pages, not branded ones. Now must:
 *   1. src/app/error.tsx — client component, renders branded error UI
 *      with a "Try again" button (calls reset())
 *   2. src/app/not-found.tsx — branded 404 page
 *   3. src/app/global-error.tsx — must render its own <html><body>
 *      (used when root layout itself throws)
 *
 * Each branded page must include <main id="main-content"> for the
 * skip-to-content link to work (WCAG AAA).
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";

describe("error.tsx — branded error boundary", () => {
  it("renders 'Something went wrong' heading", async () => {
    const { default: ErrorBoundary } = await import("./error");
    render(<ErrorBoundary error={new Error("test")} reset={() => {}} />);
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });

  it("renders a 'Try again' button that calls reset", async () => {
    const { default: ErrorBoundary } = await import("./error");
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("test")} reset={reset} />);
    const button = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('includes <main id="main-content"> for skip-link target (WCAG AAA)', async () => {
    const { default: ErrorBoundary } = await import("./error");
    const { container } = render(
      <ErrorBoundary error={new Error("test")} reset={() => {}} />,
    );
    expect(container.querySelector("main#main-content")).toBeDefined();
  });
});

describe("not-found.tsx — branded 404", () => {
  it("renders a 404 / 'not found' message", async () => {
    const { default: NotFound } = await import("./not-found");
    render(<NotFound />);
    // The heading itself says "Page not found"
    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeDefined();
  });

  it('includes <main id="main-content"> for skip-link target', async () => {
    const { default: NotFound } = await import("./not-found");
    const { container } = render(<NotFound />);
    expect(container.querySelector("main#main-content")).toBeDefined();
  });

  it("renders a link back to the homepage", async () => {
    const { default: NotFound } = await import("./not-found");
    render(<NotFound />);
    const homeLink = screen.getByRole("link", { name: /back to homepage/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });
});

describe("global-error.tsx — root layout error fallback", () => {
  it("renders its own <html> and <body> (required for global-error)", async () => {
    const { default: GlobalError } = await import("./global-error");
    const { container } = render(
      <GlobalError error={new Error("test")} reset={() => {}} />,
    );
    // global-error.tsx replaces the root layout when it throws, so it
    // must render <html> and <body> itself.
    expect(container.querySelector("html")).toBeDefined();
    expect(container.querySelector("body")).toBeDefined();
  });

  it("renders a heading and Try Again button", async () => {
    const { default: GlobalError } = await import("./global-error");
    render(<GlobalError error={new Error("test")} reset={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });
});

// vitest import shim — `vi` is auto-injected via globals:true but we
// import explicitly for type clarity.
import { vi } from "vitest";
