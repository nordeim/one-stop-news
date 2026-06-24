/**
 * parseFeed.test.ts — Tests for RSS/Atom/JSON Feed parsing.
 *
 * Tests verify:
 *   - RSS 2.0 parsing with title, excerpt, body, url, publishedAt
 *   - Atom parsing
 *   - JSON Feed v1.1 parsing
 *   - Items without title are filtered out
 *   - Body extracted from content:encoded (RSS) / content (Atom) / content_text (JSON)
 *   - Empty feeds return empty arrays
 */

import { describe, it, expect } from "vitest";
import { parseFeed, type FeedItem } from "./parseFeed";

// ── RSS 2.0 fixtures ──────────────────────────────────────────────────────
const RSS_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test Source</title>
    <item>
      <title>First Article</title>
      <link>https://example.com/first</link>
      <description>Short excerpt of first article.</description>
      <content:encoded>&lt;p&gt;Full body text of first article with more than 500 characters. &lt;/p&gt;</content:encoded>
      <pubDate>Mon, 10 Jun 2024 13:30:00 GMT</pubDate>
    </item>
    <item>
      <title>Second Article</title>
      <link>https://example.com/second</link>
      <description>Excerpt of second article.</description>
      <pubDate>Tue, 11 Jun 2024 09:00:00 GMT</pubDate>
    </item>
    <item>
      <link>https://example.com/no-title</link>
      <description>This item has no title and should be filtered out.</description>
    </item>
  </channel>
</rss>`;

// ── Atom fixtures ──────────────────────────────────────────────────────────
const ATOM_FEED = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Source</title>
  <entry>
    <title>Atom Entry One</title>
    <link href="https://example.com/atom/1" />
    <summary>Atom entry summary text.</summary>
    <content>Atom entry full content body.</content>
    <updated>2024-06-10T12:00:00Z</updated>
  </entry>
  <entry>
    <title>Atom Entry Two</title>
    <link href="https://example.com/atom/2" />
    <summary>Second atom entry summary.</summary>
    <updated>2024-06-11T08:00:00Z</updated>
  </entry>
</feed>`;

// ── JSON Feed v1.1 fixture ────────────────────────────────────────────────
const JSON_FEED = JSON.stringify({
  version: "https://jsonfeed.org/version/1.1",
  title: "JSON Feed Source",
  items: [
    {
      id: "1",
      title: "JSON Item One",
      url: "https://example.com/json/1",
      summary: "JSON feed item summary.",
      content_text:
        "JSON feed item full body text with sufficient content for summarization.",
      date_published: "2024-06-10T13:30:00Z",
    },
    {
      id: "2",
      title: "JSON Item Two",
      url: "https://example.com/json/2",
      content_html: "<p>HTML content for second item.</p>",
      date_published: "2024-06-11T09:00:00Z",
    },
    {
      id: "3",
      url: "https://example.com/json/no-title",
      // No title — should be filtered out
      date_published: "2024-06-12T09:00:00Z",
    },
  ],
});

