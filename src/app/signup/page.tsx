"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
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
      await signup(email.trim(), password, {
        displayName: displayName.trim() || undefined,
        hospitalName: hospitalName.trim() || undefined,
      });
      // AuthGate redirects to /pending after profile loads.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(parseSignupError(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
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
          회원가입
        </h1>
        <p className="text-sm" style={{ color: "var(--gh-steel)" }}>
          가입 후 관리자 승인 시 서비스를 이용하실 수 있습니다.
        </p>

        <label className="block">
          <span className="text-sm font-semibold">이메일 *</span>
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
          <span className="text-sm font-semibold">비밀번호 * (6자 이상)</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-11 px-3 rounded-lg border outline-none focus:border-blue-500"
            style={{ borderColor: "var(--gh-cloud)" }}
            autoComplete="new-password"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">이름</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full h-11 px-3 rounded-lg border outline-none focus:border-blue-500"
            style={{ borderColor: "var(--gh-cloud)" }}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">소속 병원</span>
          <input
            type="text"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            className="mt-1 w-full h-11 px-3 rounded-lg border outline-none focus:border-blue-500"
            style={{ borderColor: "var(--gh-cloud)" }}
            autoComplete="organization"
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
          {submitting ? "가입 중…" : "가입하기"}
        </button>

        <p className="text-sm text-center" style={{ color: "var(--gh-steel)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "var(--gh-blue)" }}>
            로그인
          </Link>
        </p>
      </form>
    </main>
  );
}

function parseSignupError(msg: string): string {
  if (msg.includes("email-already-in-use"))
    return "이미 가입된 이메일입니다.";
  if (msg.includes("invalid-email"))
    return "올바른 이메일 형식이 아닙니다.";
  if (msg.includes("weak-password"))
    return "비밀번호는 6자 이상이어야 합니다.";
  return msg || "회원가입에 실패했습니다.";
}
