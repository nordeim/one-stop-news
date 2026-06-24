"use client";

import { useState, useEffect } from "react";

/**
 * useDebounce — Generic debounce hook for any value type.
 *
 * @param value The value to debounce
 * @param delay Debounce delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * PRD §4 (implicit): Generic, cleans up via useEffect return.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