describe("parseFeed", () => {
  describe("RSS 2.0", () => {
    it("parses items with title, excerpt, body, url, publishedAt", async () => {
      const items = await parseFeed(RSS_FEED, "rss");
      expect(items.length).toBe(2);

      const first = items[0] as FeedItem;
      expect(first.title).toBe("First Article");
      expect(first.url).toBe("https://example.com/first");
      expect(first.excerpt).toBe("Short excerpt of first article.");
      expect(first.body).toContain("Full body text of first article");
      expect(first.publishedAt).toEqual(new Date("2024-06-10T13:30:00.000Z"));
    });

    it("extracts body from content:encoded when available", async () => {
      const items = await parseFeed(RSS_FEED, "rss");
      const first = items[0] as FeedItem;
      expect(first.body).toBeTruthy();
      expect(first.body).toContain("Full body text");
    });

    it("leaves body undefined when content:encoded is absent", async () => {
      const items = await parseFeed(RSS_FEED, "rss");
      const second = items[1] as FeedItem;
      expect(second.title).toBe("Second Article");
      // No content:encoded in this item — body should be undefined
      expect(second.body).toBeUndefined();
    });

    it("filters out items without title", async () => {
      const items = await parseFeed(RSS_FEED, "rss");
      expect(items.find((i) => !i.title)).toBeUndefined();
      expect(items.length).toBe(2); // third item (no title) filtered out
    });
  });

  describe("Atom", () => {
    it("parses Atom entries with title, url, summary, content, updated", async () => {
      const items = await parseFeed(ATOM_FEED, "atom");
      expect(items.length).toBe(2);

      const first = items[0] as FeedItem;
      expect(first.title).toBe("Atom Entry One");
      expect(first.url).toBe("https://example.com/atom/1");
      expect(first.excerpt).toBe("Atom entry summary text.");
      expect(first.body).toBe("Atom entry full content body.");
      expect(first.publishedAt).toEqual(new Date("2024-06-10T12:00:00.000Z"));
    });

    it("Atom entries without content:body field is undefined", async () => {
      const items = await parseFeed(ATOM_FEED, "atom");
      const second = items[1] as FeedItem;
      expect(second.title).toBe("Atom Entry Two");
      // No <content> in this entry — body should be undefined
      expect(second.body).toBeUndefined();
    });
  });

  describe("JSON Feed v1.1", () => {
    it("parses JSON feed items with title, url, summary, body, date_published", async () => {
      const items = await parseFeed(JSON_FEED, "json_api");
      expect(items.length).toBe(2);

      const first = items[0] as FeedItem;
      expect(first.title).toBe("JSON Item One");
      expect(first.url).toBe("https://example.com/json/1");
      expect(first.excerpt).toBe("JSON feed item summary.");
      expect(first.body).toContain("JSON feed item full body text");
      expect(first.publishedAt).toEqual(new Date("2024-06-10T13:30:00.000Z"));
    });

    it("uses content_html when content_text is absent", async () => {
      const items = await parseFeed(JSON_FEED, "json_api");
      const second = items[1] as FeedItem;
      expect(second.body).toContain("HTML content for second item");
    });

    it("filters out JSON items without title", async () => {
      const items = await parseFeed(JSON_FEED, "json_api");
      expect(items.find((i) => i.title === undefined)).toBeUndefined();
      expect(items.length).toBe(2); // third item (no title) filtered
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty RSS feed", async () => {
      const emptyRss =
        '<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>';
      const items = await parseFeed(emptyRss, "rss");
      expect(items).toEqual([]);
    });

    it("returns empty array for empty JSON feed", async () => {
      const emptyJson = JSON.stringify({
        version: "https://jsonfeed.org/version/1.1",
        items: [],
      });
      const items = await parseFeed(emptyJson, "json_api");
      expect(items).toEqual([]);
    });

    it("returns empty array for malformed JSON", async () => {
      const items = await parseFeed("not valid json", "json_api");
      expect(items).toEqual([]);
    });

    it("returns empty array for malformed XML", async () => {
      const items = await parseFeed("not valid xml", "rss");
      expect(items).toEqual([]);
    });
  });

  // ── Phase 19 (H9): HTML stripping edge cases (cheerio replaces regex) ────
  // Previously stripHtml used a single regex (/<[^>]*>/g) + 6 hand-listed
  // entities. It missed:
  //   - Numeric character references (e.g., &#8217; for right single quote)
  //   - CDATA sections
  //   - <script>/<style> content (which leaked into summaries)
  //   - Nested tags with attributes
  // Now uses cheerio, which handles all of these correctly via the browser-
  // grade HTML parser.
  describe("HTML stripping edge cases (Phase 19 / H9)", () => {
    it("decodes numeric character references (e.g., &#8217; for ')", async () => {
      const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test</title>
    <item>
      <title>Numeric Entity Test</title>
      <link>https://example.com/entity</link>
      <description>Excerpt</description>
      <content:encoded>&lt;p&gt;It&amp;#8217;s a test&lt;/p&gt;</content:encoded>
      <pubDate>Mon, 10 Jun 2024 13:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
      const items = await parseFeed(xml, "rss");
      const body = items[0]?.body;
      // cheerio decodes &#8217; to the right single quotation mark (U+2019, ')
      expect(body).toContain("\u2019s a test");
    });

    it("removes <script> tag content entirely (no JS leaks into summary)", async () => {
      const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test</title>
    <item>
      <title>Script Tag Test</title>
      <link>https://example.com/script</link>
      <description>Excerpt</description>
      <content:encoded>&lt;p&gt;Hello&lt;/p&gt;&lt;script&gt;alert(&amp;quot;evil&amp;quot;);&lt;/script&gt;&lt;p&gt;World&lt;/p&gt;</content:encoded>
      <pubDate>Mon, 10 Jun 2024 13:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
      const items = await parseFeed(xml, "rss");
      const body = items[0]?.body ?? "";
      // The script content must NOT appear in the stripped body.
      expect(body).not.toContain("alert");
      expect(body).not.toContain("evil");
      // But the <p> contents should remain.
      expect(body).toContain("Hello");
      expect(body).toContain("World");
    });

    it("removes <style> tag content entirely (no CSS leaks into summary)", async () => {
      const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test</title>
    <item>
      <title>Style Tag Test</title>
      <link>https://example.com/style</link>
      <description>Excerpt</description>
      <content:encoded>&lt;style&gt;.x { color: red; }&lt;/style&gt;&lt;p&gt;Content&lt;/p&gt;</content:encoded>
      <pubDate>Mon, 10 Jun 2024 13:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
      const items = await parseFeed(xml, "rss");
      const body = items[0]?.body ?? "";
      expect(body).not.toContain("color");
      expect(body).not.toContain("red");
      expect(body).toContain("Content");
    });

    it("handles nested tags with attributes", async () => {
      const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test</title>
    <item>
      <title>Nested Tags Test</title>
      <link>https://example.com/nested</link>
      <description>Excerpt</description>
      <content:encoded>&lt;div class=&quot;wrapper&quot;&gt;&lt;a href=&quot;https://example.com&quot; onclick=&quot;track()&quot;&gt;Link text&lt;/a&gt;&lt;/div&gt;</content:encoded>
      <pubDate>Mon, 10 Jun 2024 13:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
      const items = await parseFeed(xml, "rss");
      const body = items[0]?.body ?? "";
      // Only the link text should remain — no attributes, no tag names.
      expect(body).toContain("Link text");
      expect(body).not.toContain("href");
      expect(body).not.toContain("onclick");
      expect(body).not.toContain("class");
    });
  });
});
