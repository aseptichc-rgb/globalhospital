"use client";

import Link from "next/link";
import { LanguageConfig } from "@/types/language";

interface FlagCardProps {
  language: LanguageConfig;
}

export default function FlagCard({ language }: FlagCardProps) {
  return (
    <Link
      href={`/${language.code}`}
      className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-light hover:scale-105 transition-all duration-200 cursor-pointer min-h-[120px] active:scale-95"
    >
      <span className="text-5xl mb-3" role="img" aria-label={language.nameInEnglish}>
        {language.flagEmoji}
      </span>
      <span className="text-sm font-semibold text-gray-800 text-center">
        {language.nameInNative}
      </span>
      <span className="text-xs text-gray-500 text-center">
        {language.nameInKorean}
      </span>
    </Link>
  );
}
