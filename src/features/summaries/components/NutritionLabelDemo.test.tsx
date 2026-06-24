import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NutritionLabelDemo } from "./NutritionLabelDemo";

describe("NutritionLabelDemo", () => {
  it("renders the nutrition label section", () => {
    const { container } = render(<NutritionLabelDemo />);
    expect(
      container.querySelector("[data-testid='nutrition-label-demo']"),
    ).toBeDefined();
  });

  it("displays the model name", () => {
    const { container } = render(<NutritionLabelDemo />);
    expect(container.textContent).toContain("claude-3-5-sonnet");
  });

  it("shows the coverage percentage", () => {
    const { container } = render(<NutritionLabelDemo />);
    expect(container.textContent).toContain("87%");
  });
});
