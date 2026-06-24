/**
 * Database Seed Script
 *
 * Populates the database with realistic dummy data for development and testing.
 * Run with: pnpm db:seed
 */

import { db } from "./index";
import { categories, sources, articles, summaries } from "./schema";
import type { ContentAvailability, FeedFormat } from "./schema";

// ─── Categories ───────────────────────────────────────────────────────────
export const seedCategories = [
  {
    slug: "top-stories",
    name: "Top Stories",
    description: "The most important stories",
  },
  { slug: "local", name: "Local", description: "News from your local area" },
  {
    slug: "tech",
    name: "Tech",
    description: "Technology and digital innovation",
  },
  { slug: "global", name: "Global", description: "International news" },
  { slug: "finance", name: "Finance", description: "Markets and economy" },
  {
    slug: "politics",
    name: "Politics",
    description: "Domestic and international politics",
  },
  { slug: "culture", name: "Culture", description: "Arts and entertainment" },
];

// ─── Sources ───────────────────────────────────────────────────────────────
// feedFormat uses the schema-derived FeedFormat type (Single Source of Truth)
// instead of `"rss" as const` — if the schema enum changes, this stays in sync.
export const seedSources: Array<{
  name: string;
  url: string;
  feedUrl: string;
  feedFormat: FeedFormat;
  priority: number;
}> = [
  {
    name: "Reuters",
    url: "https://reuters.com",
    feedUrl: "https://reuters.com/feed",
    feedFormat: "rss",
    priority: 1,
  },
  {
    name: "AP News",
    url: "https://apnews.com",
    feedUrl: "https://apnews.com/feed",
    feedFormat: "rss",
    priority: 1,
  },
  {
    name: "Bloomberg",
    url: "https://bloomberg.com",
    feedUrl: "https://bloomberg.com/feed",
    feedFormat: "rss",
    priority: 2,
  },
  {
    name: "The Verge",
    url: "https://theverge.com",
    feedUrl: "https://theverge.com/feed",
    feedFormat: "rss",
    priority: 2,
  },
  {
    name: "Straits Times",
    url: "https://straitstimes.com",
    feedUrl: "https://straitstimes.com/feed",
    feedFormat: "rss",
    priority: 3,
  },
  {
    name: "CNA",
    url: "https://channelnewsasia.com",
    feedUrl: "https://channelnewsasia.com/feed",
    feedFormat: "rss",
    priority: 3,
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com",
    feedUrl: "https://techcrunch.com/feed",
    feedFormat: "rss",
    priority: 2,
  },
];

