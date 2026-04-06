"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MicrophoneButton from "@/components/ui/MicrophoneButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { getMedicalLabels, FIELD_KEYS, FieldKey } from "@/config/medical-fields";
import { LanguageConfig } from "@/types/language";

interface ConsultationFormProps {
  language: LanguageConfig;
}

interface ChatBubble {
  type: "system" | "user";
  text: string;
  koreanTranslation?: string;
}

const QUESTION_KEYS: readonly FieldKey[] = FIELD_KEYS;

export default function ConsultationForm({ language }: ConsultationFormProps) {
  const router = useRouter();
  const { updateField, setLanguage, setFollowUpQuestions } = useConsultationStore();
  const labels = getMedicalLabels(language.code);

  const [currentStep, setCurrentStep] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
    isProcessing,
  } = useSpeechRecognition(language.bcp47);

  const prevTranscriptRef = useRef("");

  useEffect(() => {
    setLanguage(language.code);
  }, [language.code, setLanguage]);

  const getQuestionText = useCallback(
    (step: number): string => {
      const key = QUESTION_KEYS[step];
      const questionKey = `${key}Question` as keyof typeof labels;
      return (labels[questionKey] as string) || labels[key];
    },
    [labels]
  );

  // Initialize chat with greeting + first question
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setChatMessages([
      { type: "system", text: labels.chatGreeting },
      { type: "system", text: getQuestionText(0) },
    ]);
  }, [labels, getQuestionText]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isComplete]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      setInputValue(transcript);
    }
  }, [transcript]);

  // Auto-send when voice recognition completes
  const wasProcessingRef = useRef(false);
  useEffect(() => {
    if (isProcessing) {
      wasProcessingRef.current = true;
    } else if (wasProcessingRef.current && !isListening && transcript) {
      wasProcessingRef.current = false;
      // Use setTimeout to ensure inputValue is updated from transcript first
      setTimeout(() => handleSend(), 0);
    }
  }, [isProcessing, isListening, transcript, handleSend]);

  const translateField = useCallback(
    async (key: FieldKey, text: string): Promise<string> => {
      if (!text.trim()) return "";
      try {
        const res = await fetch("/api/gemini/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sourceLang: language.geminiLangName,
            targetLang: "Korean",
          }),
        });
        const data = await res.json();
        if (data.translatedText) {
          updateField(key, { original: text, korean: data.translatedText });
          return data.translatedText;
        }
      } catch (error) {
        console.error("Translation error:", error);
      }
      updateField(key, { original: text, korean: "" });
      return "";
    },
    [language.geminiLangName, updateField]
  );

  const advanceToNext = useCallback(
    (fromStep: number) => {
      const nextStep = fromStep + 1;
      if (nextStep < QUESTION_KEYS.length) {
        setCurrentStep(nextStep);
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: getQuestionText(nextStep) },
        ]);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setIsComplete(true);
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: labels.thankYouMessage },
        ]);
      }
    },
    [getQuestionText, labels.thankYouMessage]
  );

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || currentStep >= QUESTION_KEYS.length || isTranslating) return;

    const fieldKey = QUESTION_KEYS[currentStep];

    // Add user message
    setChatMessages((prev) => [...prev, { type: "user", text }]);
    setInputValue("");
    prevTranscriptRef.current = "";
    resetTranscript();

    // Translate
    setIsTranslating(true);
    const korean = await translateField(fieldKey, text);
    setIsTranslating(false);

    // Update the last user message with translation
    if (korean) {
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastUserIdx = updated.length - 1;
        updated[lastUserIdx] = { ...updated[lastUserIdx], koreanTranslation: korean };
        return updated;
      });
    }

    advanceToNext(currentStep);
  }, [inputValue, currentStep, isTranslating, resetTranscript, translateField, advanceToNext]);

  const handleSkip = useCallback(() => {
    if (currentStep >= QUESTION_KEYS.length || isTranslating) return;
    // First question (chiefComplaint) is required
    if (currentStep === 0) return;

    const fieldKey = QUESTION_KEYS[currentStep];
    updateField(fieldKey, { original: "", korean: "" });

    setChatMessages((prev) => [
      ...prev,
      { type: "user", text: `(${labels.skipButton})` },
    ]);

    advanceToNext(currentStep);
  }, [currentStep, isTranslating, updateField, labels.skipButton, advanceToNext]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      prevTranscriptRef.current = "";
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComplete = () => {
    // Clear cached follow-up questions so they regenerate based on the current chief complaint
    setFollowUpQuestions([], []);
    router.push(`/${language.code}/followup`);
  };

  const canUseVoice = language.speechSupported && isSupported;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[800px]">
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">{labels.pageTitle}</h1>
        <p className="text-xs text-gray-500 mt-1">{labels.voiceInputHint}</p>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {msg.type === "system" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.type === "system"
                  ? "bg-gray-100 text-gray-800 rounded-tl-md"
                  : "bg-primary text-white rounded-tr-md"
              }`}
            >
              <p className="text-xl whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              {msg.koreanTranslation && (
                <p className="text-lg mt-2 pt-2 border-t border-white/20 opacity-80 leading-relaxed">
                  🇰🇷 {msg.koreanTranslation}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Translating indicator */}
        {isTranslating && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Voice status */}
      {(isListening || isProcessing) && (
        <div className="px-4 pb-2 shrink-0">
          {isListening && (
            <p className="text-base text-red-500 animate-pulse text-center">
              {labels.listeningMessage}
            </p>
          )}
          {!isListening && isProcessing && (
            <p className="text-base text-blue-500 animate-pulse text-center">
              {labels.processingVoiceMessage}
            </p>
          )}
        </div>
      )}

      {speechError && (
        <div className="px-4 pb-2 shrink-0">
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center">
            ⚠️ {speechError}
          </p>
        </div>
      )}

      {/* Input Area or Complete Button */}
      {isComplete ? (
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary-dark transition-colors"
          >
            {labels.completeButton}
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-100 shrink-0">
          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 mb-3 justify-center">
            {QUESTION_KEYS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx < currentStep
                    ? "w-6 bg-primary"
                    : idx === currentStep
                    ? "w-8 bg-primary animate-pulse"
                    : "w-4 bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2 items-end">
            {/* Skip button (hidden for first required question) */}
            {currentStep > 0 && (
              <button
                onClick={handleSkip}
                disabled={isTranslating}
                className="px-4 py-3 text-base text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 shrink-0"
              >
                {labels.skipButton}
              </button>
            )}

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={labels.chatInputPlaceholder}
              lang={language.bcp47}
              autoComplete="off"
              autoCorrect="off"
              dir={language.dir}
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent resize-none text-gray-800 placeholder-gray-400 text-lg"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />

            {canUseVoice && (
              <MicrophoneButton
                isListening={isListening}
                onClick={handleMicClick}
                disabled={isTranslating}
              />
            )}

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTranslating}
              className="px-5 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 text-lg"
            >
              {labels.sendButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
