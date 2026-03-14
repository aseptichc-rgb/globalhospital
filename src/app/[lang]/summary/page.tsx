import { getLanguageByCode } from "@/config/languages";
import { notFound } from "next/navigation";
import SummaryView from "@/components/summary/SummaryView";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = getLanguageByCode(lang);

  if (!language) {
    notFound();
  }

  return <SummaryView language={language} />;
}
