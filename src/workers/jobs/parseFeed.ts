/**
 * parseFeed.ts — RSS/Atom/JSON Feed parser.
 *
 * Parses feed content (string) into a normalized array of FeedItem objects.
 * Used by the ingest worker to extract article candidates from source feeds.
 *
 * Supported formats (per feedFormatEnum in schema.ts):
 *   - rss      — RSS 2.0 (with content:encoded extension for full body)
 *   - atom     — Atom 1.0 (with <content> for full body)
 *   - json_api — JSON Feed v1.1 (with content_text / content_html for body)
 *
 * Library discipline: uses `rss-parser` for XML formats (RSS + Atom),
 * native JSON.parse for JSON Feed. Per AGENTS.md, prefer libraries over
 * custom parsers.
 */

import Parser from "rss-parser";
import type { FeedFormat } from "@/lib/db/schema";
// Phase 19 (H9): cheerio replaces the regex-based HTML stripper.
// cheerio uses a real HTML parser (parse5 under the hood), which correctly
// handles:
//   - Numeric character references (e.g., &#8217; for right single quote)
//   - CDATA sections
//   - <script>/<style> tag content (which the regex leaked into summaries)
//   - Nested tags with attributes
//   - Malformed HTML
import * as cheerio from "cheerio";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FeedItem {
  /** Article title — required. Items without title are filtered out. */
  title: string;
  /** Short excerpt / summary (RSS <description>, Atom <summary>, JSON summary) */
  excerpt?: string;
  /** Full body content (RSS content:encoded, Atom <content>, JSON content_text/html) */
  body?: string;
  /** Canonical article URL */
  url: string;
  /** Publication date (parsed from feed date string) */
  publishedAt?: Date;
}

// ── RSS Parser instance ────────────────────────────────────────────────────
// Configure rss-parser to extract content:encoded (RSS 2.0 full body extension).
// Also enable lenient parsing for malformed feeds (common in the wild).
const parser = new Parser({
  customFields: {
    item: ["content:encoded", "content"],
  },
});

// Type narrowing for rss-parser output — it returns loosely-typed objects
// because custom fields aren't in the default type. We use a typed interface
// and verify field presence at runtime.
interface RssParsedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  // rss-parser built-in fields. NOTE: rss-parser conflates several source
  // fields into `content`:
  //   - For RSS 2.0: `content` = <content:encoded> if present, else <description>
  //   - For Atom: `content` = <content> if present, else <summary>
  // To disambiguate, we explicitly read `content:encoded` and `contentSnippet`
  // (which is the plain-text version of <description> for RSS). We do NOT
  // fall back to the built-in `content` field because we can't tell whether
  // it's the body or just the description.
  content?: string;
  contentSnippet?: string; // rss-parser: plain-text <description> for RSS
  "content:encoded"?: string; // RSS 2.0 extension for full body
  summary?: string; // Atom <summary>
}

