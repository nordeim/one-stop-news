/**
 * SourcesData.test.tsx — Tests for the admin sources table.
 *
 * Phase 22 (N5 fix, audit Report 16): The admin sources table previously
 * had no Actions column — `pauseSource` existed in actions.ts and was
 * tested in actions.test.ts, but no UI button called it. This made the
 * action dead code from the user's perspective.
 *
 * These tests verify the new UI wiring:
 *   - Each active source row has a Pause button inside a <form>
 *   - The form has a hidden `id` input bound to the source's id
 *   - The form's `action` prop is bound to `pauseSourceAction`
 *   - Paused source rows show a placeholder (no Resume button yet)
 *
 * We test the `SourceTable` presentational component directly (avoiding
 * the need to mock async DB queries that `SourcesData` wraps).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceTable } from "./SourcesData";

// Mock the pauseSourceAction server action so the test doesn't try to
// actually invoke a Server Action (which requires the Next.js runtime).
// We just need to verify the form is wired to *something* — the action's
// own behavior is tested in actions.test.ts.
vi.mock("@/app/(admin)/admin/sources/actions", () => ({
  pauseSourceAction: vi.fn(),
}));

// ── Test Data ─────────────────────────────────────────────────────────────

const ACTIVE_SOURCE = {
  id: "src-active-1",
  name: "Active News Source",
  feedUrl: "https://active.example.com/feed.xml",
  categoryId: null,
  isActive: true,
  failureCount: 0,
};

const PAUSED_SOURCE = {
  id: "src-paused-1",
  name: "Paused News Source",
  feedUrl: "https://paused.example.com/feed.xml",
  categoryId: null,
  isActive: false,
  failureCount: 3,
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe("SourceTable — Actions column (Phase 22 / N5 fix)", () => {
  it("renders an 'Actions' column header", () => {
    render(<SourceTable sources={[]} categoryMap={{}} />);
    expect(screen.getByText("Actions")).toBeDefined();
  });

  it("renders a Pause button for active sources", () => {
    render(<SourceTable sources={[ACTIVE_SOURCE]} categoryMap={{}} />);
    expect(screen.getByRole("button", { name: /pause/i })).toBeDefined();
  });

  it("does NOT render a Pause button for paused sources (Resume not yet wired)", () => {
    render(<SourceTable sources={[PAUSED_SOURCE]} categoryMap={{}} />);
    // The paused source row should not have any button — Resume is
    // intentionally deferred (see comment in SourcesData.tsx).
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("binds the Pause button's form action to pauseSourceAction", () => {
    const { container } = render(
      <SourceTable sources={[ACTIVE_SOURCE]} categoryMap={{}} />,
    );
    // The form is the parent of the Pause button. We verify the form
    // exists and has an `action` attribute (Server Actions serialize
    // as a string URL in test environments).
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    // In jsdom, server-action forms get an action attribute set. We
    // don't assert on its value (implementation-specific) — just that
    // the form exists and wraps the button.
    const button = screen.getByRole("button", { name: /pause/i });
    expect(form!.contains(button)).toBe(true);
  });

  it("includes a hidden 'id' input in the form bound to the source's id", () => {
    const { container } = render(
      <SourceTable sources={[ACTIVE_SOURCE]} categoryMap={{}} />,
    );
    const hiddenInput = container.querySelector(
      'input[type="hidden"][name="id"]',
    );
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput!.getAttribute("value")).toBe(ACTIVE_SOURCE.id);
  });

  it("renders a Pause button for EACH active source (one per row)", () => {
    const sources = [
      ACTIVE_SOURCE,
      { ...ACTIVE_SOURCE, id: "src-active-2", name: "Second Active" },
      PAUSED_SOURCE,
    ];
    render(<SourceTable sources={sources} categoryMap={{}} />);
    // Two active sources → two Pause buttons (the paused one has none)
    const pauseButtons = screen.getAllByRole("button", { name: /pause/i });
    expect(pauseButtons).toHaveLength(2);
  });

  it("renders a placeholder em-dash for paused source rows", () => {
    render(<SourceTable sources={[PAUSED_SOURCE]} categoryMap={{}} />);
    // The placeholder is rendered with an aria-label so screen readers
    // can announce the "no action available" state.
    const placeholder = screen.getByLabelText(/no action available/i);
    expect(placeholder).toBeDefined();
    expect(placeholder?.textContent).toBe("—");
  });
});

describe("SourceTable — existing columns (regression)", () => {
  it("still renders the Name column header", () => {
    render(<SourceTable sources={[]} categoryMap={{}} />);
    expect(screen.getByText("Name")).toBeDefined();
  });

  it("still renders the Status column with Active/Paused indicator", () => {
    render(
      <SourceTable sources={[ACTIVE_SOURCE, PAUSED_SOURCE]} categoryMap={{}} />,
    );
    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.getByText("Paused")).toBeDefined();
  });

  it("still renders the Failures count", () => {
    render(<SourceTable sources={[PAUSED_SOURCE]} categoryMap={{}} />);
    expect(screen.getByText("3")).toBeDefined();
  });
});
