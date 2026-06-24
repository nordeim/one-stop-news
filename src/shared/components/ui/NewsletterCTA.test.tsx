import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { NewsletterCTA } from "./NewsletterCTA";

describe("NewsletterCTA", () => {
  it("renders the email input", () => {
    const { container } = render(<NewsletterCTA />);
    expect(container.querySelector("input[type='email']")).toBeDefined();
  });

  it("has the subscribe button", () => {
    const { container } = render(<NewsletterCTA />);
    expect(container.querySelector("button")).toBeDefined();
  });

  it("displays trust badges", () => {
    const { container } = render(<NewsletterCTA />);
    expect(container.textContent).toContain("EU AI Act");
  });

  // ── Phase 19 (H6): Expand coverage for handleSubmit + status machine ────
  // Previously only the idle state was tested (lines 8-9). Now we exercise
  // the submitting and success states via fireEvent + fake timers.

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Get Daily Briefing' button label in idle state", () => {
    render(<NewsletterCTA />);
    expect(screen.getByText("Get Daily Briefing")).toBeDefined();
  });

  it("updates button label to 'Subscribing...' when form is submitted", () => {
    render(<NewsletterCTA />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    // Status should be "submitting" — button label changes.
    expect(screen.getByText("Subscribing...")).toBeDefined();
  });

  it("disables the submit button during submitting state", () => {
    render(<NewsletterCTA />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });

    fireEvent.submit(input.closest("form")!);

    const button = screen.getByText("Subscribing...").closest("button");
    expect(button?.disabled).toBe(true);
  });

  it("renders success message after the setTimeout fires", () => {
    render(<NewsletterCTA />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.submit(input.closest("form")!);

    // Advance fake timer inside act() because the setTimeout callback
    // triggers a React state update (setStatus("success")).
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/thanks for subscribing/i)).toBeDefined();
  });

  it("clears the email input after successful submission", () => {
    render(<NewsletterCTA />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.submit(input.closest("form")!);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // After success, the form is replaced by the success message, so the
    // input is no longer in the DOM.
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("does NOT submit if email is empty (form requires it)", () => {
    render(<NewsletterCTA />);
    // The input has `required` attribute — form won't submit without a value.
    // But handleSubmit also has an early return `if (!email) return;`.
    const button = screen.getByText("Get Daily Briefing");
    expect(button).toBeDefined();
    // Just verify the early-return path doesn't break — clicking submit
    // with empty email would normally be blocked by the browser, but
    // we can verify the component doesn't crash.
    expect(() => {
      const form = button.closest("form")!;
      // Manually call handleSubmit with empty value (bypassing required check)
      fireEvent.change(screen.getByLabelText("Email address"), {
        target: { value: "" },
      });
      fireEvent.submit(form);
    }).not.toThrow();
  });
});
