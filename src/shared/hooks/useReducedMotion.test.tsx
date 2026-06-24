import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "./useReducedMotion";

describe("useReducedMotion", () => {
  it("returns false by default when motion is not reduced", () => {
    // Mock matchMedia for this test
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion is set to reduce", () => {
    // Mock matchMedia for reduced motion preference
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("listens to media query changes", () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();

    // Mock matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: addListener,
      removeEventListener: removeListener,
    });

    const { unmount } = renderHook(() => useReducedMotion());

    expect(addListener).toHaveBeenCalledWith("change", expect.any(Function));

    unmount();

    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
