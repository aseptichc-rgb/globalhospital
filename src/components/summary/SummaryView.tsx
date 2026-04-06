"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { FIELD_KEYS, getMedicalLabels } from "@/config/medical-fields";
import { LanguageConfig } from "@/types/language";

interface SummaryViewProps {
  language: LanguageConfig;
}

const KOREAN_LABELS: Record<string, string> = {
  chiefComplaint: "주증상",
  pastMedicalHistory: "과거력",
  surgicalHistory: "수술력",
  currentMedications: "복용 약물",
  otherInfo: "기타",
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
  const labels = getMedicalLabels(language.code);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

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

  // Handoff screen for patient
  if (!showSummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p
          className="text-2xl font-bold text-gray-800 whitespace-pre-line leading-relaxed mb-12"
          dir={language.dir}
        >
          {labels.handoffMessage}
        </p>
        <button
          onClick={() => setShowSummary(true)}
          className="px-8 py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary-dark transition-colors no-print"
        >
          결과 확인 (의료진 전용)
        </button>
      </div>
    );
  }

  // Compact summary for medical staff
  return (
    <div className="space-y-3 text-sm">
      {/* Title */}
      <div className="text-center mb-2">
        <h1 className="text-lg font-bold text-gray-900">결과 요약</h1>
        <p className="text-xs text-gray-400">
          환자 언어: {language.nameInKorean} ({language.nameInNative})
        </p>
      </div>

      {/* Compact table for base fields */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <tbody>
            {FIELD_KEYS.map((key) => {
              const field = formData[key];
              if (!field?.original) return null;
              return (
                <tr key={key} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 text-xs font-semibold text-blue-600 whitespace-nowrap align-top w-20 bg-gray-50/50">
                    {KOREAN_LABELS[key]}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-sm text-gray-800">
                      {field.korean || field.original}
                    </span>
                    {field.korean && field.original && (
                      <span className="text-xs text-gray-400 ml-2">
                        ({field.original})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Follow-up Q&A - compact */}
      {followUpQuestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-700">추가 질문 답변</h2>
          </div>
          <table className="w-full">
            <tbody>
              {followUpQuestions.map((question, index) => {
                const answer = followUpAnswers[index];
                const koreanQuestion = followUpQuestionsKorean[index] || question;
                const answerText = answer?.korean || answer?.original || "-";
                return (
                  <tr key={index} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-xs font-semibold text-primary whitespace-nowrap align-top w-20 bg-gray-50/50">
                      Q{index + 1}
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-xs text-gray-500 mb-0.5">{koreanQuestion}</p>
                      <p className="text-sm text-gray-800 font-medium">{answerText}</p>
                      {answer?.korean && answer?.original && (
                        <p className="text-xs text-gray-400">({answer.original})</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Saved Session ID */}
      {savedId && (
        <div className="bg-green-50 px-3 py-2 rounded-xl border border-green-200 text-center">
          <p className="text-xs text-green-700">
            세션 ID: <span className="font-mono font-bold">{savedId}</span>
          </p>
        </div>
      )}

      {/* Action Buttons - compact row */}
      <div className="flex gap-2 no-print">
        <button
          onClick={handleSave}
          disabled={saving || !!savedId}
          className="flex-1 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          {saving ? "저장 중..." : savedId ? "저장 완료" : "저장"}
        </button>

        <button
          onClick={handlePrint}
          className="flex-1 py-2.5 bg-gray-600 text-white font-semibold text-sm rounded-xl hover:bg-gray-700 transition-colors"
        >
          인쇄
        </button>

        <button
          onClick={handleStartChat}
          className="flex-1 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-dark transition-colors"
        >
          통역 시작
        </button>
      </div>

      <div className="no-print">
        <button
          onClick={() => router.push("/history")}
          className="w-full py-2.5 text-gray-600 font-medium text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          저장된 문진 보기
        </button>
      </div>
    </div>
  );
}
