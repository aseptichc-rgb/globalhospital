import { getLanguageByCode } from "@/config/languages";
import { notFound } from "next/navigation";
import InterpretationChat from "@/components/chat/InterpretationChat";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = getLanguageByCode(lang);

  if (!language) {
    notFound();
  }

  return <InterpretationChat language={language} />;
}
