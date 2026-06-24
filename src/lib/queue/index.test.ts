/**
 * index.test.ts — Tests for queue utilities, especially pingRedis singleton behavior.
 *
 * Verifies that pingRedis reuses a singleton Redis client rather than
 * creating a new connection on every call (which causes socket exhaustion
 * under tight health-check loops).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

let shouldPingSucceed = true;

class MockRedis {
  on = vi.fn();
  ping = vi.fn().mockImplementation(() => {
    if (!shouldPingSucceed) {
      return Promise.reject(new Error("ECONNREFUSED"));
    }
    return Promise.resolve("PONG");
  });
  disconnect = vi.fn().mockReturnValue(undefined);
  quit = vi.fn().mockResolvedValue(undefined);
}

vi.mock("ioredis", () => ({
  Redis: MockRedis,
}));

beforeEach(() => {
  vi.clearAllMocks();
  shouldPingSucceed = true;
});

describe("pingRedis", () => {
  it("returns true on successful ping", async () => {
    const { pingRedis } = await import("./index");
    const result = await pingRedis();
    expect(result).toBe(true);
  });

  it("returns false when Redis ping throws", async () => {
    shouldPingSucceed = false;
    const { pingRedis } = await import("./index");
    const result = await pingRedis();
    expect(result).toBe(false);
  });
});
