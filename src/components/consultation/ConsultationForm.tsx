"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MicrophoneButton from "@/components/ui/MicrophoneButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { getMedicalLabels, FIELD_KEYS, FieldKey } from "@/config/medical-fields";
import { LanguageConfig } from "@/types/language";
import KeyboardTextarea from "@/components/keyboard/KeyboardTextarea";
import { useKeyboardContext } from "@/components/keyboard/VirtualKeyboardProvider";

interface ConsultationFormProps {
  language: LanguageConfig;
}

interface ChatBubble {
  type: "system" | "user";
  text: string;
  koreanTranslation?: string;
}

type Phase = "preconsultation" | "generating" | "followup" | "complete";

const QUESTION_KEYS: readonly FieldKey[] = FIELD_KEYS;
const BASE_QUESTION_COUNT = QUESTION_KEYS.length; // 5

export default function ConsultationForm({ language }: ConsultationFormProps) {
  const router = useRouter();
  const {
    updateField,
    setLanguage,
    formData,
    followUpQuestions,
    followUpQuestionsKorean,
    followUpAnswers,
    addFollowUpQuestion,
    updateFollowUpAnswer,
  } = useConsultationStore();
  const { keyboardHeight } = useKeyboardContext();
  const labels = getMedicalLabels(language.code);

  const [phase, setPhase] = useState<Phase>("preconsultation");
  const [currentStep, setCurrentStep] = useState(0); // 0-4 for base, 0+ for followup
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(BASE_QUESTION_COUNT);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  const followUpGeneratedRef = useRef(false);

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

  const { speak, cancel: cancelSpeech } = useSpeechSynthesis(language.bcp47);

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
  }, [chatMessages, phase, keyboardHeight]);

  // Adjust container height when mobile keyboard opens/closes
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const container = containerRef.current;
      if (!container) return;
      // visualViewport.height shrinks when virtual keyboard is visible
      const keyboardOffset = window.innerHeight - vv.height;
      if (keyboardOffset > 50) {
        // Keyboard is open — shrink container to fit above keyboard
        container.style.height = `${vv.height}px`;
        container.style.maxHeight = `${vv.height}px`;
        // Prevent page scroll caused by keyboard
        window.scrollTo(0, 0);
      } else {
        // Keyboard is closed — restore default
        container.style.height = "";
        container.style.maxHeight = "";
      }
      // Scroll chat to bottom after resize
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };

    // Also handle scroll event to keep viewport pinned
    const onScroll = () => {
      if (window.innerHeight - vv.height > 50) {
        window.scrollTo(0, 0);
      }
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onScroll);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      setInputValue(transcript);
    }
  }, [transcript]);

  // Auto-speak new system messages (questions) aloud
  const lastSpokenIndexRef = useRef(-1);
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastIdx = chatMessages.length - 1;
    const lastMsg = chatMessages[lastIdx];
    if (lastMsg.type === "system" && lastIdx > lastSpokenIndexRef.current) {
      lastSpokenIndexRef.current = lastIdx;
      speak(lastMsg.text);
    }
  }, [chatMessages, speak]);

  const TOTAL_FOLLOWUP_QUESTIONS = 5;

  // Generate a single follow-up question dynamically
  const generateNextFollowUpQuestion = useCallback(
    async (questionNumber: number, previousQA: { question: string; questionKorean: string; answer: string; answerKorean: string }[]) => {
      try {
        const res = await fetch("/api/gemini/followup-dynamic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chiefComplaint: formData.chiefComplaint.original,
            chiefComplaintKorean: formData.chiefComplaint.korean,
            targetLang: language.geminiLangName,
            previousQA,
            questionNumber,
            totalQuestions: TOTAL_FOLLOWUP_QUESTIONS,
          }),
        });
        const data = await res.json();
        if (data.question) {
          return { question: data.question, questionKorean: data.questionKorean || "" };
        }
      } catch (error) {
        console.error("Dynamic follow-up generation error:", error);
      }
      return null;
    },
    [formData.chiefComplaint, language.geminiLangName]
  );

  // Generate first follow-up question after base questions complete
  const startFollowUpPhase = useCallback(async () => {
    if (followUpGeneratedRef.current) return;
    followUpGeneratedRef.current = true;

    setPhase("generating");

    setChatMessages((prev) => [
      ...prev,
      { type: "system", text: labels.followUpGenerating },
    ]);

    const result = await generateNextFollowUpQuestion(1, []);

    if (result) {
      addFollowUpQuestion(result.question, result.questionKorean);
      setTotalQuestions(BASE_QUESTION_COUNT + TOTAL_FOLLOWUP_QUESTIONS);
      setCurrentStep(0);
      setPhase("followup");

      setChatMessages((prev) => {
        const withoutGenerating = prev.slice(0, -1);
        return [
          ...withoutGenerating,
          { type: "system", text: labels.followUpGreeting },
          { type: "system", text: result.question },
        ];
      });

      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setPhase("complete");
      setChatMessages((prev) => {
        const withoutGenerating = prev.slice(0, -1);
        return [
          ...withoutGenerating,
          { type: "system", text: labels.thankYouMessage },
        ];
      });
    }
  }, [generateNextFollowUpQuestion, addFollowUpQuestion, labels]);

  const translateText = useCallback(
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
      } catch (error) {
        console.error("Translation error:", error);
      }
      return "";
    },
    [language.geminiLangName]
  );

  const advanceBaseQuestion = useCallback(
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
        // Base questions done → start dynamic follow-up
        startFollowUpPhase();
      }
    },
    [getQuestionText, startFollowUpPhase]
  );

  const advanceFollowUpQuestion = useCallback(
    async (fromStep: number, latestAnswer: { original: string; korean: string }) => {
      const nextQuestionNumber = fromStep + 2; // fromStep is 0-indexed, questionNumber is 1-indexed

      if (nextQuestionNumber > TOTAL_FOLLOWUP_QUESTIONS) {
        // All follow-up questions done
        setPhase("complete");
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: labels.followUpCompleteMessage },
        ]);
        return;
      }

      // Build previous Q&A context from store + the latest answer
      const previousQA: { question: string; questionKorean: string; answer: string; answerKorean: string }[] = [];
      for (let i = 0; i <= fromStep; i++) {
        const answer = i === fromStep ? latestAnswer : followUpAnswers[i];
        previousQA.push({
          question: followUpQuestions[i] || "",
          questionKorean: followUpQuestionsKorean[i] || "",
          answer: answer?.original || "",
          answerKorean: answer?.korean || "",
        });
      }

      // Show generating indicator
      setIsTranslating(true);

      const result = await generateNextFollowUpQuestion(nextQuestionNumber, previousQA);

      setIsTranslating(false);

      if (result) {
        addFollowUpQuestion(result.question, result.questionKorean);
        setCurrentStep(fromStep + 1);
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: result.question },
        ]);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        // Failed to generate, complete early
        setPhase("complete");
        setChatMessages((prev) => [
          ...prev,
          { type: "system", text: labels.followUpCompleteMessage },
        ]);
      }
    },
    [followUpQuestions, followUpQuestionsKorean, followUpAnswers, generateNextFollowUpQuestion, addFollowUpQuestion, labels.followUpCompleteMessage]
  );

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isTranslating) return;

    if (phase === "preconsultation") {
      if (currentStep >= QUESTION_KEYS.length) return;
      const fieldKey = QUESTION_KEYS[currentStep];

      // Add user message
      setChatMessages((prev) => [...prev, { type: "user", text }]);
      setInputValue("");
      prevTranscriptRef.current = "";
      resetTranscript();

      // Translate
      setIsTranslating(true);
      const korean = await translateText(text);
      setIsTranslating(false);

      // Save to store
      updateField(fieldKey, { original: text, korean });

      setAnsweredCount((c) => c + 1);
      advanceBaseQuestion(currentStep);
    } else if (phase === "followup") {
      if (currentStep >= followUpQuestions.length) return;

      // Add user message
      setChatMessages((prev) => [...prev, { type: "user", text }]);
      setInputValue("");
      prevTranscriptRef.current = "";
      resetTranscript();

      // Translate
      setIsTranslating(true);
      const korean = await translateText(text);
      setIsTranslating(false);

      const answer = { original: text, korean };

      // Save to store
      updateFollowUpAnswer(currentStep, answer);

      setAnsweredCount((c) => c + 1);
      advanceFollowUpQuestion(currentStep, answer);
    }
  }, [
    inputValue,
    isTranslating,
    phase,
    currentStep,
    followUpQuestions.length,
    resetTranscript,
    translateText,
    updateField,
    updateFollowUpAnswer,
    advanceBaseQuestion,
    advanceFollowUpQuestion,
  ]);

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

  const handleSkip = useCallback(() => {
    if (isTranslating) return;

    if (phase === "preconsultation") {
      if (currentStep >= QUESTION_KEYS.length) return;
      if (currentStep === 0) return; // chiefComplaint is required

      const fieldKey = QUESTION_KEYS[currentStep];
      updateField(fieldKey, { original: "", korean: "" });

      setChatMessages((prev) => [
        ...prev,
        { type: "user", text: `(${labels.skipButton})` },
      ]);

      setAnsweredCount((c) => c + 1);
      advanceBaseQuestion(currentStep);
    } else if (phase === "followup") {
      if (currentStep >= followUpQuestions.length) return;

      const emptyAnswer = { original: "", korean: "" };
      updateFollowUpAnswer(currentStep, emptyAnswer);

      setChatMessages((prev) => [
        ...prev,
        { type: "user", text: `(${labels.skipButton})` },
      ]);

      setAnsweredCount((c) => c + 1);
      advanceFollowUpQuestion(currentStep, emptyAnswer);
    }
  }, [
    isTranslating,
    phase,
    currentStep,
    followUpQuestions.length,
    updateField,
    updateFollowUpAnswer,
    labels.skipButton,
    advanceBaseQuestion,
    advanceFollowUpQuestion,
  ]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      cancelSpeech();
      resetTranscript();
      prevTranscriptRef.current = "";
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript, cancelSpeech]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComplete = () => {
    router.push(`/${language.code}/summary`);
  };

  const handleSkipToChat = useCallback(() => {
    if (isListening) stopListening();
    cancelSpeech();
    router.push(`/${language.code}/chat`);
  }, [isListening, stopListening, cancelSpeech, router, language.code]);

  const canUseVoice = language.speechSupported && isSupported;

  // Determine if skip is allowed for current question
  const canSkip =
    phase === "followup" || (phase === "preconsultation" && currentStep > 0);

  const showInput = phase === "preconsultation" || phase === "followup";

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-[100dvh]"
      style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}
    >
      {/* Header */}
      <div
        className="relative text-center py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--gh-cloud)" }}
      >
        <h1
          className="text-xl font-extrabold"
          style={{ color: "var(--gh-ink)" }}
        >
          {labels.pageTitle}
        </h1>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--gh-steel)" }}
        >
          {labels.voiceInputHint}
        </p>
        <button
          onClick={handleSkipToChat}
          aria-label="바로 진료 통역 · Skip to live interpretation"
          title="문진 건너뛰고 바로 진료 통역"
          className="absolute top-1/2 right-3 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold transition-colors"
          style={{
            background: "var(--gh-white)",
            color: "var(--gh-blue)",
            border: "1.5px solid var(--gh-blue)",
          }}
        >
          <span className="hidden sm:inline">바로 진료 통역</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {msg.type === "system" && (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1"
                style={{ background: "rgba(22, 86, 224, 0.12)" }}
                aria-hidden
              >
                {/* Speech-cross mini mark */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 4h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2l-2 3-2-3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 2-3z"
                    fill="var(--gh-blue)"
                  />
                </svg>
              </div>
            )}
            <div
              className="max-w-[75%] px-4 py-3"
              style={{
                background:
                  msg.type === "system" ? "var(--gh-bone)" : "var(--gh-blue)",
                color:
                  msg.type === "system" ? "var(--gh-ink)" : "var(--gh-white)",
                borderRadius: "var(--gh-r-md)",
                borderTopLeftRadius:
                  msg.type === "system" ? "var(--gh-r-xs)" : undefined,
                borderTopRightRadius:
                  msg.type === "user" ? "var(--gh-r-xs)" : undefined,
                boxShadow:
                  msg.type === "user"
                    ? "var(--gh-shadow-cta)"
                    : "var(--gh-shadow-sm)",
              }}
            >
              <p className="text-lg whitespace-pre-wrap leading-relaxed">
                {msg.text}
              </p>
              {msg.type === "system" && (
                <button
                  onClick={() => speak(msg.text)}
                  className="mt-2 p-1.5 rounded-full transition-colors inline-flex items-center"
                  style={{ color: "var(--gh-blue)" }}
                  aria-label="Read aloud · 읽어주기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Translating indicator */}
        {(isTranslating || phase === "generating") && (
          <div className="flex justify-start">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1"
              style={{ background: "rgba(22, 86, 224, 0.12)" }}
              aria-hidden
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 4h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2l-2 3-2-3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 2-3z"
                  fill="var(--gh-blue)"
                />
              </svg>
            </div>
            <div
              className="px-4 py-3"
              style={{
                background: "var(--gh-bone)",
                borderRadius: "var(--gh-r-md)",
                borderTopLeftRadius: "var(--gh-r-xs)",
                boxShadow: "var(--gh-shadow-sm)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "var(--gh-steel)", animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "var(--gh-steel)", animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "var(--gh-steel)", animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Voice status */}
      {(isListening || isProcessing) && (
        <div className="px-4 pb-2 shrink-0 flex justify-center">
          {isListening && (
            <span className="gh-live-dot">
              {labels.listeningMessage}
            </span>
          )}
          {!isListening && isProcessing && (
            <span
              className="text-sm animate-pulse"
              style={{ color: "var(--gh-blue)" }}
            >
              {labels.processingVoiceMessage}
            </span>
          )}
        </div>
      )}

      {speechError && (
        <div className="px-4 pb-2 shrink-0">
          <p
            className="text-sm px-3 py-2 text-center"
            style={{
              color: "var(--gh-danger)",
              background: "rgba(215, 38, 61, 0.08)",
              border: "1px solid rgba(215, 38, 61, 0.25)",
              borderRadius: "var(--gh-r-sm)",
            }}
            role="alert"
          >
            ⚠ {speechError}
          </p>
        </div>
      )}

      {/* Input Area or Complete Button */}
      {phase === "complete" ? (
        <div
          className="p-4 shrink-0"
          style={{ borderTop: "1px solid var(--gh-cloud)" }}
        >
          <div className="flex items-center justify-center mb-3">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--gh-blue)" }}
            >
              {answeredCount} / {totalQuestions}
            </span>
          </div>
          <button
            onClick={handleComplete}
            className="w-full font-semibold text-lg rounded-full transition-colors"
            style={{
              height: "var(--gh-tap-comfort)",
              background: "var(--gh-blue)",
              color: "var(--gh-white)",
              boxShadow: "var(--gh-shadow-cta)",
            }}
          >
            {labels.followUpCompleteButton} →
          </button>
        </div>
      ) : showInput ? (
        <div
          className="p-4 shrink-0"
          style={{ borderTop: "1px solid var(--gh-cloud)" }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalQuestions }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width:
                      idx < answeredCount
                        ? 16
                        : idx === answeredCount
                        ? 24
                        : 8,
                    background:
                      idx <= answeredCount
                        ? "var(--gh-blue)"
                        : "var(--gh-cloud)",
                    animation:
                      idx === answeredCount
                        ? "gh-pulse 1.4s ease-in-out infinite"
                        : "none",
                  }}
                />
              ))}
            </div>
            <span
              className="text-xs font-semibold ml-1"
              style={{ color: "var(--gh-steel)" }}
            >
              {answeredCount} / {totalQuestions}
            </span>
          </div>

          <div className="flex gap-2 items-end">
            {canSkip && (
              <button
                onClick={handleSkip}
                disabled={isTranslating}
                className="px-4 h-12 text-sm font-semibold rounded-full transition-colors disabled:opacity-40 shrink-0"
                style={{
                  color: "var(--gh-steel)",
                  background: "var(--gh-white)",
                  border: "1px solid var(--gh-cloud)",
                }}
              >
                {labels.skipButton}
              </button>
            )}

            <KeyboardTextarea
              textareaRef={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
              placeholder={labels.chatInputPlaceholder}
              lang={language.bcp47}
              autoComplete="off"
              autoCorrect="off"
              dir={language.dir}
              rows={1}
              className="gh-input flex-1 resize-none"
              style={{ minHeight: "48px", maxHeight: "120px", paddingTop: 12, paddingBottom: 12 }}
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
              className="px-5 h-12 font-semibold rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: "var(--gh-blue)",
                color: "var(--gh-white)",
                boxShadow: "var(--gh-shadow-cta)",
              }}
            >
              {labels.sendButton}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
