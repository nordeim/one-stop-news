/**
 * route.ts — Public REST API for categories.
 *
 * Returns all categories (id, slug, name) as JSON.
 * Used by the PAD §12 post-deploy verification checklist and by external
 * consumers needing the category taxonomy.
 *
 * Caching: Categories change rarely (admin-managed), so we cache at the CDN
 * edge for 5 minutes with a 1-hour stale-while-revalidate window.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    const rows = await db.query.categories.findMany({
      columns: {
        id: true,
        slug: true,
        name: true,
      },
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    return NextResponse.json(
      { categories: rows },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("[API /categories] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

// Reference the schema import for type-checking (findMany uses relational query API).
void categories;
