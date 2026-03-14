import { getLanguageByCode } from "@/config/languages";
import { notFound } from "next/navigation";
import ConsultationForm from "@/components/consultation/ConsultationForm";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = getLanguageByCode(lang);

  if (!language) {
    notFound();
  }

  return <ConsultationForm language={language} />;
}
