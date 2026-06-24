import { DefaultSession } from "next-auth";
import "next-auth/jwt";

/**
 * Module augmentation for NextAuth.js (Auth.js v5 beta)
 *
 * Extends the default Session and JWT types to include
 * our custom `id` and `role` fields.
 *
 * IMPORTANT: Merge custom properties with `DefaultSession["user"]`
 * to preserve the default fields (name, email, image).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "reader" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    role: "reader" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "reader" | "admin";
  }
}
