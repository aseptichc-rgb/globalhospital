"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 280;
const MIN_PREFIX_LENGTH = 2;

interface UseAutocompleteArgs {
  prefix: string;
  role: "doctor" | "patient";
  patientLang: string;
  /** When true, suppress fetching (e.g. translating in flight, live mode on). */
  disabled?: boolean;
}

interface UseAutocompleteResult {
  suggestions: string[];
  loading: boolean;
  /** Clear the current suggestions and abort any in-flight request. */
  clear: () => void;
}

/**
 * Debounced, cancellable autocomplete fetcher backed by /api/gemini/autocomplete.
 * Each new prefix aborts the previous request so stale suggestions never
 * overwrite fresh ones. A short prefix-cache avoids re-querying for prefixes
 * the user has already seen completions for during this session.
 */
export function useAutocomplete({
  prefix,
  role,
  patientLang,
  disabled,
}: UseAutocompleteArgs): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSuggestions([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const trimmed = prefix.trim();

    if (disabled || trimmed.length < MIN_PREFIX_LENGTH) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const cacheKey = `${role}|${patientLang}|${prefix}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);

      (async () => {
        try {
          const res = await fetch("/api/gemini/autocomplete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefix, role, patientLang }),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            setSuggestions([]);
            return;
          }
          const data = await res.json();
          const list: string[] = Array.isArray(data?.suggestions)
            ? data.suggestions.filter((s: unknown): s is string => typeof s === "string")
            : [];
          cacheRef.current.set(cacheKey, list);
          if (!ctrl.signal.aborted) setSuggestions(list);
        } catch (err) {
          if ((err as { name?: string })?.name !== "AbortError") {
            console.error("Autocomplete fetch error:", err);
          }
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [prefix, role, patientLang, disabled]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { suggestions, loading, clear };
}
