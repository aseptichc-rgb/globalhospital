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
    <div className="flex items-center gap-2">
      <button
        onClick={handleEndConversation}
        className="px-3 h-9 text-xs font-semibold rounded-full transition-colors"
        style={{
          color: "var(--gh-danger)",
          background: "var(--gh-white)",
          border: "1.5px solid var(--gh-danger)",
        }}
      >
        대화 종료
      </button>
      <button
        onClick={() => router.push("/")}
        className="px-3 h-9 text-xs font-semibold rounded-full transition-colors"
        style={{
          color: "var(--gh-steel)",
          background: "var(--gh-white)",
          border: "1px solid var(--gh-cloud)",
        }}
      >
        홈 · Home
      </button>
    </div>
  );
}
