"use client";

import { useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import VoiceInput from "./VoiceInput";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { MEDICAL_LABELS, FIELD_KEYS, FieldKey } from "@/config/medical-fields";
import { LanguageConfig } from "@/types/language";

interface ConsultationFormProps {
  language: LanguageConfig;
}

export default function ConsultationForm({ language }: ConsultationFormProps) {
  const router = useRouter();
  const { formData, updateField, setLanguage } = useConsultationStore();
  const labels = MEDICAL_LABELS[language.code];
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    setLanguage(language.code);
  }, [language.code, setLanguage]);

  const translateField = useCallback(
    async (key: FieldKey, text: string) => {
      if (!text.trim()) return;

      try {
        const res = await fetch("/api/gemini/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sourceLang: language.geminiLangName,
            targetLang: "Korean",
          }),
        });
        const data = await res.json();
        if (data.translatedText) {
          updateField(key, { original: text, korean: data.translatedText });
        }
      } catch (error) {
        console.error("Translation error:", error);
      }
    },
    [language.geminiLangName, updateField]
  );

  const handleChange = useCallback(
    (key: FieldKey, value: string) => {
      updateField(key, { original: value, korean: formData[key]?.korean || "" });

      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      if (value.trim()) {
        debounceTimers.current[key] = setTimeout(() => {
          translateField(key, value);
        }, 800);
      }
    },
    [formData, updateField, translateField]
  );

  const handleNext = () => {
    if (!formData.chiefComplaint?.original?.trim()) return;
    router.push(`/${language.code}/followup`);
  };

  const fieldConfig: { key: FieldKey; label: string; placeholder: string }[] =
    FIELD_KEYS.map((key) => ({
      key,
      label: labels[key],
      placeholder: labels[`${key}Placeholder` as keyof typeof labels],
    }));

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{labels.pageTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">{labels.voiceInputHint}</p>
      </div>

      {fieldConfig.map(({ key, label, placeholder }) => (
        <VoiceInput
          key={key}
          value={formData[key]?.original || ""}
          onChange={(val) => handleChange(key, val)}
          placeholder={placeholder}
          bcp47={language.bcp47}
          speechSupported={language.speechSupported}
          label={label}
        />
      ))}

      {formData.chiefComplaint?.korean && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-600 font-semibold mb-1">
            한국어 번역 (Korean Translation)
          </p>
          <p className="text-sm text-blue-800">
            {formData.chiefComplaint.korean}
          </p>
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!formData.chiefComplaint?.original?.trim()}
        className="w-full py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {labels.nextButton} →
      </button>
    </div>
  );
}
