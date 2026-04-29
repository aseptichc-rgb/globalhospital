"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api-client";
import type { AppUser } from "@/types/user";

interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  byUser: Array<{ uid: string; email: string; calls: number; totalTokens: number }>;
  byRoute: Array<{ route: string; calls: number; totalTokens: number }>;
  byDay: Array<{ date: string; calls: number; totalTokens: number }>;
}

export default function AdminDashboard() {
  const [pending, setPending] = useState<AppUser[] | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersRes, usageRes] = await Promise.all([
          authedFetch("/api/admin/users?status=pending"),
          authedFetch("/api/admin/usage?days=30"),
        ]);
        if (cancelled) return;
        if (!usersRes.ok || !usageRes.ok) {
          setError("데이터를 불러오지 못했습니다.");
          return;
        }
        const usersData = await usersRes.json();
        const usageData = await usageRes.json();
        if (cancelled) return;
        setPending(usersData.users || []);
        setStats(usageData.stats);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">대시보드</h1>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: "#fef2f2", color: "#dc2626" }}
        >
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="승인 대기"
          value={pending?.length ?? "—"}
          href="/admin/users?status=pending"
        />
        <StatCard
          label="30일 호출 수"
          value={stats?.totalCalls?.toLocaleString() ?? "—"}
          href="/admin/usage"
        />
        <StatCard
          label="30일 토큰 합계"
          value={stats?.totalTokens?.toLocaleString() ?? "—"}
          href="/admin/usage"
        />
        <StatCard
          label="입/출력 토큰"
          value={
            stats
              ? `${stats.totalPromptTokens.toLocaleString()} / ${stats.totalCandidatesTokens.toLocaleString()}`
              : "—"
          }
          href="/admin/usage"
        />
      </section>

      <section className="p-4 rounded-2xl bg-white" style={{ boxShadow: "var(--gh-shadow-sm)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">최근 승인 대기</h2>
          <Link
            href="/admin/users?status=pending"
            className="text-sm"
            style={{ color: "var(--gh-blue)" }}
          >
            전체 보기 →
          </Link>
        </div>
        {pending === null ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500">승인 대기 중인 회원이 없습니다.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--gh-cloud)" }}>
            {pending.slice(0, 5).map((u) => (
              <li
                key={u.uid}
                className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
              >
                <span className="min-w-0 break-words">
                  {u.displayName || u.email}
                  <span className="text-gray-500"> · {u.email}</span>
                </span>
                <span className="text-xs text-gray-500 shrink-0">
                  {new Date(u.createdAt).toLocaleString("ko-KR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-2xl bg-white block"
      style={{ boxShadow: "var(--gh-shadow-sm)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "var(--gh-steel)" }}>
        {label}
      </div>
      <div
        className="mt-2 text-xl sm:text-2xl font-bold break-all"
        style={{ color: "var(--gh-ink)" }}
      >
        {value}
      </div>
    </Link>
  );
}
