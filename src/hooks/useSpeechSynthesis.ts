"use client";

import { useState, useCallback, useRef } from "react";

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
}

export function useSpeechSynthesis(lang: string): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
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
