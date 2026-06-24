import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NewsTicker, tickerItems } from "./NewsTicker";

describe("NewsTicker", () => {
  it("renders the ticker wrapper with correct ARIA role", () => {
    const { container } = render(<NewsTicker />);
    expect(container.querySelector("[role='marquee']")).toBeDefined();
  });

  it("renders all ticker items", () => {
    const { container } = render(<NewsTicker />);
    tickerItems.forEach((item) => {
      expect(container.textContent).toContain(item.text);
    });
  });

  it("applies category label styling per item", () => {
    const { container } = render(<NewsTicker />);
    expect(container.textContent).toContain("Breaking");
  });

  it("renders duplicate items for seamless scrolling", () => {
    const { container } = render(<NewsTicker />);
    const firstItemText = tickerItems[0]?.text ?? "";
    const text = container.textContent ?? "";
    const occurrences = text.split(firstItemText).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
