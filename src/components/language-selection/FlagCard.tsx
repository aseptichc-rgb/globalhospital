"use client";

import Link from "next/link";
import { LanguageConfig } from "@/types/language";
import FlagImage from "@/components/ui/FlagImage";

interface FlagCardProps {
  language: LanguageConfig;
  skipIntake?: boolean;
}

export default function FlagCard({ language, skipIntake = false }: FlagCardProps) {
  return (
    <Link
      href={skipIntake ? `/${language.code}/chat` : `/${language.code}`}
      className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-light hover:scale-105 transition-all duration-200 cursor-pointer min-h-[120px] active:scale-95"
    >
      <div className="mb-3">
        <FlagImage
          countryCode={language.countryCode}
          alt={language.nameInEnglish}
          size="lg"
        />
      </div>
      <span className="text-sm font-semibold text-gray-800 text-center">
        {language.nameInNative}
      </span>
      <span className="text-xs text-gray-500 text-center">
        {language.nameInKorean}
      </span>
    </Link>
  );
}
