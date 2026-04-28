"use client";

import { useState } from "react";
import { LANGUAGES } from "@/config/languages";
import FlagCard from "@/components/language-selection/FlagCard";
import OtherLanguageModal from "@/components/language-selection/OtherLanguageModal";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [skipIntake, setSkipIntake] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bone">
      {/* Mark + wordmark + bilingual prompt (BRAND.md §2 / §4 / §8) */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
          style={{
            background: "var(--gh-white)",
            boxShadow: "var(--gh-shadow-md)",
          }}
          aria-hidden
        >
          {/* Speech Cross — official brand symbol (logos/globalhospital-symbol.svg) */}
          <img
            src="/logos/globalhospital-symbol.svg"
            alt="Globalhospital"
            width={48}
            height={48}
          />
        </div>

        <h1 className="gh-wordmark text-3xl mb-3">
          global<span className="gh-wordmark-bold">hospital</span>
        </h1>

        <p
          className="text-xl font-semibold"
          style={{ color: "var(--gh-ink)" }}
        >
          언어를 선택해 주세요
        </p>
        <p className="text-base" style={{ color: "var(--gh-steel)" }}>
          Please select your language
        </p>
      </div>

      {/* Skip intake toggle — pill button per BRAND.md §6 */}
      <button
        onClick={() => setSkipIntake((v) => !v)}
        aria-pressed={skipIntake}
        className="mb-8 inline-flex items-center gap-2 px-6 h-12 rounded-full font-semibold text-sm transition-all"
        style={
          skipIntake
            ? {
                background: "var(--gh-blue)",
                color: "var(--gh-white)",
                boxShadow: "var(--gh-shadow-cta)",
              }
            : {
                background: "var(--gh-white)",
                color: "var(--gh-blue)",
                border: "1.5px solid var(--gh-blue)",
              }
        }
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        <span className="flex flex-col items-start leading-tight">
          <span>{skipIntake ? "문진 건너뛰기 · 켜짐" : "문진 건너뛰고 바로 진료 통역"}</span>
          <span className="text-xs font-normal opacity-80">
            {skipIntake ? "Skip intake · ON" : "Go straight to live interpretation"}
          </span>
        </span>
      </button>

      {/* Language pill grid (BRAND.md §6 — signature) */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-w-4xl w-full">
        {LANGUAGES.map((lang) => (
          <FlagCard key={lang.code} language={lang} skipIntake={skipIntake} />
        ))}

        {/* Other languages — dashed pill */}
        <button
          onClick={() => setShowModal(true)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all aspect-square"
          style={{
            background: "var(--gh-bone)",
            border: "1.5px dashed var(--gh-cloud)",
            minHeight: "var(--gh-tap-comfort)",
          }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="var(--gh-steel)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: "var(--gh-ink)" }}>
            Other
          </span>
          <span className="text-xs" style={{ color: "var(--gh-steel)" }}>
            기타 언어
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center space-y-3">
        <button
          onClick={() => (window.location.href = "/history")}
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-semibold rounded-full transition-colors"
          style={{
            background: "var(--gh-white)",
            color: "var(--gh-steel)",
            border: "1px solid var(--gh-cloud)",
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          문진 기록 · History
        </button>
        <p className="text-xs" style={{ color: "var(--gh-steel)" }}>
          외국인 환자를 위한 의료 통역 · Medical interpretation for international patients
        </p>
      </div>

      <OtherLanguageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        skipIntake={skipIntake}
      />
    </main>
  );
}
