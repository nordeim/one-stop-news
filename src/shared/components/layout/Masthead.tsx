export function Masthead() {
  return (
    <header className="border-b border-paper-300">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Edition bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-paper-200 font-mono text-[11px] text-ink-400">
          <div className="flex items-center gap-4">
            <span className="cat-label">Edition 3.1</span>
            <span
              className="hidden sm:inline text-paper-300"
              aria-hidden="true"
            >
              &mdash;
            </span>
            <span className="hidden sm:inline">10 June 2026</span>
            <span
              className="hidden sm:inline text-paper-300"
              aria-hidden="true"
            >
              &middot;
            </span>
            <span className="hidden sm:inline">Singapore</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-dispatch-ember pulse-dot"
                aria-hidden="true"
              />
              <span className="text-dispatch-ember font-medium cat-label">
                Live
              </span>
            </span>
            <span className="hidden sm:inline">SGT 14:30</span>
          </div>
        </div>

        {/* Wordmark */}
        <div className="py-8 sm:py-12 text-center">
          <h1
            className="font-editorial text-6xl sm:text-7xl lg:text-8xl tracking-[-0.03em] text-ink-900"
            style={{ lineHeight: 0.93, fontVariationSettings: "'opsz' 72" }}
          >
            OneStopNews
          </h1>
          <p className="mt-3 font-mono text-[11px] text-ink-300 cat-label-wide tracking-[0.35em]">
            Your Briefing Room
          </p>
        </div>

        {/* Column rules — broadsheet aesthetic */}
        <div
          className="hidden lg:flex justify-between px-[12%] pb-3"
          aria-hidden="true"
        >
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-px h-4 bg-paper-300" />
          ))}
        </div>
      </div>
    </header>
  );
}
