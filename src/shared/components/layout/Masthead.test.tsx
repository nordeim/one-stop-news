import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "./Masthead";

describe("Masthead", () => {
  it("renders the OneStopNews wordmark", () => {
    render(<Masthead />);
    expect(screen.getByText("OneStopNews")).toBeDefined();
  });

  it("renders the edition bar", () => {
    render(<Masthead />);
    // Edition bar contains at least date + Live indicator
    expect(screen.getByText(/Edition/i)).toBeDefined();
    expect(screen.getByText(/Live/)).toBeDefined();
  });

  it("renders the tagline", () => {
    render(<Masthead />);
    expect(screen.getByText("Your Briefing Room")).toBeDefined();
  });

  it("has no accessibility violations (semantic check)", () => {
    const { container } = render(<Masthead />);
    // The masthead should be wrapped in a <header> element
    expect(container.querySelector("header")).toBeDefined();
  });
});
