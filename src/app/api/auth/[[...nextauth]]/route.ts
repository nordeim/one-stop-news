import { handlers } from "@/lib/auth";

/**
 * Auth.js v5 API route handlers.
 *
 * NextAuth creates GET / POST handlers at this catch-all route.
 * - GET  /api/auth/session      → returns current session (or null)
 * - POST /api/auth/callback/*   → OAuth / credential flow callbacks
 */
export const { GET, POST } = handlers;
