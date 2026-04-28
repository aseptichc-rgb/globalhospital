"use client";

import Link from "next/link";
import { LanguageConfig } from "@/types/language";
import FlagImage from "@/components/ui/FlagImage";

interface FlagCardProps {
  language: LanguageConfig;
  skipIntake?: boolean;
}

/**
 * Language pill — signature component (BRAND.md §6).
 * Square aspect, brand bone background, blue selection state.
 */
export default function FlagCard({ language, skipIntake = false }: FlagCardProps) {
  return (
    <Link
      href={skipIntake ? `/${language.code}/chat` : `/${language.code}`}
      className="flex flex-col items-center justify-center gap-2 p-3 aspect-square rounded-xl transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--gh-white)",
        border: "1px solid var(--gh-cloud)",
        boxShadow: "var(--gh-shadow-sm)",
        minHeight: "var(--gh-tap-comfort)",
      }}
      aria-label={`${language.nameInKorean} · ${language.nameInEnglish}`}
    >
      <FlagImage
        countryCode={language.countryCode}
        alt={language.nameInEnglish}
        size="lg"
      />
      <div className="flex flex-col items-center text-center leading-tight">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--gh-ink)" }}
        >
          {language.nameInNative}
        </span>
        <span className="text-xs" style={{ color: "var(--gh-steel)" }}>
          {language.nameInKorean}
        </span>
      </div>
    </Link>
  );
}
