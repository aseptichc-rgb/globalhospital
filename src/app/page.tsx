"use client";

import { useState } from "react";
import { LANGUAGES } from "@/config/languages";
import FlagCard from "@/components/language-selection/FlagCard";
import OtherLanguageModal from "@/components/language-selection/OtherLanguageModal";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

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

        {/* Other Language Button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 hover:shadow-lg hover:border-primary-light hover:scale-105 transition-all duration-200 cursor-pointer min-h-[120px] active:scale-95"
        >
          <span className="text-4xl mb-3 text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-gray-600 text-center">
            Other
          </span>
          <span className="text-xs text-gray-400 text-center">
            기타 언어
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-400">
        <p>다국어 의료 통역 서비스 | Multilingual Medical Interpretation Service</p>
      </div>

      {/* Other Language Modal */}
      <OtherLanguageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </main>
  );
}
