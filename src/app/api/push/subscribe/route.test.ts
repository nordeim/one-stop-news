/**
 * route.test.ts — Tests for POST /api/push/subscribe.
 *
 * Tests the push subscription endpoint, focusing on the Phase 14
 * encryptedKeys column fix (MEDIUM-2). The DB and encryption modules
 * are mocked to isolate route logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the DB module.
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: mockValues.mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate.mockReturnValue({
          onConflictDoUpdate: mockOnConflictDoUpdate,
        }),
      }),
    })),
  },
  pushSubscriptions: {
    endpoint: "endpoint",
    encryptedKeys: "encrypted_keys",
  },
}));

// Mock the encryption module.
vi.mock("@/lib/security/encrypt", () => ({
  encryptPushKeys: vi.fn().mockReturnValue("encrypted-envelope-string"),
}));

// Mock the auth module — auth() returns a fake session.
// S3 fix: API routes use auth() directly (not verifySession) because they
// need to return 401 JSON, not redirect. auth() returns null when
// unauthenticated, letting the route return a proper 401.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "user-123",
      role: "reader",
      name: "Test User",
      email: "test@test.com",
    },
  }),
}));

const { POST, OPTIONS } = await import("./route");
const { encryptPushKeys } = await import("@/lib/security/encrypt");
const { auth } = await import("@/lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: {
    p256dh: "BNc...base64...",
    auth: "base64-auth-key",
  },
};

describe("POST /api/push/subscribe", () => {
  it("returns 201 on valid subscription", async () => {
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(201);
  });

  it("encrypts push keys before storage", async () => {
    await POST(makeRequest(validBody));
    expect(encryptPushKeys).toHaveBeenCalledWith(validBody.keys);
  });

  it("stores encrypted keys in encryptedKeys column (Phase 14 schema fix)", async () => {
    await POST(makeRequest(validBody));

    // Verify db.insert was called with encryptedKeys (not keys.p256dh)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedKeys: "encrypted-envelope-string",
      }),
    );

    // Verify the OLD keys field is NOT set to the encrypted envelope
    // (the old convention was keys: { p256dh: encryptedKeys, auth: "encrypted" })
    const callArg = mockValues.mock.calls[0]?.[0];
    expect(callArg.keys).toBeUndefined();
  });

  it("returns 400 for invalid subscription format", async () => {
    const response = await POST(makeRequest({ endpoint: "not-a-url" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for missing keys", async () => {
    const response = await POST(
      makeRequest({ endpoint: "https://example.com/push" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 when DB insert fails", async () => {
    mockValues.mockRejectedValueOnce(new Error("DB connection lost"));
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
  });

  it("returns 401 when auth() returns null (user not signed in)", async () => {
    // S3 fix: API routes use auth() directly — it returns null when
    // unauthenticated (no redirect). The route returns 401 JSON.
    // Cast null to the expected type — the mock's TypeScript type is
    // NextMiddleware (from Auth.js), but at runtime it's a vi.fn that
    // can return any value. The cast bypasses the type mismatch.
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid json/i);
  });
});

describe("OPTIONS /api/push/subscribe (CORS preflight)", () => {
  it("returns 204 No Content with CORS headers", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type",
    );
  });

  it("does not call auth (preflight is unauthenticated)", async () => {
    await OPTIONS();
    expect(auth).not.toHaveBeenCalled();
  });

  it("does not call the database (preflight is cheap)", async () => {
    const { db } = await import("@/lib/db");
    await OPTIONS();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
