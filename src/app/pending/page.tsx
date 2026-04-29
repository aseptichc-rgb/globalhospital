"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export default function PendingPage() {
  const { profile, logout, refreshProfile } = useAuth();

  const isRejected = profile?.status === "rejected";

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gh-bone)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl text-center space-y-5"
        style={{
          background: "var(--gh-white)",
          boxShadow: "var(--gh-shadow-md)",
        }}
      >
        <div className="text-5xl">{isRejected ? "🚫" : "⏳"}</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--gh-ink)" }}>
          {isRejected ? "가입이 거부되었습니다" : "승인 대기 중"}
        </h1>
        <p className="text-sm" style={{ color: "var(--gh-steel)" }}>
          {isRejected
            ? "관리자가 가입 요청을 거부했습니다. 자세한 내용은 관리자에게 문의해 주세요."
            : "관리자의 승인을 기다리고 있습니다. 승인이 완료되면 서비스를 이용하실 수 있습니다."}
        </p>
        {profile?.email && (
          <p className="text-xs" style={{ color: "var(--gh-steel)" }}>
            계정: {profile.email}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-3">
          {!isRejected && (
            <button
              onClick={refreshProfile}
              className="w-full h-11 rounded-lg font-semibold"
              style={{
                background: "var(--gh-blue)",
                color: "var(--gh-white)",
              }}
            >
              승인 상태 새로고침
            </button>
          )}
          <button
            onClick={logout}
            className="w-full h-11 rounded-lg font-semibold"
            style={{
              background: "var(--gh-white)",
              color: "var(--gh-blue)",
              border: "1.5px solid var(--gh-blue)",
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </main>
  );
}
