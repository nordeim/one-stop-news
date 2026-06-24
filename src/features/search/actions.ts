"use server";

/**
 * actions.ts — Server Actions for search functionality.
 *
 * Client components MUST import from this file, NOT from queries.ts,
 * to prevent postgres (Node.js-only) from being bundled for the browser.
 */

import { searchArticles as searchArticlesQuery } from "./queries";
import type { SearchParams, SearchPage } from "./types";

/**
 * searchArticlesAction — Server Action wrapper for full-text search.
 *
 * Called from client components. Delegates to queries.ts for actual DB access.
 */
export async function searchArticlesAction(
  params: SearchParams,
): Promise<SearchPage> {
  return searchArticlesQuery(params);
}
