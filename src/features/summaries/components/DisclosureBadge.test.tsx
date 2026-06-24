import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DisclosureBadge } from "./DisclosureBadge";

describe("DisclosureBadge", () => {
  it("renders 'AI Brief' for ok status", () => {
    render(<DisclosureBadge status="ok" />);
    expect(screen.getByText("AI Brief")).toBeDefined();
  });

  it("renders 'Processing' for pending status", () => {
    render(<DisclosureBadge status="pending" />);
    expect(screen.getByText("Processing")).toBeDefined();
  });

  it("renders 'Under Review' for needs_review status", () => {
    render(<DisclosureBadge status="needs_review" />);
    expect(screen.getByText("Under Review")).toBeDefined();
  });

  it("renders null for disabled status", () => {
    const { container } = render(<DisclosureBadge status="disabled" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null for none status", () => {
    const { container } = render(<DisclosureBadge status="none" />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onClick when clicked", () => {
    let clicked = false;
    render(
      <DisclosureBadge
        status="ok"
        onClick={() => {
          clicked = true;
        }}
      />,
    );
    screen.getByRole("button").click();
    expect(clicked).toBe(true);
  });
});
