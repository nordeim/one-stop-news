import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSection } from "./StatsSection";

describe("StatsSection", () => {
  it("renders the three stats", () => {
    const { container } = render(<StatsSection />);
    expect(container.textContent).toContain("247");
    expect(container.textContent).toContain("1.2M");
    expect(container.textContent).toContain("450K");
  });

  it("renders the section heading", () => {
    render(<StatsSection />);
    expect(
      screen.queryByRole("heading", { name: /Our Commitment/ }),
    ).toBeDefined();
  });

  it("has three feature check marks", () => {
    const { container } = render(<StatsSection />);
    expect(container.textContent).toContain("EU AI Act");
  });
});
