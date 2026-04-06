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
        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
      >
        대화 종료
      </button>
      <button
        onClick={() => router.push("/")}
        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        홈
      </button>
    </div>
  );
}
