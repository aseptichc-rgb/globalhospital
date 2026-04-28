"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConsultationSession } from "@/types/consultation";
import { ALL_LANGUAGES } from "@/config/languages";

const KOREAN_LABELS: Record<string, string> = {
  chiefComplaint: "주증상",
  pastMedicalHistory: "과거력",
  surgicalHistory: "수술력",
  currentMedications: "복용 약물",
  otherInfo: "기타",
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
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--gh-bone)" }}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ background: "var(--gh-blue)", animationDelay: "0ms" }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ background: "var(--gh-blue)", animationDelay: "150ms" }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ background: "var(--gh-blue)", animationDelay: "300ms" }}
            />
          </div>
          <p className="text-sm" style={{ color: "var(--gh-steel)" }}>
            문진 기록을 불러오는 중… · Loading history…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--gh-bone)" }}
      >
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--gh-danger)" }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 h-12 rounded-full font-semibold"
            style={{
              background: "var(--gh-blue)",
              color: "var(--gh-white)",
              boxShadow: "var(--gh-shadow-cta)",
            }}
          >
            다시 시도 · Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto"
      style={{ background: "var(--gh-bone)" }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-extrabold"
            style={{ color: "var(--gh-ink)" }}
          >
            문진 기록 · History
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--gh-steel)" }}
          >
            총 {sessions.length}건 · {sessions.length} sessions
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 h-10 text-sm font-semibold rounded-full transition-colors"
          style={{
            color: "var(--gh-steel)",
            background: "var(--gh-white)",
            border: "1px solid var(--gh-cloud)",
          }}
        >
          홈 · Home
        </button>
      </div>

      {sessions.length === 0 ? (
        <div
          className="text-center py-20"
          style={{ color: "var(--gh-steel)" }}
        >
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="var(--gh-cloud)"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">저장된 문진 기록이 없습니다</p>
          <p className="text-sm mt-1">No saved sessions yet</p>
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
                className="overflow-hidden"
                style={{
                  background: "var(--gh-white)",
                  border: "1px solid var(--gh-cloud)",
                  borderRadius: "var(--gh-r-md)",
                  boxShadow: "var(--gh-shadow-sm)",
                }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "rgba(22, 86, 224, 0.12)",
                          color: "var(--gh-blue)",
                        }}
                      >
                        {getLanguageFlag(session.languageCode)}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--gh-steel)" }}
                      >
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--gh-ink)" }}
                    >
                      {chiefComplaint}
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="var(--gh-steel)"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--gh-cloud)" }}>
                    <table className="w-full">
                      <tbody>
                        {FIELD_KEYS.map((key) => {
                          const field = session.formData?.[key];
                          if (!field?.original && !field?.korean) return null;
                          return (
                            <tr
                              key={key}
                              style={{ borderBottom: "1px solid var(--gh-cloud)" }}
                            >
                              <td
                                className="px-4 py-2 text-xs font-semibold whitespace-nowrap align-top w-20"
                                style={{
                                  background: "var(--gh-bone)",
                                  color: "var(--gh-blue)",
                                }}
                              >
                                {KOREAN_LABELS[key]}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className="text-sm"
                                  style={{ color: "var(--gh-ink)" }}
                                >
                                  {field.korean || field.original || "—"}
                                </span>
                                {field.korean && field.original && field.korean !== field.original && (
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

                    {session.followUpQA && session.followUpQA.length > 0 && (
                      <>
                        <div
                          className="px-4 py-1.5"
                          style={{
                            background: "var(--gh-bone)",
                            borderTop: "1px solid var(--gh-cloud)",
                            borderBottom: "1px solid var(--gh-cloud)",
                          }}
                        >
                          <h3
                            className="text-xs font-extrabold uppercase"
                            style={{
                              color: "var(--gh-steel)",
                              letterSpacing: "var(--gh-tracking-label)",
                            }}
                          >
                            추가 질문 · Follow-up
                          </h3>
                        </div>
                        <table className="w-full">
                          <tbody>
                            {session.followUpQA.map((qa, idx) => (
                              <tr
                                key={idx}
                                style={{ borderBottom: "1px solid var(--gh-cloud)" }}
                              >
                                <td
                                  className="px-4 py-2 text-xs font-semibold whitespace-nowrap align-top w-20"
                                  style={{
                                    background: "var(--gh-bone)",
                                    color: "var(--gh-blue)",
                                  }}
                                >
                                  Q{idx + 1}
                                </td>
                                <td className="px-3 py-2">
                                  <p
                                    className="text-xs mb-0.5"
                                    style={{ color: "var(--gh-steel)" }}
                                  >
                                    {qa.question.korean || qa.question.original}
                                  </p>
                                  <p
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--gh-ink)" }}
                                  >
                                    {qa.answer.korean || qa.answer.original || "—"}
                                  </p>
                                  {qa.answer.korean && qa.answer.original && qa.answer.korean !== qa.answer.original && (
                                    <p
                                      className="text-xs"
                                      style={{ color: "var(--gh-steel)" }}
                                    >
                                      ({qa.answer.original})
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}

                    <div
                      className="px-4 py-2"
                      style={{
                        background: "var(--gh-bone)",
                        borderTop: "1px solid var(--gh-cloud)",
                      }}
                    >
                      <p
                        className="text-xs"
                        style={{ color: "var(--gh-steel)" }}
                      >
                        ID: <span className="font-mono">{session.id}</span>
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
