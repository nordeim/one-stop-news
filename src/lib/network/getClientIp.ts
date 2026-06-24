/**
 * getClientIp.ts — Trusted-proxy-aware client IP extraction.
 *
 * Phase 19+ remediation, Batch 3 / F1.
 *
 * This module implements the CIDR chain-walking logic that was declared in
 * the env schema (TRUSTED_PROXY_CIDRS) but never consumed by the original
 * getClientIp() in src/app/api/articles/route.ts.
 *
 * Architecture:
 *   - `walkXffChain(ips, trustedCidrs)` — pure function, no env access.
 *     Returns the rightmost untrusted IP, skipping IPs that belong to a
 *     trusted CIDR. Falls back to rightmost-IP behavior when trustedCidrs
 *     is empty (backward compat with Phase 14).
 *   - `getClientIpFromHeaders(headers)` — pure function, reads env via the
 *     typed `env` export. Decides which strategy to use based on
 *     TRUSTED_PROXY + TRUSTED_PROXY_CIDRS.
 *   - `getClientIp(request)` — thin wrapper that extracts headers from
 *     a NextRequest and delegates to getClientIpFromHeaders.
 *
 * Strategy matrix:
 *   TRUSTED_PROXY | TRUSTED_PROXY_CIDRS | Behavior
 *   --------------|---------------------|----------------------------------------
 *   unset         | (ignored)           | Leftmost IP (client-supplied, spoofable)
 *   "true"        | unset               | Rightmost IP (Phase 14 backward compat)
 *   "true"        | "10.0.0.0/8,..."    | Walk XFF chain right-to-left, skip trusted
 *
 * Decision tree for TRUSTED_PROXY=true:
 *   1. Parse TRUSTED_PROXY_CIDRS into a list of CIDR strings
 *   2. If list is empty → return rightmost IP (old behavior)
 *   3. If list is non-empty → walk right-to-left, return first IP NOT in any CIDR
 *   4. If all IPs are in trusted CIDRs → return leftmost IP (the entire chain
 *      is trusted, so the leftmost is the most-original client we can see)
 */

import { BlockList } from "node:net";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Walk the x-forwarded-for chain from right to left, returning the first
 * untrusted IP. Used when TRUSTED_PROXY=true AND TRUSTED_PROXY_CIDRS is set.
 *
 * @param ips - Array of IPs from x-forwarded-for (leftmost = original client, rightmost = closest proxy)
 * @param trustedCidrs - Array of CIDR strings (e.g., ["10.0.0.0/8", "172.16.0.0/12"])
 * @returns The first untrusted IP from the right, or the leftmost IP if all are trusted
 */
export function walkXffChain(ips: string[], trustedCidrs: string[]): string {
  if (ips.length === 0) return "";
  if (trustedCidrs.length === 0) {
    // Backward compat with Phase 14: no CIDRs configured → rightmost IP
    return ips[ips.length - 1] ?? "";
  }

  const blockList = buildBlockList(trustedCidrs);

  // Walk right-to-left, return first untrusted IP
  for (let i = ips.length - 1; i >= 0; i--) {
    const ip = ips[i];
    if (!ip) continue;
    if (!blockList.check(ip)) {
      return ip;
    }
  }

  // All IPs are in trusted CIDRs — return the leftmost (most-original client)
  return ips[0] ?? "";
}

/**
 * Build a Node.js BlockList from an array of CIDR strings.
 * Handles both IPv4 and IPv6 CIDRs.
 */
function buildBlockList(cidrs: string[]): BlockList {
  const bl = new BlockList();
  for (const cidr of cidrs) {
    const trimmed = cidr.trim();
    if (!trimmed) continue;
    const slashIdx = trimmed.indexOf("/");
    if (slashIdx === -1) {
      // Single IP address (no /prefix) — add as a full-address block
      // BlockList.addAddress supports both IPv4 and IPv6
      if (trimmed.includes(":")) {
        bl.addAddress(trimmed, "ipv6");
      } else {
        bl.addAddress(trimmed, "ipv4");
      }
      continue;
    }
    const addr = trimmed.slice(0, slashIdx);
    const bits = Number(trimmed.slice(slashIdx + 1));
    if (Number.isNaN(bits) || bits < 0) continue;
    // BlockList.addSubnet supports both IPv4 (0-32) and IPv6 (0-128) —
    // it infers the family from the address format.
    if (addr.includes(":")) {
      bl.addSubnet(addr, bits, "ipv6");
    } else {
      bl.addSubnet(addr, bits, "ipv4");
    }
  }
  return bl;
}

/**
 * Parse the TRUSTED_PROXY_CIDRS env var into an array of CIDR strings.
 * Returns empty array if the env var is unset or empty.
 */
function parseTrustedCidrs(cidrs: string | undefined): string[] {
  if (!cidrs) return [];
  return cidrs
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Extract the client IP from a Headers object.
 *
 * Pure function — reads env via the typed `env` export, but takes headers
 * as input rather than a NextRequest, making it unit-testable without
 * needing Next.js.
 *
 * @param headers - The Headers object to read x-forwarded-for / x-real-ip from
 * @returns The client IP string (or "unknown" if no IP headers present)
 */
export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    const isTrustedProxy = env.TRUSTED_PROXY === "true";

    if (!isTrustedProxy) {
      // Default: leftmost IP (client-supplied, spoofable but documented)
      return ips[0] ?? "unknown";
    }

    // TRUSTED_PROXY=true → use chain walking if CIDRs are configured,
    // otherwise fall back to the old Phase 14 rightmost-IP behavior.
    const trustedCidrs = parseTrustedCidrs(env.TRUSTED_PROXY_CIDRS);
    const ip = walkXffChain(ips, trustedCidrs);
    return ip || "unknown";
  }

  return headers.get("x-real-ip") ?? "unknown";
}

/**
 * Extract the client IP from a NextRequest.
 *
 * Thin wrapper around getClientIpFromHeaders — extracts the headers from
 * the request and delegates.
 *
 * @param request - The NextRequest to extract the client IP from
 * @returns The client IP string (or "unknown")
 */
export function getClientIp(request: NextRequest): string {
  return getClientIpFromHeaders(request.headers);
}
