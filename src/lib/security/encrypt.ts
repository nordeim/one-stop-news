import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
// Phase 19 (H12): Read PUSH_KEY_ENCRYPTION_KEY via the typed `env` export
// (validated by Zod at module load) instead of process.env.* directly.
// The Zod schema in src/lib/env/index.ts already enforces the 64-hex-char
// format, so the inline validation below is redundant — but we keep the
// error message for backwards compatibility with any code that catches it.
import { env } from "@/lib/env";

/**
 * encrypt.ts — AES-256-GCM push key encryption.
 *
 * The PUSH_KEY_ENCRYPTION_KEY env var is validated AT MODULE LOAD (not
 * lazily inside encrypt/decrypt). This makes the worker / web server
 * fail fast at boot if the env var is missing or invalid — the
 * documented contract per src/lib/env/index.ts and AGENTS.md §Auth.
 *
 * Previously this module validated lazily inside getKey(), which meant
 * an unset/invalid key would only surface as a 500 on the first push
 * operation (deferred-failure pattern). Hoisting the validation to
 * module scope matches the pattern in env/index.ts and the documented
 * "validated at module load" contract.
 *
 * Phase 19 (H12): Now reads via `env.PUSH_KEY_ENCRYPTION_KEY` instead of
 * `process.env.PUSH_KEY_ENCRYPTION_KEY` — the Zod schema already enforces
 * the 64-hex-char format, so the inline validation is simplified.
 */

const ALGORITHM = "aes-256-gcm";

// ─── Module-load validation ────────────────────────────────────────────────
// Phase 19 (H12): The Zod schema in env/index.ts already validates this at
// module load (it would have thrown before we even got here in production).
// We ALSO validate here as a belt-and-suspenders measure so that:
//   1. The error message is always "PUSH_KEY_ENCRYPTION_KEY: ..." (consistent
//      across production + tests)
//   2. Tests that mock @/lib/env (bypassing Zod) still get a clear error
//      if they forget to set PUSH_KEY_ENCRYPTION_KEY on the mock
//   3. Any future code path that imports encrypt.ts without going through
//      the env validation (e.g., a CLI script) gets a clear error
const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;
function validatePushKeyEncryptionKey(value: string | undefined): string {
  if (!value) {
    throw new Error(
      "PUSH_KEY_ENCRYPTION_KEY is required (64 hex chars / 32 bytes). Generate with: openssl rand -hex 32",
    );
  }
  if (!HEX_64_REGEX.test(value)) {
    throw new Error(
      "PUSH_KEY_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got: " +
        `${value.length} chars. Generate with: openssl rand -hex 32`,
    );
  }
  return value;
}

const KEY_BUFFER = Buffer.from(
  validatePushKeyEncryptionKey(env.PUSH_KEY_ENCRYPTION_KEY),
  "hex",
);

/**
 * encryptPushKeys — Encrypts Web Push subscription keys with AES-256-GCM.
 *
 * S5 fix: Uses a random 12-byte IV per NIST SP 800-38D recommendation for
 * GCM mode (96-bit IV is the optimal length — avoids additional GHASH
 * computation required for non-96-bit IVs). The previous 16-byte IV was
 * technically valid but non-compliant with best practice.
 *
 * Produces the format:
 *   ${iv}:${authTag}:${encryptedData} (all hex-encoded)
 *
 * Backward compatibility: decryptPushKeys reads the IV from the stored hex
 * string and creates a Buffer from it — the length doesn't matter for
 * decryption. Old data encrypted with 16-byte IVs still decrypts correctly.
 *
 * @param keys — { p256dh, auth } from the PushSubscription keys
 * @returns Hex-encoded encrypted string
 */
export function encryptPushKeys(keys: {
  p256dh: string;
  auth: string;
}): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY_BUFFER, iv);

  let encrypted = cipher.update(JSON.stringify(keys), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * decryptPushKeys — Decrypts Web Push subscription keys.
 *
 * @param encryptedString — Format: ${iv}:${authTag}:${encryptedData}
 * @returns Original { p256dh, auth } object
 */
export function decryptPushKeys(encryptedString: string): {
  p256dh: string;
  auth: string;
} {
  const [ivHex, authTagHex, encryptedHex] = encryptedString.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted push key format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    KEY_BUFFER,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}
