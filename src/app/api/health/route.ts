import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { pingRedis } from "@/lib/queue";

/**
 * GET /api/health
 * Returns 200 if all dependencies are healthy, 503 otherwise.
 * Public endpoint — no authentication required.
 */
export async function GET() {
  const deps: Record<string, "connected" | "error"> = {};
  let statusCode = 200;

  // Check PostgreSQL
  try {
    await db.execute(sql`SELECT 1`);
    deps.db = "connected";
  } catch {
    deps.db = "error";
    statusCode = 503;
  }

  // Check Redis
  try {
    const redisOk = await pingRedis();
    deps.redis = redisOk ? "connected" : "error";
    if (!redisOk) statusCode = 503;
  } catch {
    deps.redis = "error";
    statusCode = 503;
  }

  const allHealthy = Object.values(deps).every((v) => v === "connected");

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      deps,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  );
}
