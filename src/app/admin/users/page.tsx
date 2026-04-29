"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-client";
import type { AppUser, UserStatus } from "@/types/user";

const TABS: { value: "all" | UserStatus; label: string }[] = [
  { value: "pending", label: "승인 대기" },
  { value: "approved", label: "승인됨" },
  { value: "rejected", label: "거부됨" },
  { value: "all", label: "전체" },
];

export default function AdminUsersPage() {
  const [tab, setTab] = useState<"all" | UserStatus>("pending");
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setUsers(null);
    try {
      const qs = tab === "all" ? "" : `?status=${tab}`;
      const res = await authedFetch(`/api/admin/users${qs}`);
      if (!res.ok) {
        setError("회원 목록을 불러오지 못했습니다.");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(uid: string, status: UserStatus) {
    setBusyUid(uid);
    try {
      const res = await authedFetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError("상태 변경에 실패했습니다.");
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">회원 관리</h1>

      <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="px-3 h-9 rounded-full text-sm font-semibold shrink-0"
            style={{
              background: tab === t.value ? "var(--gh-blue)" : "var(--gh-white)",
              color: tab === t.value ? "var(--gh-white)" : "var(--gh-ink)",
              border: "1px solid var(--gh-cloud)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: "#fef2f2", color: "#dc2626" }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: "var(--gh-shadow-sm)" }}
      >
        {users === null ? (
          <p className="p-4 text-sm text-gray-500">불러오는 중…</p>
        ) : users.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">표시할 회원이 없습니다.</p>
        ) : (
          <>
            {/* Mobile card list */}
            <ul
              className="md:hidden divide-y"
              style={{ borderColor: "var(--gh-cloud)" }}
            >
              {users.map((u) => (
                <li key={u.uid} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold break-all text-sm">
                        {u.displayName || u.email}
                      </div>
                      {u.displayName && (
                        <div className="text-xs text-gray-500 break-all">
                          {u.email}
                        </div>
                      )}
                      {u.hospitalName && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {u.hospitalName}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={u.status} role={u.role} />
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {new Date(u.createdAt).toLocaleString("ko-KR")}
                  </div>
                  <div className="flex gap-2">
                    {u.status !== "approved" && (
                      <button
                        disabled={busyUid === u.uid}
                        onClick={() => updateStatus(u.uid, "approved")}
                        className="flex-1 h-9 rounded-full text-xs font-semibold disabled:opacity-60"
                        style={{
                          background: "var(--gh-blue)",
                          color: "var(--gh-white)",
                        }}
                      >
                        승인
                      </button>
                    )}
                    {u.status !== "rejected" && u.role !== "admin" && (
                      <button
                        disabled={busyUid === u.uid}
                        onClick={() => updateStatus(u.uid, "rejected")}
                        className="flex-1 h-9 rounded-full text-xs font-semibold disabled:opacity-60"
                        style={{
                          background: "var(--gh-white)",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                        }}
                      >
                        거부
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "var(--gh-bone)" }}>
                  <tr className="text-left">
                    <th className="p-3">이메일</th>
                    <th className="p-3">이름</th>
                    <th className="p-3">소속</th>
                    <th className="p-3">상태</th>
                    <th className="p-3">가입일</th>
                    <th className="p-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.uid}
                      className="border-t"
                      style={{ borderColor: "var(--gh-cloud)" }}
                    >
                      <td className="p-3 break-all">{u.email}</td>
                      <td className="p-3">{u.displayName || "—"}</td>
                      <td className="p-3">{u.hospitalName || "—"}</td>
                      <td className="p-3">
                        <StatusBadge status={u.status} role={u.role} />
                      </td>
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          {u.status !== "approved" && (
                            <button
                              disabled={busyUid === u.uid}
                              onClick={() => updateStatus(u.uid, "approved")}
                              className="px-3 h-8 rounded-full text-xs font-semibold disabled:opacity-60"
                              style={{
                                background: "var(--gh-blue)",
                                color: "var(--gh-white)",
                              }}
                            >
                              승인
                            </button>
                          )}
                          {u.status !== "rejected" && u.role !== "admin" && (
                            <button
                              disabled={busyUid === u.uid}
                              onClick={() => updateStatus(u.uid, "rejected")}
                              className="px-3 h-8 rounded-full text-xs font-semibold disabled:opacity-60"
                              style={{
                                background: "var(--gh-white)",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                              }}
                            >
                              거부
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, role }: { status: string; role: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending: { bg: "#fef3c7", fg: "#92400e", label: "대기" },
    approved: { bg: "#dcfce7", fg: "#166534", label: "승인" },
    rejected: { bg: "#fee2e2", fg: "#991b1b", label: "거부" },
  };
  const s = map[status] || { bg: "#e5e7eb", fg: "#374151", label: status };
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: s.bg, color: s.fg }}
      >
        {s.label}
      </span>
      {role === "admin" && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: "#dbeafe", color: "#1e40af" }}
        >
          관리자
        </span>
      )}
    </span>
  );
}
