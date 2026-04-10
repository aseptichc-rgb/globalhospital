/**
 * Language code → simple-keyboard-layouts mapping.
 * Each entry is a dynamic import function for code splitting —
 * only the selected language layout is loaded.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type LayoutLoader = () => Promise<any>;

export const KEYBOARD_LAYOUT_MAP: Record<string, LayoutLoader> = {
  // ── Latin ──
  en: () => import("simple-keyboard-layouts/build/layouts/english"),
  fr: () => import("simple-keyboard-layouts/build/layouts/french"),
  de: () => import("simple-keyboard-layouts/build/layouts/german"),
  es: () => import("simple-keyboard-layouts/build/layouts/spanish"),
  pt: () => import("simple-keyboard-layouts/build/layouts/brazilian"),
  it: () => import("simple-keyboard-layouts/build/layouts/italian"),
  tr: () => import("simple-keyboard-layouts/build/layouts/turkish"),
  pl: () => import("simple-keyboard-layouts/build/layouts/polish"),
  sv: () => import("simple-keyboard-layouts/build/layouts/swedish"),
  cs: () => import("simple-keyboard-layouts/build/layouts/czech"),
  hu: () => import("simple-keyboard-layouts/build/layouts/hungarian"),

  // Latin-script languages → English layout
  vi: () => import("simple-keyboard-layouts/build/layouts/english"),
  id: () => import("simple-keyboard-layouts/build/layouts/english"),
  ms: () => import("simple-keyboard-layouts/build/layouts/english"),
  tl: () => import("simple-keyboard-layouts/build/layouts/english"),
  sw: () => import("simple-keyboard-layouts/build/layouts/english"),
  uz: () => import("simple-keyboard-layouts/build/layouts/english"),
  nl: () => import("simple-keyboard-layouts/build/layouts/english"),
  ro: () => import("simple-keyboard-layouts/build/layouts/english"),

  // ── Cyrillic ──
  ru: () => import("simple-keyboard-layouts/build/layouts/russian"),
  uk: () => import("simple-keyboard-layouts/build/layouts/ukrainian"),
  mn: () => import("simple-keyboard-layouts/build/layouts/russian"),
  kk: () => import("simple-keyboard-layouts/build/layouts/russian"),

  // ── RTL ──
  ar: () => import("simple-keyboard-layouts/build/layouts/arabic"),
  fa: () => import("simple-keyboard-layouts/build/layouts/farsi"),
  he: () => import("simple-keyboard-layouts/build/layouts/hebrew"),
  ur: () => import("simple-keyboard-layouts/build/layouts/urdu"),

  // ── Indic ──
  hi: () => import("simple-keyboard-layouts/build/layouts/hindi"),
  bn: () => import("simple-keyboard-layouts/build/layouts/bengali"),
  ne: () => import("simple-keyboard-layouts/build/layouts/hindi"), // Devanagari
  ta: () => import("simple-keyboard-layouts/build/layouts/telugu"), // closest available

  // ── Southeast Asian ──
  th: () => import("simple-keyboard-layouts/build/layouts/thai"),
  my: () => import("simple-keyboard-layouts/build/layouts/burmese"),

  // Missing native layouts → English fallback + voice input recommended
  km: () => import("simple-keyboard-layouts/build/layouts/english"),
  lo: () => import("simple-keyboard-layouts/build/layouts/english"),

  // ── CJK (QWERTY for phonetic input) ──
  zh: () => import("simple-keyboard-layouts/build/layouts/chinese"),
  ja: () => import("simple-keyboard-layouts/build/layouts/japanese"),
  ko: () => import("simple-keyboard-layouts/build/layouts/korean"),

  // ── Other scripts ──
  el: () => import("simple-keyboard-layouts/build/layouts/greek"),
  ka: () => import("simple-keyboard-layouts/build/layouts/georgian"),
  am: () => import("simple-keyboard-layouts/build/layouts/english"), // Ge'ez — no layout available
};

// Languages that lack a proper native keyboard layout —
// voice input should be prominently suggested for these.
export const VOICE_PREFERRED_LANGUAGES = new Set([
  "km", "lo", "am", "zh", "ja",
]);

// Languages that require IME (Input Method Editor) for character composition —
// these must use the native OS keyboard instead of the app's virtual keyboard.
// Chinese needs Pinyin → Hanzi conversion which simple-keyboard cannot do, so
// the virtual keyboard would only show alphabet keys with no way to produce
// actual characters. ja/ko at least display their native scripts (kana / jamo)
// on the virtual keyboard, so they remain on the in-app keyboard.
export const IME_LANGUAGES = new Set(["zh"]);

// Cache loaded layouts so we don't re-import
const layoutCache = new Map<string, any>();

export async function loadLayout(langCode: string): Promise<any> {
  if (layoutCache.has(langCode)) {
    return layoutCache.get(langCode)!;
  }

  const loader = KEYBOARD_LAYOUT_MAP[langCode];
  if (!loader) {
    // Ultimate fallback: English
    const mod = await import(
      "simple-keyboard-layouts/build/layouts/english"
    );
    const layout = mod.default ?? mod;
    layoutCache.set(langCode, layout);
    return layout;
  }

  const mod = await loader();
  const layout = mod.default ?? mod;
  layoutCache.set(langCode, layout);
  return layout;
}
