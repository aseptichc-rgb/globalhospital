"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { FIELD_KEYS } from "@/config/medical-fields";
import { LanguageConfig } from "@/types/language";

interface SummaryViewProps {
  language: LanguageConfig;
}

const CHART_LABELS: Record<string, string> = {
  chiefComplaint: "주증상",
  pastMedicalHistory: "과거력",
  surgicalHistory: "수술력",
  currentMedications: "현재 복용 약물",
  otherInfo: "기타 특이사항",
};

function deriveQuestionLabel(question: string, index: number): string {
  const q = question.toLowerCase();
  if (q.includes("when did") || q.includes("how long") || q.includes("start") || q.includes("duration")) {
    return "발병 시기 및 지속 기간";
  }
  if (q.includes("scale") || q.includes("rate your") || q.includes("0 to 10") || q.includes("severity") || q.includes("intense")) {
    return "통증 강도";
  }
  if (q.includes("other symptom") || q.includes("nausea") || q.includes("vomiting") || q.includes("fever") || q.includes("associated")) {
    return "동반 증상";
  }
  if (q.includes("better") || q.includes("worse") || q.includes("trigger") || q.includes("relief") || q.includes("aggravat") || q.includes("reliev")) {
    return "악화 / 완화 요인";
  }
  if (q.includes("medical history") || q.includes("diagnosis") || q.includes("condition") || q.includes("disease")) {
    return "관련 과거력";
  }
  if (q.includes("medication") || q.includes("taking") || q.includes("drug")) {
    return "복용 중인 약물";
  }
  if (q.includes("allerg")) {
    return "알레르기";
  }
  if (q.includes("blood") || q.includes("stool") || q.includes("urine")) {
    return "배설 관련 증상";
  }
  return `추가 문진 ${index + 1}`;
}

export default function SummaryView({ language }: SummaryViewProps) {
  const router = useRouter();
  const { formData, followUpQuestions, followUpAnswers, setSessionId } =
    useConsultationStore();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const followUpQA = followUpQuestions.map((q, i) => ({
        question: { original: q, korean: "" },
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
  const handleStartChat = () => router.push(`/${language.code}/chat`);

  const hasFollowUp = followUpQuestions.length > 0;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="text-center mb-2">
        <h1 className="text-xl font-bold text-gray-900">환자 문진 요약</h1>
        <p className="text-xs text-gray-400 mt-1">
          {language.nameInEnglish} · {new Date().toLocaleDateString("ko-KR")}
        </p>
      </div>

      {/* Basic Info Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">기본 문진</span>
        </div>
        <div className="divide-y divide-gray-50">
          {FIELD_KEYS.map((key) => {
            const field = formData[key];
            const value = field?.korean || field?.original;
            if (!value) return null;
            return (
              <div key={key} className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 w-28 shrink-0 pt-0.5">
                  {CHART_LABELS[key]}
                </span>
                <span className="text-sm font-medium text-gray-900 leading-snug">
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Follow-up Q&A */}
      {hasFollowUp && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">추가 문진</span>
          </div>
          <div className="divide-y divide-gray-50">
            {followUpQuestions.map((question, index) => {
              const answer = followUpAnswers[index];
              const koreanAnswer = answer?.korean || answer?.original;
              if (!koreanAnswer) return null;
              const label = deriveQuestionLabel(question, index);
              return (
                <div key={index} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 w-28 shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-gray-900 leading-snug">
                    {koreanAnswer}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved Session ID */}
      {savedId && (
        <div className="bg-green-50 px-4 py-3 rounded-xl border border-green-200 text-center">
          <p className="text-xs text-green-600">
            저장 완료 · Session ID:{" "}
            <span className="font-mono font-bold">{savedId}</span>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 no-print pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !!savedId}
          className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          {saving ? "저장 중..." : savedId ? "저장됨" : "DB에 저장"}
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
