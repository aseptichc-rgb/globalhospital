"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { FIELD_KEYS } from "@/config/medical-fields";
import { LanguageConfig } from "@/types/language";

interface SummaryViewProps {
  language: LanguageConfig;
}

const KOREAN_LABELS: Record<string, string> = {
  chiefComplaint: "주증상",
  pastMedicalHistory: "과거력",
  surgicalHistory: "수술력",
  currentMedications: "현재 복용 약물",
  otherInfo: "기타 특이사항",
};

export default function SummaryView({ language }: SummaryViewProps) {
  const router = useRouter();
  const {
    formData,
    followUpQuestions,
    followUpQuestionsKorean,
    followUpAnswers,
    setSessionId,
  } = useConsultationStore();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const followUpQA = followUpQuestions.map((q, i) => ({
        question: {
          original: q,
          korean: followUpQuestionsKorean[i] || "",
        },
        answer: followUpAnswers[i] || { original: "", korean: "" },
      }));

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageCode: language.code,
          languageName: language.nameInEnglish,
          formData,
          followUpQA,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setSavedId(data.sessionId);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const handleStartChat = () => {
    router.push(`/${language.code}/chat`);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">결과 요약</h1>
        <p className="text-sm text-gray-500 mt-1">
          환자 언어: {language.nameInNative}
        </p>
      </div>

      {/* Form Data Sections */}
      {FIELD_KEYS.map((key) => {
        const field = formData[key];
        if (!field?.original) return null;
        return (
          <div
            key={key}
            className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"
          >
            <p className="text-xs font-semibold text-blue-600 mb-2">
              {KOREAN_LABELS[key]}
            </p>
            <p className="text-sm text-gray-800">
              {field.korean || field.original}
            </p>
            {field.korean && field.original && (
              <p className="text-xs text-gray-400 mt-2">
                ({language.nameInNative}) {field.original}
              </p>
            )}
          </div>
        );
      })}

      {/* Follow-up Q&A */}
      {followUpQuestions.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            추가 질문 답변
          </h2>
          <div className="space-y-4">
            {followUpQuestions.map((question, index) => {
              const answer = followUpAnswers[index];
              const koreanQuestion =
                followUpQuestionsKorean[index] || question;
              return (
                <div
                  key={index}
                  className="border-b border-gray-50 pb-4 last:border-0"
                >
                  <p className="text-sm font-semibold text-primary mb-1">
                    Q{index + 1}: {koreanQuestion}
                  </p>
                  {koreanQuestion !== question && (
                    <p className="text-xs text-gray-400 mb-2">
                      ({language.nameInNative}) {question}
                    </p>
                  )}
                  {answer && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-blue-600 mb-1">
                        답변
                      </p>
                      <p className="text-sm text-gray-800">
                        {answer.korean || answer.original || "-"}
                      </p>
                      {answer.korean && answer.original && (
                        <p className="text-xs text-gray-400 mt-1">
                          ({language.nameInNative}) {answer.original}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved Session ID */}
      {savedId && (
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
          <p className="text-sm text-green-700">
            세션 ID: <span className="font-mono font-bold">{savedId}</span>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 no-print">
        <button
          onClick={handleSave}
          disabled={saving || !!savedId}
          className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          {saving ? "저장 중..." : savedId ? "저장 완료" : "데이터베이스에 저장"}
        </button>

        <button
          onClick={handlePrint}
          className="w-full py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          인쇄
        </button>

        <button
          onClick={handleStartChat}
          className="w-full py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary-dark transition-colors"
        >
          통역 시작 →
        </button>
      </div>
    </div>
  );
}
