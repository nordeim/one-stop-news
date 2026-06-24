import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LeadStory } from "./LeadStory";

describe("LeadStory", () => {
  it("renders the lead story headline", () => {
    const { container } = render(<LeadStory />);
    expect(container.querySelector("h2")).toBeDefined();
  });

  it("displays the breaking badge", () => {
    const { container } = render(<LeadStory />);
    expect(container.textContent).toContain("Breaking");
  });

  it("shows the AI Summary Available badge", () => {
    const { container } = render(<LeadStory />);
    expect(container.textContent).toContain("AI Summary Available");
  });

  it("has a link to the nutrition label section", () => {
    const { container } = render(<LeadStory />);
    const link = container.querySelector("a[href='#ai-summary-demo']");
    expect(link).toBeDefined();
  });
});
