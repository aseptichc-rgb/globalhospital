"use client";

import { useEffect, useCallback, useRef } from "react";
import MicrophoneButton from "@/components/ui/MicrophoneButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

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
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="flex gap-3 items-start">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          lang={bcp47}
          dir={dir}
          autoComplete="off"
          autoCorrect="off"
          rows={3}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent resize-none text-gray-800 placeholder-gray-400"
        />
        {canUseVoice && (
          <MicrophoneButton
            isListening={isListening}
            onClick={handleMicClick}
          />
        )}
      </div>
      {isListening && (
        <p className="text-sm text-red-500 animate-pulse">
          🎤 음성을 듣고 있습니다... (말을 멈추면 자동 전송)
        </p>
      )}
      {!isListening && isProcessing && (
        <p className="text-sm text-blue-500 animate-pulse">
          음성을 변환하고 있습니다...
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
