"use client";

import { useEffect, useCallback, useRef } from "react";
import MicrophoneButton from "@/components/ui/MicrophoneButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import KeyboardTextarea from "@/components/keyboard/KeyboardTextarea";

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  bcp47: string;
  speechSupported: boolean;
  label: string;
  dir?: "ltr" | "rtl";
}

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  bcp47,
  speechSupported,
  label,
  dir = "ltr",
}: VoiceInputProps) {
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
    isProcessing,
  } = useSpeechRecognition(bcp47);

  const prevTranscriptRef = useRef("");

  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      onChange(transcript);
    }
  }, [transcript, onChange]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      prevTranscriptRef.current = "";
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const canUseVoice = speechSupported && isSupported;

  return (
    <div className="space-y-2">
      <label
        className="block text-sm font-semibold"
        style={{ color: "var(--gh-ink)" }}
      >
        {label}
      </label>
      <div className="flex gap-3 items-start">
        <KeyboardTextarea
          value={value}
          onValueChange={onChange}
          placeholder={placeholder}
          lang={bcp47}
          dir={dir}
          autoComplete="off"
          autoCorrect="off"
          rows={3}
          className="gh-input flex-1 resize-none"
          style={{ height: "auto", paddingTop: 12, paddingBottom: 12 }}
        />
        {canUseVoice && (
          <MicrophoneButton
            isListening={isListening}
            onClick={handleMicClick}
          />
        )}
      </div>
      {isListening && (
        <span className="gh-live-dot">
          음성을 듣고 있습니다 · Listening
        </span>
      )}
      {!isListening && isProcessing && (
        <p
          className="text-sm animate-pulse"
          style={{ color: "var(--gh-blue)" }}
        >
          음성을 변환하고 있습니다… · Transcribing…
        </p>
      )}
      {error && (
        <p
          className="text-sm px-3 py-2"
          style={{
            color: "var(--gh-danger)",
            background: "rgba(215, 38, 61, 0.08)",
            border: "1px solid rgba(215, 38, 61, 0.25)",
            borderRadius: "var(--gh-r-sm)",
          }}
          role="alert"
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
