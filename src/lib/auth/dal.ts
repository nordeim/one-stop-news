import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verifies the current session and fetches the user from the database.
 * Memoized per-request via React.cache().
 *
 * @returns { user, session } — NEVER throws; redirects instead.
 */
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await db
    .select({
      id: users.id,
      role: users.role,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!user) {
    redirect("/sign-in");
  }

  return { user, sessionId: session.user.id as string };
});

/**
 * Verifies the current session and ensures the user has admin role.
 * Redirects non-admin users to home ("/").
 */
export const verifyAdminSession = cache(async () => {
  const { user } = await verifySession();
  if (user.role !== "admin") {
    redirect("/");
  }
  return user;
});
