"use client";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--gh-bone)" }}
    >
      <div
        className="text-center max-w-sm p-8"
        style={{
          background: "var(--gh-white)",
          border: "1px solid var(--gh-cloud)",
          borderRadius: "var(--gh-r-lg)",
          boxShadow: "var(--gh-shadow-md)",
        }}
      >
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--gh-bone)" }}
          aria-hidden
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="var(--gh-blue)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
        </div>
        <h1
          className="text-2xl font-extrabold mb-2"
          style={{ color: "var(--gh-ink)" }}
        >
          오프라인 상태입니다
        </h1>
        <p
          className="text-sm mb-1"
          style={{ color: "var(--gh-steel)" }}
        >
          You appear to be offline.
        </p>
        <p
          className="mb-6 text-base"
          style={{ color: "var(--gh-ink)" }}
        >
          인터넷 연결을 확인한 후 다시 시도해 주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 font-semibold rounded-full transition-colors"
          style={{
            height: "var(--gh-tap-comfort)",
            background: "var(--gh-blue)",
            color: "var(--gh-white)",
            boxShadow: "var(--gh-shadow-cta)",
          }}
        >
          다시 시도 · Retry
        </button>
      </div>
    </div>
  );
}
