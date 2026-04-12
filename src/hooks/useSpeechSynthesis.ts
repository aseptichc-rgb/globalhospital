"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechSynthesisReturn {
  speak: (text: string) => Promise<void>;
  cancel: () => void;
  isSpeaking: boolean;
}

/**
 * Server-backed TTS using Gemini's multilingual neural voices, with automatic
 * fallback to the browser's built-in SpeechSynthesis when the server returns
 * an error (e.g. Gemini preview model doesn't support the language yet).
 */
export function useSpeechSynthesis(lang: string): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const browserUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (browserUtteranceRef.current) {
      window.speechSynthesis.cancel();
      browserUtteranceRef.current = null;
    }
    setIsSpeaking(false);
    if (resolveRef.current) {
      const r = resolveRef.current;
      resolveRef.current = null;
      r();
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanup();
  }, [cleanup]);

  const speakWithBrowserTTS = useCallback(
    (text: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        browserUtteranceRef.current = utterance;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => cleanup();
        utterance.onerror = () => cleanup();
        window.speechSynthesis.speak(utterance);
      });
    },
    [lang, cleanup]
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      // Cancel any in-flight speech before starting a new one.
      cancel();

      const controller = new AbortController();
      abortRef.current = controller;

      let res: Response;
      try {
        res = await fetch("/api/gemini/text-to-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[TTS] fetch failed, falling back to browser TTS:", err);
          return speakWithBrowserTTS(text);
        }
        return;
      }

      if (controller.signal.aborted) return;
      if (!res.ok) {
        console.warn("[TTS] API error:", res.status, "— falling back to browser TTS");
        return speakWithBrowserTTS(text);
      }

      const blob = await res.blob();
      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = cleanup;
        audio.onerror = cleanup;
        audio.play().catch(() => cleanup());
      });
    },
    [lang, cancel, cleanup, speakWithBrowserTTS]
  );

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return { speak, cancel, isSpeaking };
}
