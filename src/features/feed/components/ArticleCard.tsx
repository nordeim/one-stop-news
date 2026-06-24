"use client";

import Link from "next/link";
import { formatTimeAgo } from "@/shared/lib/utils";
import type { ArticleWithSource } from "@/domain/articles/types";

interface ArticleCardProps {
  article: ArticleWithSource;
}

/**
 * ArticleCard — Subgrid child spanning 3 row tracks.
 *
 * Subgrid contract (PRD §4.3):
 *   Row 1: Headline — Editorial serif, weight 800.
 *   Row 2: Excerpt — UI sans, 3-line clamp.
 *   Row 3: Metadata — Mono, uppercase, auto-aligned.
 *
 * Data contract:
 *   `article.source.name` requires a JOIN with the sources table.
 *   Feed queries MUST use getFeedArticles() which includes this JOIN.
 */
export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="group relative grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0 border-b border-ink-100 pb-6 transition-colors duration-300 hover:bg-paper-100/50">
      {/* ROW 1: Headline */}
      <h3 className="font-editorial text-xl leading-tight text-ink-900 group-hover:text-dispatch-ember transition-colors duration-300">
        <Link
          href={`/article/${article.id}`}
          className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 rounded-sm"
        >
          {article.title}
        </Link>
      </h3>

      {/* ROW 2: Excerpt */}
      <p className="font-ui text-sm leading-relaxed text-ink-600 line-clamp-3">
        {article.excerpt ?? (
          <span className="text-ink-300 italic">No excerpt available.</span>
        )}
      </p>

      {/* ROW 3: Metadata */}
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-ink-600 mt-auto">
        <span className="text-dispatch-slate font-medium truncate max-w-[120px]">
          {article.source.name}
        </span>
        <span
          className="w-1 h-1 rounded-full bg-ink-300 shrink-0"
          aria-hidden="true"
        />
        <time
          dateTime={
            article.publishedAt instanceof Date
              ? article.publishedAt.toISOString()
              : String(article.publishedAt)
          }
          className="shrink-0 tabular-nums"
        >
          {formatTimeAgo(article.publishedAt)}
        </time>
        {article.hasSummary && article.summaryStatus === "ok" && (
          <>
            <span
              className="w-1 h-1 rounded-full bg-ink-300 shrink-0"
              aria-hidden="true"
            />
            <span className="text-dispatch-ember font-medium shrink-0 tracking-widest">
              AI Brief
            </span>
          </>
        )}
      </div>
    </article>
  );
}
