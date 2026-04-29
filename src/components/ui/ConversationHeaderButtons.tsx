"use client";

import { useRouter } from "next/navigation";
import { useConsultationStore } from "@/hooks/useConsultationStore";

export default function ConversationHeaderButtons() {
  const router = useRouter();
  const reset = useConsultationStore((s) => s.reset);

  const handleEndConversation = () => {
    if (!confirm("전체 대화를 종료하시겠습니까?\nEnd the entire conversation?")) return;
    reset();
    router.push("/");
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        onClick={handleEndConversation}
        className="px-2 sm:px-3 h-9 text-xs font-semibold rounded-full transition-colors whitespace-nowrap"
        style={{
          color: "var(--gh-danger)",
          background: "var(--gh-white)",
          border: "1.5px solid var(--gh-danger)",
        }}
      >
        <span className="sm:hidden" aria-label="대화 종료">종료</span>
        <span className="hidden sm:inline">대화 종료</span>
      </button>
      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center justify-center px-2 sm:px-3 h-9 text-xs font-semibold rounded-full transition-colors whitespace-nowrap"
        style={{
          color: "var(--gh-steel)",
          background: "var(--gh-white)",
          border: "1px solid var(--gh-cloud)",
        }}
        aria-label="홈 · Home"
      >
        <svg
          className="w-4 h-4 sm:hidden"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10" />
        </svg>
        <span className="hidden sm:inline">홈 · Home</span>
      </button>
    </div>
  );
}
