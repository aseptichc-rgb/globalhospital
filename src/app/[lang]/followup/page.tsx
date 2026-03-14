import { getLanguageByCode } from "@/config/languages";
import { notFound } from "next/navigation";
import FollowUpQuestions from "@/components/followup/FollowUpQuestions";

export default async function FollowUpPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = getLanguageByCode(lang);

  if (!language) {
    notFound();
  }

  return <FollowUpQuestions language={language} />;
}
