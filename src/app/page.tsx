import { LANGUAGES } from "@/config/languages";
import FlagCard from "@/components/language-selection/FlagCard";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Global Hospital
        </h1>
        <p className="text-xl text-gray-600 mb-1">
          언어를 선택해 주세요
        </p>
        <p className="text-lg text-gray-500">
          Please select your language
        </p>
      </div>

      {/* Flag Grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl w-full">
        {LANGUAGES.map((lang) => (
          <FlagCard key={lang.code} language={lang} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-400">
        <p>다국어 의료 통역 서비스 | Multilingual Medical Interpretation Service</p>
      </div>
    </main>
  );
}
