import { describe, it, expect } from "vitest";
import { isWithinQuietHours } from "./isWithinQuietHours";

// ─── UNIT TEST: DST-Safe Quiet Hours ────────────────────────────────────────
//
// TDD Approach: Write failing tests first, then implement.
//
// The quiet hours evaluation MUST use luxon (not native Date) to
// correctly handle DST transitions and timezone-aware comparisons.
//
// Rules (per PRD v4.3 §8.2):
//   - Returns false (fail open) if any preference is null
//   - Uses luxon DateTime for timezone conversion
//   - Handles overnight wrap (22:00 → 07:00 wraps past midnight)
//   - Handles same-day range (14:00 → 16:00)
// ─────────────────────────────────────────────────────────────────────────────

describe("isWithinQuietHours", () => {
  it("fails open (returns false) when preferences are incomplete", () => {
    const now = new Date("2026-06-15T14:00:00Z");
    expect(
      isWithinQuietHours(
        { pushQuietStart: null, pushQuietEnd: null, briefingTimezone: null },
        now,
      ),
    ).toBe(false);
  });

  it("returns false when current time is outside quiet hours", () => {
    // 17:00 UTC in June = 13:00 EDT (1:00 PM) in New York — outside 22:00-07:00 quiet hours
    const now = new Date("2026-06-15T17:00:00Z");
    const result = isWithinQuietHours(
      {
        pushQuietStart: "22:00:00",
        pushQuietEnd: "07:00:00",
        briefingTimezone: "America/New_York",
      },
      now,
    );
    expect(result).toBe(false);
  });

  it("returns true when current time is within overnight quiet hours", () => {
    // Simulate 02:00 in New York (which is 06:00 UTC)
    const now = new Date("2026-06-15T06:00:00Z"); // 02:00 in NY (EDT)
    const result = isWithinQuietHours(
      {
        pushQuietStart: "22:00:00",
        pushQuietEnd: "07:00:00",
        briefingTimezone: "America/New_York",
      },
      now,
    );
    expect(result).toBe(true);
  });

  it("returns true when current time is within same-day quiet hours", () => {
    // 15:00 in London during BST (which is 14:00 UTC)
    const now = new Date("2026-06-15T14:00:00Z"); // 15:00 in London (BST)
    const result = isWithinQuietHours(
      {
        pushQuietStart: "14:00:00",
        pushQuietEnd: "16:00:00",
        briefingTimezone: "Europe/London",
      },
      now,
    );
    expect(result).toBe(true);
  });

  it("handles DST transition correctly (spring forward)", () => {
    // March 8, 2026 2:00 AM - clocks spring forward in US
    const now = new Date("2026-03-08T07:00:00Z"); // 02:00 EST became 03:00 EDT
    const result = isWithinQuietHours(
      {
        pushQuietStart: "22:00:00",
        pushQuietEnd: "07:00:00",
        briefingTimezone: "America/New_York",
      },
      now,
    );
    // Should correctly handle the DST gap
    expect(result).toBe(true);
  });

  it("handles DST transition correctly (fall back)", () => {
    // November 1, 2026 2:00 AM - clocks fall back in US
    const now = new Date("2026-11-01T06:00:00Z"); // 01:00 EDT became 01:00 EST
    const result = isWithinQuietHours(
      {
        pushQuietStart: "22:00:00",
        pushQuietEnd: "07:00:00",
        briefingTimezone: "America/New_York",
      },
      now,
    );
    expect(result).toBe(true);
  });
});
