import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { PageTransition } from "./PageTransition";

// Mutable mock router so individual tests can assert calls.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

describe("PageTransition", () => {
  it("renders children without errors", () => {
    const { getByText } = render(
      <PageTransition>
        <div>Test content</div>
      </PageTransition>,
    );
    expect(getByText("Test content")).toBeDefined();
  });

  it("does not crash when startViewTransition is not available", () => {
    // @ts-expect-error startViewTransition not in all browsers
    delete document.startViewTransition;

    const { getByText } = render(
      <PageTransition>
        <div>No crash</div>
      </PageTransition>,
    );
    expect(getByText("No crash")).toBeDefined();
  });
});

describe("PageTransition click interception", () => {
  beforeEach(() => {
    mockPush.mockReset();
    // Install a fresh startViewTransition stub for each test.
    document.startViewTransition = vi.fn((cb: () => void) => {
      cb();
      // Return a minimal ViewTransition-shaped object so TypeScript accepts the mock.
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: vi.fn(),
        types: new Set<string>(),
      };
    }) as unknown as typeof document.startViewTransition;
    // jsdom doesn't implement matchMedia — install a default stub that
    // returns matches:false so the reduced-motion early-return is skipped.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    delete (document as Partial<Document>).startViewTransition;
    delete (window as Partial<Window>).matchMedia;
    cleanup();
  });

  it("intercepts clicks on internal <a href> and calls router.push", () => {
    const { getByText } = render(
      <PageTransition>
        <a href="/about">About</a>
      </PageTransition>,
    );
    fireEvent.click(getByText("About"));
    expect(mockPush).toHaveBeenCalledWith("/about");
  });

  it("wraps router.push inside document.startViewTransition", () => {
    const { getByText } = render(
      <PageTransition>
        <a href="/topics/tech">Tech</a>
      </PageTransition>,
    );
    fireEvent.click(getByText("Tech"));
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/topics/tech");
  });

  it("does NOT intercept external links (http://)", () => {
    const { getByText } = render(
      <PageTransition>
        <a href="https://example.com">External</a>
      </PageTransition>,
    );
    fireEvent.click(getByText("External"));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT intercept anchor links (#section)", () => {
    const { getByText } = render(
      <PageTransition>
        <a href="#section">Jump</a>
      </PageTransition>,
    );
    fireEvent.click(getByText("Jump"));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT intercept clicks on non-anchor elements", () => {
    const { getByText } = render(
      <PageTransition>
        <button type="button">Click me</button>
      </PageTransition>,
    );
    fireEvent.click(getByText("Click me"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("PageTransition reduced-motion behavior", () => {
  beforeEach(() => {
    mockPush.mockReset();
    document.startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: vi.fn(),
        types: new Set<string>(),
      };
    }) as unknown as typeof document.startViewTransition;
    // Install matchMedia that reports prefers-reduced-motion: reduce
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    delete (document as Partial<Document>).startViewTransition;
    delete (window as Partial<Window>).matchMedia;
    vi.restoreAllMocks();
    cleanup();
  });

  it("skips view transition when prefers-reduced-motion: reduce", () => {
    const { getByText } = render(
      <PageTransition>
        <a href="/about">About</a>
      </PageTransition>,
    );
    fireEvent.click(getByText("About"));
    // router.push is NOT called because the click handler returns early
    expect(mockPush).not.toHaveBeenCalled();
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });
});
