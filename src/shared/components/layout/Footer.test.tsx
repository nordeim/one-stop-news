import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the footer with correct role", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });

  it("displays the brand name", () => {
    render(<Footer />);
    expect(screen.getByText("OneStopNews")).toBeDefined();
  });

  it("shows AI disclosure text", () => {
    render(<Footer />);
    expect(screen.getByText(/AI Disclosure/i)).toBeDefined();
  });

  // Fix A: Verify year is derived from new Date(), not from prop
  it("displays the correct year from new Date()", () => {
    render(<Footer />);
    expect(screen.getByText(/2026/)).toBeDefined();
  });

  it("has all section headings", () => {
    render(<Footer />);
    expect(screen.getByText("Product")).toBeDefined();
    expect(screen.getByText("Company")).toBeDefined();
    expect(screen.getByText("Legal")).toBeDefined();
  });
});
