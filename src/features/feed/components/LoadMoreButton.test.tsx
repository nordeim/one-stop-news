import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadMoreButton } from "./LoadMoreButton";

describe("LoadMoreButton", () => {
  it("renders the button when hasMore is true", () => {
    render(
      <LoadMoreButton hasMore={true} isLoading={false} onClick={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /load more/i })).toBeDefined();
  });

  it("does not render the button when hasMore is false", () => {
    const { container } = render(
      <LoadMoreButton hasMore={false} isLoading={false} onClick={vi.fn()} />,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <LoadMoreButton hasMore={true} isLoading={false} onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables button when isLoading is true", () => {
    const onClick = vi.fn();
    render(
      <LoadMoreButton hasMore={true} isLoading={true} onClick={onClick} />,
    );
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    // Button should not call onClick when disabled
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when already loading (defensive double-click guard)", () => {
    const onClick = vi.fn();
    render(
      <LoadMoreButton hasMore={true} isLoading={true} onClick={onClick} />,
    );
    // Button is disabled, so clicks shouldn't fire
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
