import { getLanguageByCode, VALID_LANG_CODES } from "@/config/languages";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return VALID_LANG_CODES.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = getLanguageByCode(lang);

  if (!language) {
    notFound();
  }

  return (
    <div dir={language.dir} className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-primary font-semibold"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="text-sm">언어 선택</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{language.flagEmoji}</span>
            <span className="text-sm font-medium text-gray-600">
              {language.nameInNative}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
