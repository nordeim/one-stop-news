/**
 * SourcesData.test.tsx
 *
 * Phase 22 (N5): Pause button wiring.
 * Phase 25 (F8+F9): Resume + Delete button wiring.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceTable } from "./SourcesData";

vi.mock("@/app/(admin)/admin/sources/actions", () => ({
  pauseSourceAction: vi.fn(),
  resumeSourceAction: vi.fn(),
  deleteSourceAction: vi.fn(),
}));

Object.defineProperty(window, "confirm", {
  writable: true,
  value: vi.fn(),
});

const ACTIVE = {
  id: "src-active-1",
  name: "Active Source",
  feedUrl: "https://a.com/feed.xml",
  categoryId: null,
  isActive: true,
  failureCount: 0,
};

const PAUSED = {
  id: "src-paused-1",
  name: "Paused Source",
  feedUrl: "https://p.com/feed.xml",
  categoryId: null,
  isActive: false,
  failureCount: 3,
};

describe("Active rows", () => {
  it("renders Pause button", () => {
    render(<SourceTable sources={[ACTIVE]} categoryMap={{}} />);
    expect(screen.getByRole("button", { name: /pause/i })).toBeDefined();
  });

  it("does NOT render Resume button", () => {
    render(<SourceTable sources={[ACTIVE]} categoryMap={{}} />);
    expect(screen.queryByRole("button", { name: /resume/i })).toBeNull();
  });

  it("renders Delete button (F8)", () => {
    render(<SourceTable sources={[ACTIVE]} categoryMap={{}} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeDefined();
  });
});

describe("Paused rows (F9)", () => {
  it("renders Resume button", () => {
    render(<SourceTable sources={[PAUSED]} categoryMap={{}} />);
    expect(screen.getByRole("button", { name: /resume/i })).toBeDefined();
  });

  it("does NOT render Pause button", () => {
    render(<SourceTable sources={[PAUSED]} categoryMap={{}} />);
    expect(screen.queryByRole("button", { name: /pause/i })).toBeNull();
  });

  it("renders Delete button (F8)", () => {
    render(<SourceTable sources={[PAUSED]} categoryMap={{}} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeDefined();
  });
});

describe("Regression", () => {
  it("renders Actions column header", () => {
    render(<SourceTable sources={[]} categoryMap={{}} />);
    expect(screen.getByText("Actions")).toBeDefined();
  });
});
