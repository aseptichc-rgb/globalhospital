"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConsultationSession } from "@/types/consultation";
import { ALL_LANGUAGES } from "@/config/languages";

const KOREAN_LABELS: Record<string, string> = {
  chiefComplaint: "주증상",
  pastMedicalHistory: "과거력",
  surgicalHistory: "수술력",
  currentMedications: "현재 복용 약물",
  otherInfo: "기타 특이사항",
};

const FIELD_KEYS = [
  "chiefComplaint",
  "pastMedicalHistory",
  "surgicalHistory",
  "currentMedications",
  "otherInfo",
] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLanguageFlag(code: string) {
  const lang = ALL_LANGUAGES.find((l) => l.code === code);
  return lang ? `${lang.flagEmoji} ${lang.nameInKorean}` : code;
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
        } else {
          setError("데이터를 불러올 수 없습니다.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-gray-500">문진 기록을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-white rounded-xl"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문진 기록</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {sessions.length}건의 문진 기록
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          홈으로
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-lg">저장된 문진 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id;
            const chiefComplaint =
              session.formData?.chiefComplaint?.korean ||
              session.formData?.chiefComplaint?.original ||
              "-";

            return (
              <div
                key={session.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Summary Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                        {getLanguageFlag(session.languageCode)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {chiefComplaint}
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    {/* Form Data */}
                    <div className="mt-4 space-y-3">
                      {FIELD_KEYS.map((key) => {
                        const field = session.formData?.[key];
                        if (!field?.original && !field?.korean) return null;
                        return (
                          <div key={key} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs font-semibold text-blue-600 mb-1">
                              {KOREAN_LABELS[key]}
                            </p>
                            <p className="text-sm text-gray-800">
                              {field.korean || field.original || "-"}
                            </p>
                            {field.korean && field.original && field.korean !== field.original && (
                              <p className="text-xs text-gray-400 mt-1">
                                ({field.original})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Follow-up Q&A */}
                    {session.followUpQA && session.followUpQA.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">
                          추가 질문 답변
                        </h3>
                        <div className="space-y-3">
                          {session.followUpQA.map((qa, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-blue-600 mb-1">
                                Q{idx + 1}: {qa.question.korean || qa.question.original}
                              </p>
                              {qa.question.korean && qa.question.original && qa.question.korean !== qa.question.original && (
                                <p className="text-xs text-gray-400 mb-1">
                                  ({qa.question.original})
                                </p>
                              )}
                              <p className="text-sm text-gray-800">
                                {qa.answer.korean || qa.answer.original || "-"}
                              </p>
                              {qa.answer.korean && qa.answer.original && qa.answer.korean !== qa.answer.original && (
                                <p className="text-xs text-gray-400 mt-1">
                                  ({qa.answer.original})
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Session ID */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Session ID: <span className="font-mono">{session.id}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
