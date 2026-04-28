import { getLanguageByCode, VALID_LANG_CODES } from "@/config/languages";
import { notFound } from "next/navigation";
import Link from "next/link";
import FlagImage from "@/components/ui/FlagImage";
import ConversationHeaderButtons from "@/components/ui/ConversationHeaderButtons";
import KeyboardWrapper from "@/components/keyboard/KeyboardWrapper";

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
    <div
      dir={language.dir}
      className="min-h-screen"
      style={{ background: "var(--gh-bone)" }}
    >
      {/* Top bar — clinical, calm, blue-tinted shadow per BRAND.md §5 */}
      <header
        className="px-4 py-3 no-print"
        style={{
          background: "var(--gh-white)",
          borderBottom: "1px solid var(--gh-cloud)",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
            style={{ color: "var(--gh-blue)" }}
            aria-label="언어 선택으로 돌아가기 · Back to language selection"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm">언어 선택</span>
          </Link>
          <div className="flex items-center gap-3">
            <ConversationHeaderButtons />
            <div
              className="flex items-center gap-2 px-3 h-9 rounded-full"
              style={{ background: "var(--gh-bone)" }}
            >
              <FlagImage
                countryCode={language.countryCode}
                alt={language.nameInEnglish}
                size="sm"
              />
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--gh-ink)" }}
              >
                {language.nameInNative}
              </span>
            </div>
          </div>
        </div>
      </header>

      <KeyboardWrapper languageCode={language.code} dir={language.dir}>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </KeyboardWrapper>
    </div>
  );
}
