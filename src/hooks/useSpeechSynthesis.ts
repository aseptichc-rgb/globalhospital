"use client";

import { useState, useCallback, useRef } from "react";

interface UseSpeechSynthesisReturn {
  speak: (text: string) => Promise<void>;
  cancel: () => void;
  isSpeaking: boolean;
}

/**
 * Resolves with the browser's loaded voice list. On Chrome the list is
 * populated asynchronously, so getVoices() can return [] on the very first
 * call — this helper waits for the `voiceschanged` event in that case.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    let settled = false;
    const handler = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", handler);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", handler);
    // Safety timeout — some browsers never fire the event if no extra voices
    // exist beyond the defaults. Resolve with whatever's there after 1s.
    setTimeout(() => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", handler);
      resolve(synth.getVoices());
    }, 1000);
  });
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const lower = lang.toLowerCase();
  const base = lower.split("-")[0];
  // 1) Exact match (e.g. zh-CN === zh-CN)
  let match = voices.find((v) => v.lang.toLowerCase() === lower);
  // 2) Same base language (e.g. zh-CN matches zh-TW or zh)
  if (!match) match = voices.find((v) => v.lang.toLowerCase().startsWith(base));
  // 3) Prefer non-default if multiple base matches (often higher quality)
  return match;
}

export function useSpeechSynthesis(lang: string): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      if (!text.trim()) return;

      // Cancel any in-flight utterance before starting a new one.
      window.speechSynthesis.cancel();

      const voices = await loadVoices();

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;

        const voice = pickVoice(voices, lang);
        if (voice) {
          utterance.voice = voice;
          // Some engines ignore utterance.lang when a voice is set, so
          // mirror the voice's lang for safety.
          utterance.lang = voice.lang;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [lang]
  );

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking };
}
