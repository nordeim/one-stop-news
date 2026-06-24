import type { ArticleWithSource } from "@/domain/articles/types";
import { ArticleCard } from "./ArticleCard";

interface FeedGridProps {
  articles: ArticleWithSource[];
}

/**
 * FeedGrid — Parent subgrid container for the topic-first news feed.
 *
 * Layout contract (PRD §4.3):
 *   - Parent defines 1/2/3 columns with gap-x only (no gap-y).
 *   - Each ArticleCard spans 3 named rows via row-span-3.
 *   - Vertical spacing between visual rows is owned by the card (mb-10).
 *   - The last card in each column uses last:mb-0 to prevent footer spacing issues.
 */
export function FeedGrid({ articles }: FeedGridProps) {
  if (articles.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center gap-3" role="status">
        <span
          className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember"
          aria-hidden="true"
        />
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300">
          No stories in this category yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8"
      role="feed"
      aria-label="News articles"
    >
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
