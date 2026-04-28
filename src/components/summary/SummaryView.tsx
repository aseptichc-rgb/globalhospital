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
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
          style={{ background: "rgba(52, 212, 176, 0.18)" }}
          aria-hidden
        >
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="var(--gh-mint)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p
          className="text-2xl font-extrabold whitespace-pre-line leading-relaxed mb-12"
          style={{ color: "var(--gh-ink)" }}
          dir={language.dir}
        >
          {labels.handoffMessage}
        </p>
        <button
          onClick={() => setShowSummary(true)}
          className="px-8 font-semibold text-lg rounded-full transition-colors no-print"
          style={{
            height: "var(--gh-tap-comfort)",
            background: "var(--gh-blue)",
            color: "var(--gh-white)",
            boxShadow: "var(--gh-shadow-cta)",
          }}
        >
          결과 확인 · For medical staff
        </button>
      </div>
    );
  }

  // Compact summary for medical staff
  const cardStyle: React.CSSProperties = {
    background: "var(--gh-white)",
    border: "1px solid var(--gh-cloud)",
    borderRadius: "var(--gh-r-md)",
    boxShadow: "var(--gh-shadow-sm)",
  };
  const labelCellStyle: React.CSSProperties = {
    background: "var(--gh-bone)",
    color: "var(--gh-blue)",
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="text-center mb-2">
        <h1
          className="text-lg font-extrabold"
          style={{ color: "var(--gh-ink)" }}
        >
          문진 결과 요약 · Pre-Consultation Summary
        </h1>
        <p className="text-xs" style={{ color: "var(--gh-steel)" }}>
          환자 언어: {language.nameInKorean} ({language.nameInNative})
        </p>
      </div>

      <div className="overflow-hidden" style={cardStyle}>
        <table className="w-full">
          <tbody>
            {FIELD_KEYS.map((key) => {
              const field = formData[key];
              if (!field?.original) return null;
              return (
                <tr
                  key={key}
                  style={{ borderBottom: "1px solid var(--gh-cloud)" }}
                >
                  <td
                    className="px-3 py-2 text-xs font-semibold whitespace-nowrap align-top w-20"
                    style={labelCellStyle}
                  >
                    {KOREAN_LABELS[key]}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-sm"
                      style={{ color: "var(--gh-ink)" }}
                    >
                      {field.korean || field.original}
                    </span>
                    {field.korean && field.original && (
                      <span
                        className="text-xs ml-2"
                        style={{ color: "var(--gh-steel)" }}
                      >
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

      {followUpQuestions.length > 0 && (
        <div className="overflow-hidden" style={cardStyle}>
          <div
            className="px-3 py-2"
            style={{
              background: "var(--gh-bone)",
              borderBottom: "1px solid var(--gh-cloud)",
            }}
          >
            <h2
              className="text-xs font-extrabold uppercase"
              style={{
                color: "var(--gh-blue-deep)",
                letterSpacing: "var(--gh-tracking-label)",
              }}
            >
              추가 질문 답변 · Follow-up
            </h2>
          </div>
          <table className="w-full">
            <tbody>
              {followUpQuestions.map((question, index) => {
                const answer = followUpAnswers[index];
                const koreanQuestion = followUpQuestionsKorean[index] || question;
                const answerText = answer?.korean || answer?.original || "—";
                return (
                  <tr
                    key={index}
                    style={{ borderBottom: "1px solid var(--gh-cloud)" }}
                  >
                    <td
                      className="px-3 py-2 text-xs font-semibold whitespace-nowrap align-top w-20"
                      style={labelCellStyle}
                    >
                      Q{index + 1}
                    </td>
                    <td className="px-3 py-2">
                      <p
                        className="text-xs mb-0.5"
                        style={{ color: "var(--gh-steel)" }}
                      >
                        {koreanQuestion}
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--gh-ink)" }}
                      >
                        {answerText}
                      </p>
                      {answer?.korean && answer?.original && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--gh-steel)" }}
                        >
                          ({answer.original})
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {savedId && (
        <div
          className="px-3 py-2 text-center"
          style={{
            background: "rgba(52, 212, 176, 0.16)",
            border: "1px solid rgba(52, 212, 176, 0.4)",
            borderRadius: "var(--gh-r-md)",
          }}
        >
          <p className="text-xs" style={{ color: "#0E8C68" }}>
            세션 ID:{" "}
            <span className="font-mono font-bold">{savedId}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2 no-print">
        <button
          onClick={handleSave}
          disabled={saving || !!savedId}
          className="flex-1 h-12 font-semibold text-sm rounded-full transition-colors disabled:opacity-40"
          style={{
            background: "var(--gh-mint)",
            color: "var(--gh-ink)",
            boxShadow: "0 8px 24px rgba(52, 212, 176, 0.28)",
          }}
        >
          {saving ? "저장 중…" : savedId ? "저장 완료 ✓" : "저장 · Save"}
        </button>

        <button
          onClick={handlePrint}
          className="flex-1 h-12 font-semibold text-sm rounded-full transition-colors"
          style={{
            background: "var(--gh-white)",
            color: "var(--gh-blue)",
            border: "1.5px solid var(--gh-blue)",
          }}
        >
          인쇄 · Print
        </button>

        <button
          onClick={handleStartChat}
          className="flex-1 h-12 font-semibold text-sm rounded-full transition-colors"
          style={{
            background: "var(--gh-blue)",
            color: "var(--gh-white)",
            boxShadow: "var(--gh-shadow-cta)",
          }}
        >
          통역 시작
        </button>
      </div>

      <div className="no-print">
        <button
          onClick={() => router.push("/history")}
          className="w-full h-11 font-semibold text-sm rounded-full flex items-center justify-center gap-2 transition-colors"
          style={{
            color: "var(--gh-steel)",
            background: "var(--gh-white)",
            border: "1px solid var(--gh-cloud)",
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          저장된 문진 보기 · History
        </button>
      </div>
    </div>
  );
}