// ─── Articles (30) ─────────────────────────────────────────────────────────
// contentAvailability uses the schema-derived ContentAvailability type
// (Single Source of Truth) instead of a hand-written union.
export const seedArticles: Array<{
  title: string;
  excerpt: string;
  canonicalUrl: string;
  contentHash: string;
  contentAvailability: ContentAvailability;
  importanceScore: number;
  hasSummary: boolean;
  publishedAt: Date;
  categorySlug: string;
  sourceUrl: string;
}> = [
  {
    title:
      "Global Markets Rally as G7 Inflation Cools for Third Straight Month",
    excerpt:
      "Benchmark indices across major economies posted gains after synchronized inflation data suggested central banks may have room to ease monetary policy in Q3.",
    canonicalUrl: "https://onestop.news/article/1",
    contentHash: "hash001",
    contentAvailability: "full_text",
    importanceScore: 0.95,
    hasSummary: true,
    publishedAt: new Date("2026-06-10T13:30:00"),
    categorySlug: "top-stories",
    sourceUrl: "https://bloomberg.com",
  },
  {
    title: "EU Parliament Votes on AI Act Enforcement Framework",
    excerpt:
      "The European Parliament has voted to establish a comprehensive enforcement framework for the AI Act, with 142 in favor and 37 against.",
    canonicalUrl: "https://onestop.news/article/2",
    contentHash: "hash002",
    contentAvailability: "full_text",
    importanceScore: 0.92,
    hasSummary: true,
    publishedAt: new Date("2026-06-10T12:00:00"),
    categorySlug: "top-stories",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "SpaceX Starship Completes First Orbital Refueling Test",
    excerpt:
      "The historic mission marks a critical milestone for lunar and Mars ambitions.",
    canonicalUrl: "https://onestop.news/article/3",
    contentHash: "hash003",
    contentAvailability: "partial_text",
    importanceScore: 0.88,
    hasSummary: true,
    publishedAt: new Date("2026-06-10T11:30:00"),
    categorySlug: "top-stories",
    sourceUrl: "https://apnews.com",
  },
  {
    title: "Apple Unveils On-Device AI Framework With App Store Integration",
    excerpt:
      "The new framework allows third-party apps to tap into Apple Intelligence models running locally on iPhone and Mac.",
    canonicalUrl: "https://onestop.news/article/4",
    contentHash: "hash004",
    contentAvailability: "full_text",
    importanceScore: 0.85,
    hasSummary: true,
    publishedAt: new Date("2026-06-10T10:45:00"),
    categorySlug: "top-stories",
    sourceUrl: "https://theverge.com",
  },
  {
    title: "WHO Declares New Mpox Variant a Public Health Emergency",
    excerpt:
      "The designation unlocks emergency funding and coordinated response mechanisms as cases spread across Central Africa.",
    canonicalUrl: "https://onestop.news/article/5",
    contentHash: "hash005",
    contentAvailability: "full_text",
    importanceScore: 0.87,
    hasSummary: true,
    publishedAt: new Date("2026-06-10T09:15:00"),
    categorySlug: "top-stories",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "Japan Central Bank Signals End to Negative Interest Rate Era",
    excerpt:
      "The historic shift comes as inflation stabilizes above 2% for 15 consecutive months.",
    canonicalUrl: "https://onestop.news/article/6",
    contentHash: "hash006",
    contentAvailability: "partial_text",
    importanceScore: 0.83,
    hasSummary: false,
    publishedAt: new Date("2026-06-10T08:30:00"),
    categorySlug: "top-stories",
    sourceUrl: "https://apnews.com",
  },
  {
    title: "Singapore MRT Cross Island Line Phase 2 Alignment Confirmed",
    excerpt:
      "The Land Transport Authority has confirmed the final alignment for Phase 2 of the Cross Island Line.",
    canonicalUrl: "https://onestop.news/article/7",
    contentHash: "hash007",
    contentAvailability: "excerpt",
    importanceScore: 0.65,
    hasSummary: false,
    publishedAt: new Date("2026-06-09T17:00:00"),
    categorySlug: "local",
    sourceUrl: "https://straitstimes.com",
  },
  {
    title:
      "GE2025 Campaign Enters Final Week With Housing Policy as Key Battleground",
    excerpt:
      "Candidates sharpen their positions on public housing supply and affordability.",
    canonicalUrl: "https://onestop.news/article/8",
    contentHash: "hash008",
    contentAvailability: "full_text",
    importanceScore: 0.91,
    hasSummary: true,
    publishedAt: new Date("2026-06-09T14:00:00"),
    categorySlug: "politics",
    sourceUrl: "https://channelnewsasia.com",
  },
  {
    title:
      "China Announces $40B Semiconductor Subsidy Package Amid Export Controls",
    excerpt:
      "The state-backed investment targets legacy chip manufacturing and advanced packaging.",
    canonicalUrl: "https://onestop.news/article/9",
    contentHash: "hash009",
    contentAvailability: "full_text",
    importanceScore: 0.89,
    hasSummary: true,
    publishedAt: new Date("2026-06-09T11:30:00"),
    categorySlug: "tech",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "Major K-pop Agency Launches AI Artist Management Division",
    excerpt:
      "The move signals a broader industry shift toward virtual performers.",
    canonicalUrl: "https://onestop.news/article/10",
    contentHash: "hash010",
    contentAvailability: "partial_text",
    importanceScore: 0.72,
    hasSummary: false,
    publishedAt: new Date("2026-06-09T09:00:00"),
    categorySlug: "culture",
    sourceUrl: "https://theverge.com",
  },
  {
    title: "Global Chip Shortage Eases as Supply Chain Normalizes",
    excerpt:
      "Automotive and consumer electronics manufacturers report stabilizing component availability after two years of constraints.",
    canonicalUrl: "https://onestop.news/article/11",
    contentHash: "hash011",
    contentAvailability: "full_text",
    importanceScore: 0.84,
    hasSummary: true,
    publishedAt: new Date("2026-06-08T16:00:00"),
    categorySlug: "tech",
    sourceUrl: "https://techcrunch.com",
  },
  {
    title: "Singapore Budget 2026: GST Rate Hike to 9% Confirmed",
    excerpt:
      "The government confirmed the final phase of the GST increase will proceed as planned in 2026.",
    canonicalUrl: "https://onestop.news/article/12",
    contentHash: "hash012",
    contentAvailability: "excerpt",
    importanceScore: 0.78,
    hasSummary: false,
    publishedAt: new Date("2026-06-08T10:00:00"),
    categorySlug: "local",
    sourceUrl: "https://straitstimes.com",
  },
  {
    title: "UN Climate Panel Warns of Irreversible Tipping Points",
    excerpt:
      "The latest IPCC report identifies five critical tipping points that could trigger cascading climate effects within decades.",
    canonicalUrl: "https://onestop.news/article/13",
    contentHash: "hash013",
    contentAvailability: "full_text",
    importanceScore: 0.9,
    hasSummary: true,
    publishedAt: new Date("2026-06-07T14:30:00"),
    categorySlug: "global",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "Meta's New AR Glasses Replace Smartphones by 2028",
    excerpt:
      "Mark Zuckerberg claims the device will make smartphones obsolete within three years.",
    canonicalUrl: "https://onestop.news/article/14",
    contentHash: "hash014",
    contentAvailability: "partial_text",
    importanceScore: 0.81,
    hasSummary: false,
    publishedAt: new Date("2026-06-07T09:00:00"),
    categorySlug: "tech",
    sourceUrl: "https://theverge.com",
  },
  {
    title: "Oil Prices Surge After Middle East Tensions Escalate",
    excerpt:
      "Brent crude jumps 8% as shipping routes face disruption in the Strait of Hormuz.",
    canonicalUrl: "https://onestop.news/article/15",
    contentHash: "hash015",
    contentAvailability: "full_text",
    importanceScore: 0.86,
    hasSummary: true,
    publishedAt: new Date("2026-06-06T12:00:00"),
    categorySlug: "finance",
    sourceUrl: "https://bloomberg.com",
  },
  {
    title: "New COVID-19 Variant Detected in Southeast Asia",
    excerpt:
      "Health authorities in Malaysia and Thailand report cases of a new variant with increased transmissibility.",
    canonicalUrl: "https://onestop.news/article/16",
    contentHash: "hash016",
    contentAvailability: "full_text",
    importanceScore: 0.88,
    hasSummary: true,
    publishedAt: new Date("2026-06-06T08:00:00"),
    categorySlug: "global",
    sourceUrl: "https://apnews.com",
  },
  {
    title: "Singapore's Changi Airport Retains World's Best Airport Title",
    excerpt:
      "The airport scores top marks for dining, retail, and operational efficiency.",
    canonicalUrl: "https://onestop.news/article/17",
    contentHash: "hash017",
    contentAvailability: "excerpt",
    importanceScore: 0.7,
    hasSummary: false,
    publishedAt: new Date("2026-06-05T16:00:00"),
    categorySlug: "local",
    sourceUrl: "https://channelnewsasia.com",
  },
  {
    title: "Tesla Reveals Next-Gen Battery Tech with 50% Range Boost",
    excerpt:
      "The silicon anode batteries promise 1,000km range on a single charge starting from 2027.",
    canonicalUrl: "https://onestop.news/article/18",
    contentHash: "hash018",
    contentAvailability: "full_text",
    importanceScore: 0.82,
    hasSummary: true,
    publishedAt: new Date("2026-06-05T10:00:00"),
    categorySlug: "tech",
    sourceUrl: "https://techcrunch.com",
  },
  {
    title: "ASEAN Summit Reaches Landmark Trade Agreement",
    excerpt:
      "The 10-nation bloc agrees on a unified digital trade framework that will eliminate cross-border data tariffs.",
    canonicalUrl: "https://onestop.news/article/19",
    contentHash: "hash019",
    contentAvailability: "full_text",
    importanceScore: 0.87,
    hasSummary: true,
    publishedAt: new Date("2026-06-04T14:00:00"),
    categorySlug: "global",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "Global Semiconductor Investment Hits $100B in 2026",
    excerpt:
      "Governments and companies worldwide pour record funding into chip manufacturing capacity.",
    canonicalUrl: "https://onestop.news/article/20",
    contentHash: "hash020",
    contentAvailability: "partial_text",
    importanceScore: 0.79,
    hasSummary: false,
    publishedAt: new Date("2026-06-04T09:00:00"),
    categorySlug: "finance",
    sourceUrl: "https://bloomberg.com",
  },
  {
    title: "Singapore Launches National AI Strategy 2.0",
    excerpt:
      "The updated strategy focuses on developing AI talent and infrastructure to position the city-state as a global AI hub.",
    canonicalUrl: "https://onestop.news/article/21",
    contentHash: "hash021",
    contentAvailability: "full_text",
    importanceScore: 0.8,
    hasSummary: true,
    publishedAt: new Date("2026-06-03T16:00:00"),
    categorySlug: "local",
    sourceUrl: "https://channelnewsasia.com",
  },
  {
    title: "Netflix Reports Record Subscriber Growth in Q2",
    excerpt:
      "The streaming giant added 8.5 million subscribers, beating analyst expectations by 2 million.",
    canonicalUrl: "https://onestop.news/article/22",
    contentHash: "hash022",
    contentAvailability: "full_text",
    importanceScore: 0.75,
    hasSummary: true,
    publishedAt: new Date("2026-06-03T10:00:00"),
    categorySlug: "culture",
    sourceUrl: "https://bloomberg.com",
  },
  {
    title: "US Federal Reserve Holds Rates Steady at 5.25%",
    excerpt:
      "The Fed signals potential rate cuts later in the year as inflation shows signs of stabilization.",
    canonicalUrl: "https://onestop.news/article/23",
    contentHash: "hash023",
    contentAvailability: "full_text",
    importanceScore: 0.86,
    hasSummary: true,
    publishedAt: new Date("2026-06-02T14:00:00"),
    categorySlug: "finance",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "Open Source AI Model Surpasses GPT-4 on Benchmarks",
    excerpt:
      "A community-developed model achieves state-of-the-art results on multiple reasoning benchmarks.",
    canonicalUrl: "https://onestop.news/article/24",
    contentHash: "hash024",
    contentAvailability: "partial_text",
    importanceScore: 0.78,
    hasSummary: false,
    publishedAt: new Date("2026-06-02T09:00:00"),
    categorySlug: "tech",
    sourceUrl: "https://techcrunch.com",
  },
  {
    title: "Singapore Food Festival Draws Record Crowds",
    excerpt: "",
    canonicalUrl: "https://onestop.news/article/25",
    contentHash: "hash025",
    contentAvailability: "title_only",
    importanceScore: 0.6,
    hasSummary: false,
    publishedAt: new Date("2026-06-01T16:00:00"),
    categorySlug: "local",
    sourceUrl: "https://straitstimes.com",
  },
  {
    title: "European Elections See Surge in Youth Voter Turnout",
    excerpt:
      "Turnout among voters aged 18-30 reached a record 62%, reshaping the political landscape.",
    canonicalUrl: "https://onestop.news/article/26",
    contentHash: "hash026",
    contentAvailability: "full_text",
    importanceScore: 0.81,
    hasSummary: true,
    publishedAt: new Date("2026-06-01T10:00:00"),
    categorySlug: "politics",
    sourceUrl: "https://reuters.com",
  },
  {
    title: "Quantum Computing Breakthrough Achieved at MIT",
    excerpt:
      "Researchers demonstrate a 1000-qubit processor with error correction, a major step toward practical quantum computers.",
    canonicalUrl: "https://onestop.news/article/27",
    contentHash: "hash027",
    contentAvailability: "full_text",
    importanceScore: 0.84,
    hasSummary: true,
    publishedAt: new Date("2026-05-31T14:00:00"),
    categorySlug: "tech",
    sourceUrl: "https://apnews.com",
  },
  {
    title: "Global Art Market Reaches $65B in 2026",
    excerpt:
      "Digital art and NFTs drive growth as traditional galleries adapt to new technologies.",
    canonicalUrl: "https://onestop.news/article/28",
    contentHash: "hash028",
    contentAvailability: "partial_text",
    importanceScore: 0.71,
    hasSummary: false,
    publishedAt: new Date("2026-05-31T09:00:00"),
    categorySlug: "culture",
    sourceUrl: "https://bloomberg.com",
  },
  {
    title: "Singapore Hospitals Adopt AI Diagnostic Tools",
    excerpt:
      "Three major hospitals deploy AI-powered imaging systems to improve early detection of critical conditions.",
    canonicalUrl: "https://onestop.news/article/29",
    contentHash: "hash029",
    contentAvailability: "full_text",
    importanceScore: 0.77,
    hasSummary: true,
    publishedAt: new Date("2026-05-30T14:00:00"),
    categorySlug: "local",
    sourceUrl: "https://channelnewsasia.com",
  },
  {
    title: "Cyberattack on Major Payment Processor Affects Millions",
    excerpt:
      "A sophisticated attack on a leading payment processor exposes data from 30 million customers.",
    canonicalUrl: "https://onestop.news/article/30",
    contentHash: "hash030",
    contentAvailability: "full_text",
    importanceScore: 0.9,
    hasSummary: true,
    publishedAt: new Date("2026-05-30T10:00:00"),
    categorySlug: "tech",
    sourceUrl: "https://reuters.com",
  },
];

