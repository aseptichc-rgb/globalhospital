"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXTRA_LANGUAGES } from "@/config/languages";
import FlagImage from "@/components/ui/FlagImage";

interface OtherLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  skipIntake?: boolean;
}

export default function OtherLanguageModal({ isOpen, onClose, skipIntake = false }: OtherLanguageModalProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  if (!isOpen) return null;

  const filtered = EXTRA_LANGUAGES.filter((lang) => {
    const q = search.toLowerCase();
    return (
      lang.nameInNative.toLowerCase().includes(q) ||
      lang.nameInKorean.includes(q) ||
      lang.nameInEnglish.toLowerCase().includes(q)
    );
  });

  const handleSelect = (code: string) => {
    onClose();
    router.push(skipIntake ? `/${code}/chat` : `/${code}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(14, 26, 43, 0.5)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        style={{
          background: "var(--gh-white)",
          borderRadius: "var(--gh-r-lg)",
          boxShadow: "var(--gh-shadow-lg)",
        }}
      >
        <div
          className="p-5"
          style={{ borderBottom: "1px solid var(--gh-cloud)" }}
        >
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex flex-col leading-tight">
              <h2
                className="text-lg font-extrabold"
                style={{ color: "var(--gh-ink)" }}
              >
                다른 언어 선택
              </h2>
              <span className="text-sm" style={{ color: "var(--gh-steel)" }}>
                Select another language
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ color: "var(--gh-steel)" }}
              aria-label="닫기 · Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색 · Search…"
            className="gh-input"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {filtered.length === 0 ? (
            <p
              className="text-center py-8 text-sm"
              style={{ color: "var(--gh-steel)" }}
            >
              검색 결과가 없습니다 · No results found
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className="flex items-center gap-3 p-3 transition-colors text-left"
                  style={{
                    background: "var(--gh-white)",
                    border: "1px solid var(--gh-cloud)",
                    borderRadius: "var(--gh-r-sm)",
                    minHeight: "var(--gh-tap-comfort)",
                  }}
                >
                  <FlagImage
                    countryCode={lang.countryCode}
                    alt={lang.nameInEnglish}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--gh-ink)" }}
                    >
                      {lang.nameInNative}
                    </div>
                    <div
                      className="text-xs truncate"
                      style={{ color: "var(--gh-steel)" }}
                    >
                      {lang.nameInKorean}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
