"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import MicrophoneButton from "@/components/ui/MicrophoneButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { LanguageConfig } from "@/types/language";
import { getMedicalLabels } from "@/config/medical-fields";

interface FollowUpQuestionsProps {
  language: LanguageConfig;
}

interface ChatBubble {
  type: "system" | "user";
  text: string;
  koreanTranslation?: string;
}

export default function FollowUpQuestions({ language }: FollowUpQuestionsProps) {
  const router = useRouter();
  const {
    formData,
    followUpQuestions,
    setFollowUpQuestions,
    followUpAnswers,
    updateFollowUpAnswer,
  } = useConsultationStore();

  const labels = getMedicalLabels(language.code);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);

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

  // Generate follow-up questions
  useEffect(() => {
    if (followUpQuestions.length > 0) {
      setQuestionsReady(true);
      return;
    }
    if (!formData.chiefComplaint?.original) {
      router.push(`/${language.code}`);
      return;
    }

    const generateQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/gemini/followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chiefComplaint: formData.chiefComplaint.original,
            chiefComplaintKorean: formData.chiefComplaint.korean,
            targetLang: language.geminiLangName,
          }),
        });
        const data = await res.json();
        if (data.questions) {
          setFollowUpQuestions(data.questions, data.questionsKorean || []);
          setQuestionsReady(true);
        } else {
          setError("Failed to generate questions");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    generateQuestions();
  }, [
    formData.chiefComplaint,
    language.code,
    language.geminiLangName,
    followUpQuestions.length,
    setFollowUpQuestions,
    router,
  ]);

  // Initialize chat when questions are ready
  useEffect(() => {
    if (!questionsReady || initializedRef.current || followUpQuestions.length === 0) return;
    initializedRef.current = true;

    setChatMessages([
      { type: "system", text: labels.followUpGreeting },
      { type: "system", text: followUpQuestions[0] },
    ]);
  }, [questionsReady, followUpQuestions, labels.followUpGreeting]);

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

  const translateAnswer = useCallback(
    async (text: string): Promise<string> => {
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
          return data.translatedText;
        }
      } catch (err) {
        console.error("Translation error:", err);
      }
      return "";
    },
    [language.geminiLangName]
  );

  const advanceToNext = useCallback(
    (fromStep: number) => {
      const nextStep = fromStep + 1;
      if (nextStep < followUpQuestions.length) {
        setCurrentStep(nextStep);
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: followUpQuestions[nextStep] },
        ]);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setIsComplete(true);
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: labels.followUpCompleteMessage },
        ]);
      }
    },
    [followUpQuestions, labels.followUpCompleteMessage]
  );

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || currentStep >= followUpQuestions.length || isTranslating) return;

    // Add user message
    setChatMessages((prev) => [...prev, { type: "user", text }]);
    setInputValue("");
    prevTranscriptRef.current = "";
    resetTranscript();

    // Translate
    setIsTranslating(true);
    const korean = await translateAnswer(text);
    setIsTranslating(false);

    // Save answer
    updateFollowUpAnswer(currentStep, { original: text, korean });

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
  }, [inputValue, currentStep, followUpQuestions.length, isTranslating, resetTranscript, translateAnswer, updateFollowUpAnswer, advanceToNext]);

  const handleSkip = useCallback(() => {
    if (currentStep >= followUpQuestions.length || isTranslating) return;

    updateFollowUpAnswer(currentStep, { original: "", korean: "" });

    setChatMessages((prev) => [
      ...prev,
      { type: "user", text: `(${labels.skipButton})` },
    ]);

    advanceToNext(currentStep);
  }, [currentStep, followUpQuestions.length, isTranslating, updateFollowUpAnswer, labels.skipButton, advanceToNext]);

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
    router.push(`/${language.code}/summary`);
  };

  const canUseVoice = language.speechSupported && isSupported;

  // Loading state - generating questions
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[800px]">
        <div className="text-center py-4 border-b border-gray-100 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Additional Questions</h1>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-4">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm text-gray-500">{labels.followUpGenerating}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[800px]">
        <div className="text-center py-4 border-b border-gray-100 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Additional Questions</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-white rounded-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[800px]">
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Additional Questions</h1>
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
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              {msg.koreanTranslation && (
                <p className="text-xs mt-2 pt-2 border-t border-white/20 opacity-80">
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
            <p className="text-sm text-red-500 animate-pulse text-center">
              {labels.listeningMessage}
            </p>
          )}
          {!isListening && isProcessing && (
            <p className="text-sm text-blue-500 animate-pulse text-center">
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
            {labels.followUpCompleteButton} →
          </button>
        </div>
      ) : questionsReady ? (
        <div className="p-4 border-t border-gray-100 shrink-0">
          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 mb-3 justify-center">
            {followUpQuestions.map((_, idx) => (
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
            {/* Skip button - all follow-up questions are optional */}
            <button
              onClick={handleSkip}
              disabled={isTranslating}
              className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 shrink-0"
            >
              {labels.skipButton}
            </button>

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
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent resize-none text-gray-800 placeholder-gray-400 text-sm"
              style={{ minHeight: "42px", maxHeight: "120px" }}
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
              className="px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 text-sm"
            >
              {labels.sendButton}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
