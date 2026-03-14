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
}

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  bcp47,
  speechSupported,
  label,
}: VoiceInputProps) {
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
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
          Listening...
        </p>
      )}
    </div>
  );
}
