"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-client";
import type { AppUser, UserStatus } from "@/types/user";

const TABS: { value: "all" | UserStatus; label: string }[] = [
  { value: "approved", label: "승인됨" },
  { value: "rejected", label: "거부됨" },
  { value: "all", label: "전체" },
];

export default function AdminUsersPage() {
  const [tab, setTab] = useState<"all" | UserStatus>("approved");
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetUid, setResetUid] = useState<string | null>(null);

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

  async function deleteUser(uid: string, username: string) {
    if (!confirm(`'${username}' 계정을 영구 삭제하시겠습니까?`)) return;
    setBusyUid(uid);
    try {
      const res = await authedFetch(`/api/admin/users/${uid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "삭제에 실패했습니다.");
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold">회원 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 h-9 rounded-full font-semibold text-sm"
          style={{ background: "var(--gh-blue)", color: "var(--gh-white)" }}
        >
          + 회원 추가
        </button>
      </div>

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
            <ul className="md:hidden divide-y" style={{ borderColor: "var(--gh-cloud)" }}>
              {users.map((u) => (
                <li key={u.uid} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold break-all text-sm">{u.username}</div>
                      {u.displayName && (
                        <div className="text-xs text-gray-500 break-all">{u.displayName}</div>
                      )}
                      {u.hospitalName && (
                        <div className="text-xs text-gray-500 mt-0.5">{u.hospitalName}</div>
                      )}
                    </div>
                    <StatusBadge status={u.status} role={u.role} />
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {new Date(u.createdAt).toLocaleString("ko-KR")}
                  </div>
                  <RowActions
                    user={u}
                    busy={busyUid === u.uid}
                    onApprove={() => updateStatus(u.uid, "approved")}
                    onReject={() => updateStatus(u.uid, "rejected")}
                    onResetPassword={() => setResetUid(u.uid)}
                    onDelete={() => deleteUser(u.uid, u.username)}
                  />
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "var(--gh-bone)" }}>
                  <tr className="text-left">
                    <th className="p-3">아이디</th>
                    <th className="p-3">이름</th>
                    <th className="p-3">소속</th>
                    <th className="p-3">상태</th>
                    <th className="p-3">생성일</th>
                    <th className="p-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid} className="border-t" style={{ borderColor: "var(--gh-cloud)" }}>
                      <td className="p-3 font-semibold">{u.username}</td>
                      <td className="p-3">{u.displayName || "—"}</td>
                      <td className="p-3">{u.hospitalName || "—"}</td>
                      <td className="p-3">
                        <StatusBadge status={u.status} role={u.role} />
                      </td>
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="p-3 text-right">
                        <RowActions
                          user={u}
                          busy={busyUid === u.uid}
                          onApprove={() => updateStatus(u.uid, "approved")}
                          onReject={() => updateStatus(u.uid, "rejected")}
                          onResetPassword={() => setResetUid(u.uid)}
                          onDelete={() => deleteUser(u.uid, u.username)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {resetUid && (
        <ResetPasswordModal
          uid={resetUid}
          username={users?.find((u) => u.uid === resetUid)?.username || ""}
          onClose={() => setResetUid(null)}
        />
      )}
    </div>
  );
}

function RowActions({
  user,
  busy,
  onApprove,
  onReject,
  onResetPassword,
  onDelete,
}: {
  user: AppUser;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const isAdmin = user.role === "admin";
  return (
    <div className="inline-flex flex-wrap gap-2 justify-end">
      {user.status !== "approved" && (
        <ActionButton kind="primary" disabled={busy} onClick={onApprove}>
          승인
        </ActionButton>
      )}
      {user.status !== "rejected" && !isAdmin && (
        <ActionButton kind="danger-outline" disabled={busy} onClick={onReject}>
          비활성화
        </ActionButton>
      )}
      <ActionButton kind="neutral" disabled={busy} onClick={onResetPassword}>
        비밀번호 재설정
      </ActionButton>
      {!isAdmin && (
        <ActionButton kind="danger-outline" disabled={busy} onClick={onDelete}>
          삭제
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  kind,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind: "primary" | "neutral" | "danger-outline";
}) {
  const styles: Record<typeof kind, React.CSSProperties> = {
    primary: { background: "var(--gh-blue)", color: "var(--gh-white)" },
    neutral: {
      background: "var(--gh-white)",
      color: "var(--gh-ink)",
      border: "1px solid var(--gh-cloud)",
    },
    "danger-outline": {
      background: "var(--gh-white)",
      color: "#dc2626",
      border: "1px solid #fecaca",
    },
  };
  return (
    <button
      {...rest}
      className="px-3 h-8 rounded-full text-xs font-semibold disabled:opacity-60"
      style={styles[kind]}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status, role }: { status: string; role: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending: { bg: "#fef3c7", fg: "#92400e", label: "대기" },
    approved: { bg: "#dcfce7", fg: "#166534", label: "사용중" },
    rejected: { bg: "#fee2e2", fg: "#991b1b", label: "비활성" },
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

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          displayName: displayName.trim() || undefined,
          hospitalName: hospitalName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "생성에 실패했습니다.");
        return;
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="회원 추가">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="아이디 * (영문 소문자/숫자/_ 3-20자)">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]{3,20}"
            className="w-full h-11 px-3 rounded-lg border outline-none"
            style={{ borderColor: "var(--gh-cloud)" }}
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
        <Field label="비밀번호 * (6자 이상)">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-11 px-3 rounded-lg border outline-none font-mono"
            style={{ borderColor: "var(--gh-cloud)" }}
          />
        </Field>
        <Field label="이름">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border outline-none"
            style={{ borderColor: "var(--gh-cloud)" }}
          />
        </Field>
        <Field label="소속 병원">
          <input
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border outline-none"
            style={{ borderColor: "var(--gh-cloud)" }}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg font-semibold"
            style={{
              background: "var(--gh-white)",
              border: "1px solid var(--gh-cloud)",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-11 rounded-lg font-semibold disabled:opacity-60"
            style={{ background: "var(--gh-blue)", color: "var(--gh-white)" }}
          >
            {submitting ? "생성 중…" : "생성"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  uid,
  username,
  onClose,
}: {
  uid: string;
  username: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authedFetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "재설정에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`비밀번호 재설정 — ${username}`}>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm">새 비밀번호가 설정되었습니다.</p>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-lg font-semibold"
            style={{ background: "var(--gh-blue)", color: "var(--gh-white)" }}
          >
            확인
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="새 비밀번호 (6자 이상)">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-11 px-3 rounded-lg border outline-none font-mono"
              style={{ borderColor: "var(--gh-cloud)" }}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg font-semibold"
              style={{
                background: "var(--gh-white)",
                border: "1px solid var(--gh-cloud)",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-lg font-semibold disabled:opacity-60"
              style={{ background: "var(--gh-blue)", color: "var(--gh-white)" }}
            >
              {submitting ? "변경 중…" : "변경"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-5 rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
