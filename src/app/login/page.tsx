"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // AuthGate handles redirect.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(parseAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gh-bone)" }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm p-6 rounded-2xl space-y-4"
        style={{
          background: "var(--gh-white)",
          boxShadow: "var(--gh-shadow-md)",
        }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "var(--gh-ink)" }}>
          로그인
        </h1>
        <p className="text-sm" style={{ color: "var(--gh-steel)" }}>
          Globalhospital 의료 통역 서비스
        </p>

        <label className="block">
          <span className="text-sm font-semibold">이메일</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full h-11 px-3 rounded-lg border outline-none focus:border-blue-500"
            style={{ borderColor: "var(--gh-cloud)" }}
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">비밀번호</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-11 px-3 rounded-lg border outline-none focus:border-blue-500"
            style={{ borderColor: "var(--gh-cloud)" }}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-lg font-semibold disabled:opacity-60"
          style={{ background: "var(--gh-blue)", color: "var(--gh-white)" }}
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>

        <p className="text-sm text-center" style={{ color: "var(--gh-steel)" }}>
          계정이 없으신가요?{" "}
          <Link href="/signup" style={{ color: "var(--gh-blue)" }}>
            회원가입
          </Link>
        </p>
      </form>
    </main>
  );
}

function parseAuthError(msg: string): string {
  if (msg.includes("invalid-credential") || msg.includes("wrong-password"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (msg.includes("user-not-found"))
    return "등록되지 않은 이메일입니다.";
  if (msg.includes("too-many-requests"))
    return "잠시 후 다시 시도해 주세요.";
  return "로그인에 실패했습니다. 다시 시도해 주세요.";
}
