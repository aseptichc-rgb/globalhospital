"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import VoiceInput from "@/components/consultation/VoiceInput";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { LanguageConfig } from "@/types/language";
import { MEDICAL_LABELS } from "@/config/medical-fields";

interface FollowUpQuestionsProps {
  language: LanguageConfig;
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels = MEDICAL_LABELS[language.code];

  useEffect(() => {
    if (followUpQuestions.length > 0) return;
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
          setFollowUpQuestions(data.questions);
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

  const handleAnswerChange = useCallback(
    (index: number, value: string) => {
      updateFollowUpAnswer(index, {
        original: value,
        korean: followUpAnswers[index]?.korean || "",
      });

      // Debounce translation
      const timer = setTimeout(async () => {
        if (!value.trim()) return;
        try {
          const res = await fetch("/api/gemini/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: value,
              sourceLang: language.geminiLangName,
              targetLang: "Korean",
            }),
          });
          const data = await res.json();
          if (data.translatedText) {
            updateFollowUpAnswer(index, {
              original: value,
              korean: data.translatedText,
            });
          }
        } catch (err) {
          console.error("Translation error:", err);
        }
      }, 800);

      return () => clearTimeout(timer);
    },
    [followUpAnswers, language.geminiLangName, updateFollowUpAnswer]
  );

  const handleNext = () => {
    router.push(`/${language.code}/summary`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">
          AI Follow-up Questions
        </h1>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl border border-gray-100 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-white rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Additional Questions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {labels.voiceInputHint}
        </p>
      </div>

      {followUpQuestions.map((question, index) => (
        <div
          key={index}
          className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"
        >
          <p className="text-sm font-semibold text-primary mb-1">
            Q{index + 1}
          </p>
          <p className="text-gray-800 mb-4">{question}</p>
          <VoiceInput
            value={followUpAnswers[index]?.original || ""}
            onChange={(val) => handleAnswerChange(index, val)}
            placeholder=""
            bcp47={language.bcp47}
            speechSupported={language.speechSupported}
            label=""
          />
        </div>
      ))}

      {followUpQuestions.length > 0 && (
        <button
          onClick={handleNext}
          className="w-full py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary-dark transition-colors"
        >
          {labels.nextButton} →
        </button>
      )}
    </div>
  );
}
