import { Suspense } from "react";
import { FeedData } from "@/features/feed/components/FeedData";
import { FeedSkeleton } from "@/features/feed/components/FeedSkeleton";
import { Header } from "@/shared/components/layout/Header";
import { Footer } from "@/shared/components/layout/Footer";
import { Masthead } from "@/shared/components/layout/Masthead";
import { NewsTicker } from "@/shared/components/layout/NewsTicker";
import { StatsSection } from "@/shared/components/ui/StatsSection";
import { NewsletterCTA } from "@/shared/components/ui/NewsletterCTA";
import { LeadStory } from "@/features/feed/components/LeadStory";
import { NutritionLabelDemo } from "@/features/summaries/components/NutritionLabelDemo";
import { RevealProvider } from "@/shared/components/providers/RevealProvider";
import FaqAccordion from "@/shared/components/ui/Accordion";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper-50">
      <RevealProvider>
        {/* Scroll Progress Indicator */}
        <div className="scroll-progress" aria-hidden="true" />

        <NewsTicker />

        {/* 2. Masthead / Wordmark */}
        <Masthead />

        {/* 3. Header + Category Navigation */}
        <Suspense fallback={null}>
          <Header activeCategory="top-stories" />
        </Suspense>

        {/* 4. Lead Story / Hero */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <LeadStory />
        </section>

        {/* 5. Feed Section */}
        <main
          id="main-content"
          className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
          <section className="mb-12">
            <h2 className="font-editorial text-4xl text-ink-900 mb-4">
              Top Stories
            </h2>
            <p className="font-ui text-ink-600 text-lg max-w-2xl">
              The most important stories of the day, summarised by AI with full
              source citation.
            </p>
          </section>

          <Suspense fallback={<FeedSkeleton />}>
            <FeedData limit={6} />
          </Suspense>
        </main>

        {/* 6. AI Nutrition Label Demo */}
        <NutritionLabelDemo />

        {/* 7. Stats / Commitment */}
        <StatsSection />

        {/* 8. FAQ Accordion */}
        <FaqAccordion />

        {/* 9. Newsletter CTA */}
        <NewsletterCTA />

        {/* 10. Footer */}
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </RevealProvider>
    </div>
  );
}