// ─── Summaries (15) ────────────────────────────────────────────────────────
export const seedSummaries: Array<{
  summaryText: string;
  keyPoints: string[];
  sourcesCited: { url: string; title: string }[];
  model: string;
  tokensUsed: number;
  aiStatement: string;
  coveragePercentage: number;
  originalArticleUrl: string;
}> = [
  {
    summaryText:
      "Global stock markets surged after G7 inflation data showed cooling for the third consecutive month, giving central banks room to ease monetary policy. Major indices including the S&P 500, FTSE 100, and Nikkei 225 posted significant gains.",
    keyPoints: [
      "G7 inflation cooled for third straight month",
      "Central banks may ease policy in Q3",
      "S&P 500, FTSE 100, Nikkei all gained",
    ],
    sourcesCited: [
      { url: "https://bloomberg.com/1", title: "Bloomberg Markets" },
      { url: "https://reuters.com/1", title: "Reuters Business" },
    ],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 482,
    aiStatement:
      "This summary was generated by AI with source citation. Always verify with original articles.",
    coveragePercentage: 87,
    originalArticleUrl: "https://onestop.news/article/1",
  },
  {
    summaryText:
      "The European Parliament passed the AI Act enforcement framework with 142 votes in favor, establishing oversight mechanisms for artificial intelligence systems in the EU.",
    keyPoints: [
      "142 votes in favor, 37 against",
      "Framework establishes AI oversight in EU",
      "Penalties up to 4% of global turnover",
    ],
    sourcesCited: [{ url: "https://reuters.com/2", title: "Reuters Europe" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 356,
    aiStatement:
      "AI-generated summary. Please verify facts with original sources.",
    coveragePercentage: 92,
    originalArticleUrl: "https://onestop.news/article/2",
  },
  {
    summaryText:
      "SpaceX successfully completed the first orbital refueling test of its Starship vehicle, a critical milestone for future lunar and Mars missions. The demonstration involved two Starship vehicles docked in orbit.",
    keyPoints: [
      "First orbital refueling test completed",
      "Two Starship vehicles docked in orbit",
      "Critical for lunar and Mars missions",
    ],
    sourcesCited: [{ url: "https://apnews.com/3", title: "AP Science" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 410,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 85,
    originalArticleUrl: "https://onestop.news/article/3",
  },
  {
    summaryText:
      "Apple introduced a new on-device AI framework that integrates with the App Store, allowing third-party apps to access Apple Intelligence models locally on iPhone and Mac without sending data to the cloud.",
    keyPoints: [
      "On-device AI framework announced",
      "Integrates with App Store",
      "Local processing on iPhone and Mac",
    ],
    sourcesCited: [{ url: "https://theverge.com/4", title: "The Verge" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 390,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 88,
    originalArticleUrl: "https://onestop.news/article/4",
  },
  {
    summaryText:
      "The WHO declared a new mpox variant a public health emergency of international concern, unlocking emergency funding and coordinated response mechanisms as cases spread across Central Africa and neighboring regions.",
    keyPoints: [
      "New mpox variant declared emergency",
      "Cases spreading across Central Africa",
      "Emergency funding unlocked",
    ],
    sourcesCited: [{ url: "https://reuters.com/5", title: "Reuters Health" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 450,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 90,
    originalArticleUrl: "https://onestop.news/article/5",
  },
  {
    summaryText:
      "China announced a $40 billion semiconductor subsidy package targeting legacy chip manufacturing and advanced packaging, aiming to reduce dependence on foreign technology by 2030 amid ongoing export controls.",
    keyPoints: [
      "$40B semiconductor subsidy announced",
      "Targets legacy chips and advanced packaging",
      "Aims to reduce foreign dependence by 2030",
    ],
    sourcesCited: [
      { url: "https://reuters.com/9", title: "Reuters Technology" },
    ],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 420,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 86,
    originalArticleUrl: "https://onestop.news/article/9",
  },
  {
    summaryText:
      "The GE2025 campaign entered its final week with housing policy emerging as the key battleground. Candidates from major parties sharpened their positions on public housing supply and affordability for undecided voters.",
    keyPoints: [
      "Campaign enters final week",
      "Housing policy is key battleground",
      "Focus on supply and affordability",
    ],
    sourcesCited: [{ url: "https://cna.com/8", title: "CNA" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 370,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 84,
    originalArticleUrl: "https://onestop.news/article/8",
  },
  {
    summaryText:
      "The global chip shortage is easing as supply chains normalize, with automotive and consumer electronics manufacturers reporting stabilizing component availability after two years of constraints.",
    keyPoints: [
      "Chip shortage easing",
      "Supply chains normalizing",
      "Automotive and electronics stabilizing",
    ],
    sourcesCited: [{ url: "https://techcrunch.com/11", title: "TechCrunch" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 340,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 82,
    originalArticleUrl: "https://onestop.news/article/11",
  },
  {
    summaryText:
      "The UN Climate Panel warned of five irreversible tipping points that could trigger cascading climate effects within decades, urging immediate global action to prevent catastrophic outcomes.",
    keyPoints: [
      "Five critical tipping points identified",
      "Could trigger cascading climate effects",
      "Immediate action urged",
    ],
    sourcesCited: [
      { url: "https://reuters.com/13", title: "Reuters Environment" },
    ],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 400,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 89,
    originalArticleUrl: "https://onestop.news/article/13",
  },
  {
    summaryText:
      "Oil prices surged 8% after Middle East tensions escalated, causing disruption in the Strait of Hormuz, a critical shipping route for global crude oil transport.",
    keyPoints: [
      "Oil prices surged 8%",
      "Middle East tensions escalated",
      "Strait of Hormuz disrupted",
    ],
    sourcesCited: [
      { url: "https://bloomberg.com/15", title: "Bloomberg Energy" },
    ],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 310,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 80,
    originalArticleUrl: "https://onestop.news/article/15",
  },
  {
    summaryText:
      "A new COVID-19 variant was detected in Southeast Asia, with health authorities in Malaysia and Thailand reporting cases showing increased transmissibility.",
    keyPoints: [
      "New COVID-19 variant detected",
      "Found in Malaysia and Thailand",
      "Shows increased transmissibility",
    ],
    sourcesCited: [{ url: "https://apnews.com/16", title: "AP Health" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 320,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 83,
    originalArticleUrl: "https://onestop.news/article/16",
  },
  {
    summaryText:
      "ASEAN leaders reached a landmark trade agreement establishing a unified digital trade framework that will eliminate cross-border data tariffs among the 10-nation bloc.",
    keyPoints: [
      "Landmark digital trade agreement reached",
      "Eliminates cross-border data tariffs",
      "Covers 10 ASEAN nations",
    ],
    sourcesCited: [{ url: "https://reuters.com/19", title: "Reuters Asia" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 360,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 87,
    originalArticleUrl: "https://onestop.news/article/19",
  },
  {
    summaryText:
      "Tesla revealed next-generation battery technology using silicon anodes that promises a 50% range boost, offering 1,000km range on a single charge starting from 2027.",
    keyPoints: [
      "Silicon anode battery tech revealed",
      "50% range boost promised",
      "1,000km range from 2027",
    ],
    sourcesCited: [{ url: "https://techcrunch.com/18", title: "TechCrunch" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 330,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 81,
    originalArticleUrl: "https://onestop.news/article/18",
  },
  {
    summaryText:
      "Singapore launched its National AI Strategy 2.0, focusing on developing AI talent and infrastructure to position the city-state as a global AI hub by 2030.",
    keyPoints: [
      "National AI Strategy 2.0 launched",
      "Focus on talent and infrastructure",
      "Aims to be global AI hub by 2030",
    ],
    sourcesCited: [{ url: "https://cna.com/21", title: "CNA" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 340,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 85,
    originalArticleUrl: "https://onestop.news/article/21",
  },
  {
    summaryText:
      "Netflix reported record subscriber growth in Q2, adding 8.5 million subscribers and beating analyst expectations by 2 million, driven by the success of its ad-supported tier.",
    keyPoints: [
      "8.5 million subscribers added in Q2",
      "Beat expectations by 2 million",
      "Ad-supported tier driving growth",
    ],
    sourcesCited: [
      { url: "https://bloomberg.com/22", title: "Bloomberg Media" },
    ],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 350,
    aiStatement: "AI-generated summary with source citation.",
    coveragePercentage: 84,
    originalArticleUrl: "https://onestop.news/article/22",
  },
  {
    summaryText:
      "A cyberattack on a major payment processor affected 30 million customers, exposing personal and financial data in one of the largest breaches in recent years.",
    keyPoints: [
      "30 million customers affected",
      "Major payment processor breached",
      "Largest breach in recent years",
    ],
    sourcesCited: [{ url: "https://reuters.com/30", title: "Reuters Cyber" }],
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 370,
    aiStatement: "AI-generated summary. Verify with original sources.",
    coveragePercentage: 88,
    originalArticleUrl: "https://onestop.news/article/30",
  },
];

// ─── Main Seed Function ────────────────────────────────────────────────────
export async function seed() {
  console.log("🌱 Starting database seed...");

  // Insert categories
  await db.insert(categories).values(seedCategories).onConflictDoNothing();
  console.log(`  ✓ ${seedCategories.length} categories`);

  // Insert sources
  await db.insert(sources).values(seedSources).onConflictDoNothing();
  console.log(`  ✓ ${seedSources.length} sources`);

  // Get generated IDs
  const allCategories = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const allSources = await db
    .select({ id: sources.id, url: sources.url, name: sources.name })
    .from(sources);

  const categoryMap = new Map(allCategories.map((c) => [c.slug, c.id]));
  const sourceMap = new Map(
    allSources.map((s) => [s.url, { id: s.id, name: s.name }]),
  );

  // Insert articles with resolved foreign keys
  const articleValues = seedArticles.map((article, index) => {
    const categoryId = categoryMap.get(article.categorySlug);
    const source = sourceMap.get(article.sourceUrl);
    if (!categoryId || !source) {
      throw new Error(`Missing category or source for article ${index}`);
    }
    return {
      sourceId: source.id,
      // Phase 19 (H11): Denormalized source name for cross-field search.
      sourceName: source.name,
      categoryId,
      title: article.title,
      excerpt: article.excerpt,
      canonicalUrl: article.canonicalUrl,
      contentHash: article.contentHash,
      contentAvailability: article.contentAvailability,
      importanceScore: article.importanceScore,
      hasSummary: article.hasSummary,
      publishedAt: article.publishedAt,
    };
  });

  await db.insert(articles).values(articleValues).onConflictDoNothing();
  console.log(`  ✓ ${seedArticles.length} articles`);

  // Insert summaries
  if (seedSummaries.length > 0) {
    // Map article URLs to article IDs
    const articleUrlToId = new Map<string, string>();
    for (const article of await db
      .select({ id: articles.id, canonicalUrl: articles.canonicalUrl })
      .from(articles)) {
      articleUrlToId.set(article.canonicalUrl, article.id);
    }

    const summaryValues = seedSummaries
      .map((summary) => {
        const articleId = articleUrlToId.get(summary.originalArticleUrl);
        if (!articleId) {
          console.warn(
            `  ⚠ No article found for summary: ${summary.originalArticleUrl}`,
          );
          return null;
        }
        return {
          articleId,
          summaryText: summary.summaryText,
          keyPoints: summary.keyPoints,
          sourcesCited: summary.sourcesCited,
          model: summary.model,
          tokensUsed: summary.tokensUsed,
          aiStatement: summary.aiStatement,
          coveragePercentage: summary.coveragePercentage,
          originalArticleUrl: summary.originalArticleUrl,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (summaryValues.length > 0) {
      await db.insert(summaries).values(summaryValues).onConflictDoNothing();
      console.log(`  ✓ ${summaryValues.length} summaries`);
    }
  }

  console.log("✅ Database seed complete!");
}

// ─── CLI execution ─────────────────────────────────────────────────────────
// Only run seed automatically when this file is executed directly as a script.
// Prevent execution during test imports by checking process.argv.
const isCliRun = process.argv[1]?.endsWith("seed.ts") ?? false;
if (isCliRun) {
  seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
}
