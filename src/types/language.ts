export interface LanguageConfig {
  code: string;
  bcp47: string;
  nameInNative: string;
  nameInKorean: string;
  nameInEnglish: string;
  countryCode: string;
  flagEmoji: string;
  dir: "ltr" | "rtl";
  geminiLangName: string;
  speechSupported: boolean;
}