interface JsonFeedItem {
  id?: string;
  title?: string;
  url?: string;
  summary?: string;
  content_text?: string;
  content_html?: string;
  date_published?: string;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Parses feed content (XML for RSS/Atom, JSON for JSON Feed) into FeedItem[].
 *
 * Filters out items without a title (per PAD §8.1 — title is required for
 * article ingestion). Items with invalid dates are kept but publishedAt
 * is left undefined.
 *
 * @param content     — Raw feed content (string)
 * @param feedFormat  — One of "rss" | "atom" | "json_api"
 * @returns Array of normalized FeedItem objects (may be empty)
 */
export async function parseFeed(
  content: string,
  feedFormat: FeedFormat,
): Promise<FeedItem[]> {
  if (feedFormat === "json_api") {
    return parseJsonFeed(content);
  }
  return parseXmlFeed(content);
}

// ── XML parser (RSS + Atom via rss-parser) ─────────────────────────────────

async function parseXmlFeed(content: string): Promise<FeedItem[]> {
  try {
    const parsed = await parser.parseString(content);
    const rawItems = (parsed.items ?? []) as unknown as RssParsedItem[];

    // Detect feed type to disambiguate the `content` field.
    // rss-parser does NOT reliably expose feedType (it's undefined for Atom
    // in some versions). We detect by inspecting the raw XML root element:
    //   - <feed ...> → Atom
    //   - <rss ...> or <rdf:RDF ...> → RSS
    const isAtom =
      /^\s*<\?xml[^>]*\?>\s*<feed[\s>]/i.test(content) ||
      /^\s*<feed[\s>]/i.test(content.trim());

    const items: FeedItem[] = [];
    for (const raw of rawItems) {
      // Filter out items without title (required field)
      if (!raw.title || raw.title.trim().length === 0) continue;
      // Filter out items without URL (no canonical link)
      if (!raw.link) continue;

      // Body extraction strategy by feed type:
      //   - RSS: only trust content:encoded (explicit full-body extension)
      //   - Atom: use the <content> element (rss-parser exposes as `content`)
      const body = isAtom ? raw.content : raw["content:encoded"];

      // Strip HTML tags from body for storage (we store plain text for AI summarization)
      const cleanBody = body ? stripHtml(body) : undefined;

      // Excerpt extraction by feed type:
      //   - RSS 2.0: <description> (rss-parser exposes as contentSnippet, plain-text)
      //   - Atom: <summary> (rss-parser exposes as summary); contentSnippet
      //     conflates with <content> for Atom, so we don't use it here.
      const excerpt = isAtom
        ? raw.summary?.trim() || undefined
        : raw.contentSnippet?.trim() || raw.summary?.trim() || undefined;

      // Parse publication date — rss-parser provides both pubDate (RFC 822) and
      // isoDate (ISO 8601). Prefer isoDate for reliable parsing.
      const publishedAt = parseDate(raw.isoDate ?? raw.pubDate);

      items.push({
        title: raw.title.trim(),
        excerpt: excerpt && excerpt.length > 0 ? excerpt : undefined,
        body: cleanBody && cleanBody.trim().length > 0 ? cleanBody : undefined,
        url: raw.link,
        publishedAt,
      });
    }

    return items;
  } catch (error) {
    // Malformed XML — return empty array rather than throwing.
    // The ingest worker will record the failure on the source row.
    console.warn("[parseFeed] XML parse failed:", error);
    return [];
  }
}

// ── JSON Feed parser (v1.1) ────────────────────────────────────────────────

function parseJsonFeed(content: string): FeedItem[] {
  try {
    const parsed = JSON.parse(content) as { items?: JsonFeedItem[] };
    const rawItems = parsed.items ?? [];

    const items: FeedItem[] = [];
    for (const raw of rawItems) {
      // Filter out items without title
      if (!raw.title || raw.title.trim().length === 0) continue;
      // Filter out items without URL
      if (!raw.url) continue;

      // Body: prefer content_text (plain), fall back to content_html (strip tags)
      const body =
        raw.content_text ??
        (raw.content_html ? stripHtml(raw.content_html) : undefined);

      const publishedAt = parseDate(raw.date_published);

      items.push({
        title: raw.title.trim(),
        excerpt: raw.summary?.trim() || undefined,
        body: body && body.trim().length > 0 ? body : undefined,
        url: raw.url,
        publishedAt,
      });
    }

    return items;
  } catch (error) {
    // Malformed JSON — return empty array
    console.warn("[parseFeed] JSON parse failed:", error);
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strips HTML tags and decodes entities, returning plain text.
 *
 * Phase 19 (H9): Replaced the regex-based stripper with cheerio. The regex
 * approach (/<[^>]*>/g + 6 hand-listed entities) missed:
 *   - Numeric character references (e.g., &#8217; for ')
 *   - CDATA sections
 *   - <script>/<style> content (which leaked into AI summaries)
 *   - Nested tags with attributes
 *
 * cheerio uses parse5 (a real browser-grade HTML parser) under the hood,
 * handling all of these correctly. This prevents malformed/malicious HTML
 * from corrupting AI summarization prompts.
 *
 * Used to normalize content:encoded (RSS) and content_html (JSON) into
 * plain text suitable for AI summarization.
 */
function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  // Remove non-content tags entirely — their text content should NOT appear
  // in the stripped output (e.g., <script>alert('evil')</script> must not
  // leak "alert('evil')" into the AI prompt).
  $("script, style, noscript, iframe, object, embed").remove();
  // $.text() concatenates the text content of all remaining nodes, decoding
  // all entity types (named, decimal, hex) along the way.
  return $.text().replace(/\s+/g, " ").trim();
}

/**
 * Parses a date string (RFC 822, ISO 8601, or other) into a Date.
 * Returns undefined if parsing fails.
 */
function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}
