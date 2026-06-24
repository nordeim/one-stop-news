Next Steps — Choose one
Based on the Phase 9 plan, the two remaining high-priority items are:

1. Summarisation Worker AI Integration — replace the callAISummary() stub in src/workers/index.ts with real Vercel AI SDK (Anthropic primary, OpenAI fallback), Zod output validation, and full 3-layer provenance for EU AI Act Article 50 compliance.
2. Public API Rate Limiting — add Redis-based burst rate limiting to GET /api/articles (20 req/s per IP, burst 50).
   Question: Which would you like me to tackle first? Or would you prefer I create the full implementation plan for both
