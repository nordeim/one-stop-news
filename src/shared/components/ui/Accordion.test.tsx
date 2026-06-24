import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FaqAccordion from "./Accordion";

describe("FaqAccordion", () => {
  it("renders all FAQ items", () => {
    const { container } = render(<FaqAccordion />);
    expect(container.textContent).toContain("What is the AI Nutrition Label?");
    expect(container.textContent).toContain("How are articles summarised?");
    expect(container.textContent).toContain(
      "What sources does OneStopNews use?",
    );
  });

  it("renders the FAQ heading", () => {
    render(<FaqAccordion />);
    expect(
      screen.queryByRole("heading", { name: /Frequently Asked/ }),
    ).toBeDefined();
  });

  // ── Phase 19 (H1): Focus rings on accordion triggers ─────────────────────
  // The AccordionPrimitive.Trigger had `focus-visible:outline-none` set with
  // NO replacement ring class — keyboard focus was invisible. WCAG AAA
  // violation. Now must have explicit focus-visible:ring-* classes.
  it("renders all accordion triggers with focus-visible:ring-* classes", () => {
    const { container } = render(<FaqAccordion />);
    const triggers = container.querySelectorAll("button");
    expect(triggers.length).toBeGreaterThan(0);
    for (const trigger of triggers) {
      expect(trigger.className).toMatch(/focus-visible:ring/);
    }
  });
});
