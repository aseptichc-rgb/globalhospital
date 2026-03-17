"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXTRA_LANGUAGES } from "@/config/languages";
import FlagImage from "@/components/ui/FlagImage";

interface OtherLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OtherLanguageModal({ isOpen, onClose }: OtherLanguageModalProps) {
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
    router.push(`/${code}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              다른 언어 선택 / Select Language
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색 / Search..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Language List */}
        <div className="overflow-y-auto flex-1 p-3">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              검색 결과가 없습니다 / No results found
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 hover:border-primary-light border border-gray-100 transition-colors text-left"
                >
                  <FlagImage
                    countryCode={lang.countryCode}
                    alt={lang.nameInEnglish}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {lang.nameInNative}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
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
