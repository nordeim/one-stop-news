"use client";

/**
 * SearchBar.tsx — Client side search input with debounce and keyboard shortcut.
 *
 * PRD §6: Full-text search UI with ⌘K / Ctrl+K shortcut.
 * Features: debounced input, loading spinner, clear button.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  defaultValue?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({
  defaultValue = "",
  onSearch,
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="relative w-full max-w-2xl"
      role="search"
      aria-label="Search news articles"
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search news articles..."
          className="w-full pl-10 pr-14 py-3 bg-paper-100 border border-ink-100 rounded-sm
                     font-ui text-sm text-ink-900 placeholder:text-ink-300
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember
                     focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
          aria-label="Search news articles"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2
              className="w-4 h-4 text-ink-300 animate-spin"
              aria-label="Loading search results"
            />
          )}
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-ink-100 rounded-sm transition-colors"
              aria-label="Clear search"
              type="button"
            >
              <X className="w-4 h-4 text-ink-400" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[10px] text-ink-400">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-paper-200 rounded-sm font-mono text-[10px]">
            ⌘K
          </kbd>{" "}
          to focus
        </span>
      </div>
    </div>
  );
}
