"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const USERNAME_MIN = 4;
const USERNAME_MAX = 20;
const PASSWORD_MIN = 8;

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; username: string }
  | { kind: "error"; message: string };

export default function HospitalSignupPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function clientValidate(): string | null {
    const u = username.trim().toLowerCase();
    if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
      return `아이디는 ${USERNAME_MIN}~${USERNAME_MAX}자여야 합니다 · Username must be ${USERNAME_MIN}-${USERNAME_MAX} chars`;
    }
    if (!/^[a-z0-9_]+$/.test(u)) {
      return "아이디는 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다 · Lowercase letters, digits, underscore only";
    }
    if (password.length < PASSWORD_MIN) {
      return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다 · Password must be at least ${PASSWORD_MIN} chars`;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "비밀번호는 영문과 숫자를 모두 포함해야 합니다 · Must include both letters and digits";
    }
    if (password !== passwordConfirm) {
      return "비밀번호가 일치하지 않습니다 · Passwords do not match";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status.kind === "submitting") return;

    const clientError = clientValidate();
    if (clientError) {
      setStatus({ kind: "error", message: clientError });
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/hospital/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          displayName: displayName.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        username?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data.error || "회원가입에 실패했습니다 · Signup failed",
        });
        return;
      }

      setStatus({ kind: "success", username: data.username || username });
      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      console.error("signup submit error:", error);
      setStatus({
        kind: "error",
        message: "네트워크 오류가 발생했습니다 · Network error",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-bone" style={{ background: "var(--gh-bone)" }}>
        <div
          className="w-full max-w-md p-8 text-center"
          style={{
            background: "var(--gh-white)",
            borderRadius: "var(--gh-r-lg)",
            boxShadow: "var(--gh-shadow-md)",
          }}
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
            style={{ background: "rgba(26, 174, 124, 0.12)", color: "var(--gh-success)" }}
            aria-hidden
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="gh-h2 mb-2">회원가입 완료</h1>
          <p className="text-sm mb-1" style={{ color: "var(--gh-steel)" }}>
            Account created
          </p>
          <p className="text-base mt-4" style={{ color: "var(--gh-ink)" }}>
            아이디 · ID:{" "}
            <span style={{ fontFamily: "var(--gh-font-num)", fontWeight: 600 }}>
              {status.username}
            </span>
          </p>
          <Link
            href="/"
            className="gh-btn gh-btn-primary gh-btn-lg mt-8"
            style={{ width: "100%" }}
          >
            홈으로 · Home
          </Link>
        </div>
      </main>
    );
  }

  const submitting = status.kind === "submitting";
  const errorMessage = status.kind === "error" ? status.message : null;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--gh-bone)" }}
    >
      <div
        className="w-full max-w-md p-8"
        style={{
          background: "var(--gh-white)",
          borderRadius: "var(--gh-r-lg)",
          boxShadow: "var(--gh-shadow-md)",
        }}
      >
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "var(--gh-white)", boxShadow: "var(--gh-shadow-md)" }}
            aria-hidden
          >
            <img src="/logos/globalhospital-symbol.svg" alt="" width={40} height={40} />
          </div>
          <h1 className="gh-h2 mb-1">병원 직원 회원가입</h1>
          <p className="text-sm" style={{ color: "var(--gh-steel)" }}>
            Hospital staff sign-up
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="아이디"
            sublabel="Username"
            htmlFor="username"
            hint={`${USERNAME_MIN}~${USERNAME_MAX}자, 영문 소문자·숫자·밑줄(_)`}
          >
            <input
              id="username"
              name="username"
              type="text"
              className="gh-input"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              maxLength={USERNAME_MAX}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={submitting}
            />
          </Field>

          <Field
            label="이름 (선택)"
            sublabel="Name (optional)"
            htmlFor="displayName"
          >
            <input
              id="displayName"
              name="displayName"
              type="text"
              className="gh-input"
              autoComplete="name"
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Field
            label="비밀번호"
            sublabel="Password"
            htmlFor="password"
            hint={`${PASSWORD_MIN}자 이상, 영문과 숫자 포함`}
          >
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="gh-input"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "비밀번호 숨기기 · Hide password" : "비밀번호 보기 · Show password"}
                aria-pressed={showPassword}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  color: "var(--gh-steel)",
                  cursor: "pointer",
                }}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M6.2 6.2C3.9 7.7 2.3 10 2 12c1.7 4 6 7 10 7 1.8 0 3.5-.6 5-1.5M9.5 4.6A11 11 0 0112 4c4 0 8.3 3 10 7-.5 1.2-1.3 2.4-2.4 3.4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </Field>

          <Field
            label="비밀번호 확인"
            sublabel="Confirm password"
            htmlFor="passwordConfirm"
          >
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPassword ? "text" : "password"}
              className="gh-input"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              disabled={submitting}
            />
          </Field>

          {errorMessage && (
            <div
              role="alert"
              className="text-sm mb-4 p-3"
              style={{
                background: "rgba(215, 38, 61, 0.08)",
                color: "var(--gh-danger)",
                borderRadius: "var(--gh-r-sm)",
                border: "1px solid rgba(215, 38, 61, 0.2)",
              }}
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="gh-btn gh-btn-primary gh-btn-lg"
            style={{ width: "100%" }}
            disabled={submitting}
          >
            {submitting ? "가입 중… · Creating…" : "회원가입 · Sign up"}
          </button>

          <p className="text-xs text-center mt-5" style={{ color: "var(--gh-steel)" }}>
            기록은 기기에만 저장됩니다 · Records stay on this device
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  sublabel,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  sublabel: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block mb-1.5">
        <span className="text-sm font-semibold" style={{ color: "var(--gh-ink)" }}>
          {label}
        </span>
        <span className="text-xs ml-2" style={{ color: "var(--gh-steel)" }}>
          {sublabel}
        </span>
      </label>
      {children}
      {hint && (
        <p className="text-xs mt-1.5" style={{ color: "var(--gh-steel)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
