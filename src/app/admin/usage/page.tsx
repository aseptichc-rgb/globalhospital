"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-client";

interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  byUser: Array<{ uid: string; username: string; calls: number; totalTokens: number }>;
  byRoute: Array<{ route: string; calls: number; totalTokens: number }>;
  byDay: Array<{ date: string; calls: number; totalTokens: number }>;
  recent: Array<{
    id: string;
    username: string;
    route: string;
    model: string;
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    createdAt: string;
  }>;
}

const PERIODS = [
  { value: 1, label: "오늘" },
  { value: 7, label: "7일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
];

export default function AdminUsagePage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setError(null);
    (async () => {
      try {
        const res = await authedFetch(`/api/admin/usage?days=${days}`);
        if (cancelled) return;
        if (!res.ok) {
          setError("사용량 데이터를 불러오지 못했습니다.");
          return;
        }
        const data = await res.json();
        if (!cancelled) setStats(data.stats);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const maxDayTokens = Math.max(1, ...(stats?.byDay.map((d) => d.totalTokens) || [0]));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Gemini API 사용량</h1>
        <div className="flex gap-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className="px-3 h-8 rounded-full text-xs font-semibold shrink-0"
              style={{
                background: days === p.value ? "var(--gh-blue)" : "var(--gh-white)",
                color: days === p.value ? "var(--gh-white)" : "var(--gh-ink)",
                border: "1px solid var(--gh-cloud)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "#fef2f2", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {!stats ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Stat label="총 호출 수" value={stats.totalCalls.toLocaleString()} />
            <Stat label="총 토큰" value={stats.totalTokens.toLocaleString()} />
            <Stat label="입력 토큰" value={stats.totalPromptTokens.toLocaleString()} />
            <Stat label="출력 토큰" value={stats.totalCandidatesTokens.toLocaleString()} />
          </section>

          <Card title="일자별 토큰 사용량">
            {stats.byDay.length === 0 ? (
              <p className="text-sm text-gray-500">데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.byDay.map((d) => (
                  <li key={d.date} className="flex items-center gap-2 sm:gap-3 text-xs">
                    <span className="w-16 sm:w-24 shrink-0 text-gray-500 truncate">
                      {d.date}
                    </span>
                    <div
                      className="flex-1 h-4 rounded overflow-hidden min-w-0"
                      style={{ background: "var(--gh-bone)" }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${(d.totalTokens / maxDayTokens) * 100}%`,
                          background: "var(--gh-blue)",
                        }}
                      />
                    </div>
                    <span className="w-24 sm:w-32 shrink-0 text-right tabular-nums">
                      {d.totalTokens.toLocaleString()}
                      <span className="hidden sm:inline"> ({d.calls}건)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <Card title="사용자별">
              <Table
                rows={stats.byUser}
                cols={[
                  { header: "아이디", render: (r) => r.username },
                  { header: "호출", render: (r) => r.calls.toLocaleString(), align: "right" },
                  { header: "토큰", render: (r) => r.totalTokens.toLocaleString(), align: "right" },
                ]}
                emptyText="사용자 데이터가 없습니다."
              />
            </Card>

            <Card title="API 라우트별">
              <Table
                rows={stats.byRoute}
                cols={[
                  { header: "라우트", render: (r) => r.route },
                  { header: "호출", render: (r) => r.calls.toLocaleString(), align: "right" },
                  { header: "토큰", render: (r) => r.totalTokens.toLocaleString(), align: "right" },
                ]}
                emptyText="라우트 데이터가 없습니다."
              />
            </Card>
          </div>

          <Card title="최근 호출">
            <Table
              rows={stats.recent}
              cols={[
                {
                  header: "시각",
                  render: (r) => new Date(r.createdAt).toLocaleString("ko-KR"),
                },
                { header: "사용자", render: (r) => r.username },
                { header: "라우트", render: (r) => r.route },
                { header: "모델", render: (r) => r.model },
                {
                  header: "토큰 (입/출/합)",
                  render: (r) =>
                    `${r.promptTokens} / ${r.candidatesTokens} / ${r.totalTokens}`,
                  align: "right",
                },
              ]}
              emptyText="최근 호출이 없습니다."
            />
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white" style={{ boxShadow: "var(--gh-shadow-sm)" }}>
      <div className="text-xs font-semibold" style={{ color: "var(--gh-steel)" }}>
        {label}
      </div>
      <div
        className="mt-2 text-xl sm:text-2xl font-bold break-all"
        style={{ color: "var(--gh-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-4 rounded-2xl bg-white" style={{ boxShadow: "var(--gh-shadow-sm)" }}>
      <h2 className="font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

interface Col<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

function Table<T>({
  rows,
  cols,
  emptyText,
}: {
  rows: T[];
  cols: Col<T>[];
  emptyText: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{emptyText}</p>;
  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto">
      <table className="w-full text-sm min-w-max">
        <thead style={{ background: "var(--gh-bone)" }}>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                className="p-2 whitespace-nowrap"
                style={{ textAlign: c.align || "left" }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t" style={{ borderColor: "var(--gh-cloud)" }}>
              {cols.map((c, j) => (
                <td
                  key={j}
                  className="p-2 whitespace-nowrap"
                  style={{ textAlign: c.align || "left" }}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
