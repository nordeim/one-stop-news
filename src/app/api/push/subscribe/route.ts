import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { encryptPushKeys } from "@/lib/security/encrypt";
import { auth } from "@/lib/auth";

// ─── PUSH SUBSCRIPTION API ─────────────────────────────────────────────────
//
// Endpoint: POST /api/push/subscribe
//
// Handles Web Push API subscription requests. Validates the subscription
// body with Zod, encrypts the push keys with AES-256-GCM, and stores
// the subscription in the database.
//
// Security:
//   - Requires authenticated session (via auth())
//   - Encrypts p256dh and auth keys before storage
//   - Upserts by endpoint (idempotent)
//
// S3 fix: Uses auth() directly (not verifySession) because API routes must
// return 401 JSON, not redirect. verifySession() calls redirect() which
// throws NEXT_REDIRECT — inappropriate for JSON API responses.
// ─────────────────────────────────────────────────────────────────────────────

const subscriptionSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint URL"),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh overhead"),
    auth: z.string().min(1, "auth token required"),
  }),
});

export async function POST(request: Request) {
  // ── Auth: use auth() directly for JSON 401 (not verifySession redirect) ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Sign in to subscribe to push notifications." },
      { status: 401 },
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = subscriptionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid subscription format",
        details: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const { endpoint, keys } = parseResult.data;

  try {
    // Encrypt push keys before storage (AES-256-GCM)
    const encryptedKeys = encryptPushKeys(keys);

    // Upsert subscription (idempotent by endpoint).
    // Phase 14 (MEDIUM-2 fix): Store encrypted envelope in the dedicated
    // `encryptedKeys` column instead of stuffing it into `keys.p256dh`.
    // The old `keys` column is retained for backward compat but not written.
    await db
      .insert(pushSubscriptions)
      .values({
        userId: session.user.id,
        endpoint,
        encryptedKeys,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          encryptedKeys,
        },
      });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[Push Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to store subscription" },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS preflight (if needed by frontend)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
