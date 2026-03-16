"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { LanguageConfig } from "@/types/language";
import { ChatMessage } from "@/types/consultation";
import MicrophoneButton from "@/components/ui/MicrophoneButton";

interface InterpretationChatProps {
  language: LanguageConfig;
}

export default function InterpretationChat({
  language,
}: InterpretationChatProps) {
  const { chatMessages, addChatMessage, formData, followUpQuestions, followUpAnswers } =
    useConsultationStore();

  const [activeSide, setActiveSide] = useState<"doctor" | "patient" | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Doctor side (Korean)
  const doctorSTT = useSpeechRecognition("ko-KR");
  const doctorTTS = useSpeechSynthesis(language.bcp47);

  // Patient side (selected language)
  const patientSTT = useSpeechRecognition(language.bcp47);
  const patientTTS = useSpeechSynthesis("ko-KR");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const translateAndAdd = useCallback(
    async (
      text: string,
      speaker: "doctor" | "patient"
    ) => {
      if (!text.trim()) return;

      setTranslating(true);
      try {
        const direction = speaker === "doctor" ? "fromKorean" : "toKorean";
        const res = await fetch("/api/gemini/medical-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            direction,
            patientLang: language.geminiLangName,
          }),
        });
        const data = await res.json();

        const message: ChatMessage = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          speaker,
          originalText: text,
          translatedText: data.translatedText || "",
          originalLang: speaker === "doctor" ? "ko-KR" : language.bcp47,
          translatedLang: speaker === "doctor" ? language.bcp47 : "ko-KR",
        };

        addChatMessage(message);

        // Auto-play TTS on the other side
        if (data.translatedText) {
          if (speaker === "doctor") {
            doctorTTS.speak(data.translatedText);
          } else {
            patientTTS.speak(data.translatedText);
          }
        }
      } catch (err) {
        console.error("Translation error:", err);
      } finally {
        setTranslating(false);
      }
    },
    [language.geminiLangName, language.bcp47, addChatMessage, doctorTTS, patientTTS]
  );

  // Track which side just stopped to send transcript after Gemini processing
  const pendingSideRef = useRef<"doctor" | "patient" | null>(null);

  // When transcript updates after stopping, send for translation
  useEffect(() => {
    if (
      pendingSideRef.current === "doctor" &&
      !doctorSTT.isListening &&
      !doctorSTT.isProcessing &&
      doctorSTT.transcript
    ) {
      translateAndAdd(doctorSTT.transcript, "doctor");
      doctorSTT.resetTranscript();
      pendingSideRef.current = null;
    }
  }, [doctorSTT.transcript, doctorSTT.isListening, doctorSTT.isProcessing, translateAndAdd, doctorSTT]);

  useEffect(() => {
    if (
      pendingSideRef.current === "patient" &&
      !patientSTT.isListening &&
      !patientSTT.isProcessing &&
      patientSTT.transcript
    ) {
      translateAndAdd(patientSTT.transcript, "patient");
      patientSTT.resetTranscript();
      pendingSideRef.current = null;
    }
  }, [patientSTT.transcript, patientSTT.isListening, patientSTT.isProcessing, translateAndAdd, patientSTT]);

  const handleDoctorMic = useCallback(() => {
    if (activeSide === "doctor") {
      doctorSTT.stopListening();
      setActiveSide(null);
      pendingSideRef.current = "doctor";
    } else {
      patientSTT.stopListening();
      doctorSTT.resetTranscript();
      doctorSTT.startListening();
      setActiveSide("doctor");
    }
  }, [activeSide, doctorSTT, patientSTT]);

  const handlePatientMic = useCallback(() => {
    if (activeSide === "patient") {
      patientSTT.stopListening();
      setActiveSide(null);
      pendingSideRef.current = "patient";
    } else {
      doctorSTT.stopListening();
      patientSTT.resetTranscript();
      patientSTT.startListening();
      setActiveSide("patient");
    }
  }, [activeSide, doctorSTT, patientSTT]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Summary Toggle */}
      <button
        onClick={() => setShowSummary(!showSummary)}
        className="mb-2 text-sm text-primary underline no-print"
      >
        {showSummary ? "Hide" : "Show"} Pre-Consultation Summary
      </button>

      {/* Collapsible Summary */}
      {showSummary && (
        <div className="bg-blue-50 p-4 rounded-xl mb-4 max-h-60 overflow-y-auto border border-blue-100 text-sm">
          <h3 className="font-bold text-blue-800 mb-2">Pre-Consultation Summary</h3>
          {formData.chiefComplaint?.original && (
            <div className="mb-2">
              <span className="font-semibold">Chief Complaint:</span>{" "}
              {formData.chiefComplaint.original}
              {formData.chiefComplaint.korean && (
                <span className="text-blue-600 ml-2">
                  ({formData.chiefComplaint.korean})
                </span>
              )}
            </div>
          )}
          {followUpQuestions.map((q, i) => (
            <div key={i} className="mb-1">
              <span className="font-semibold">Q{i + 1}:</span> {q}
              {followUpAnswers[i]?.original && (
                <span className="ml-2 text-gray-600">
                  → {followUpAnswers[i].original}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {chatMessages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>Press the microphone button to start speaking</p>
            <p className="text-sm mt-1">
              Doctor (Korean) | Patient ({language.nameInNative})
            </p>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.speaker === "doctor" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.speaker === "doctor"
                  ? "bg-doctor rounded-tl-sm"
                  : "bg-patient rounded-tr-sm"
              }`}
            >
              <p className="text-xs font-semibold mb-1 text-gray-500">
                {msg.speaker === "doctor" ? "Doctor 의사" : `Patient 환자`}
              </p>
              <p className="text-gray-900 font-medium">{msg.originalText}</p>
              <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                → {msg.translatedText}
              </p>
            </div>
          </div>
        ))}

        {translating && (
          <div className="text-center text-sm text-gray-400 animate-pulse">
            Translating...
          </div>
        )}

        {activeSide && (
          <div
            className={`flex ${
              activeSide === "doctor" ? "justify-start" : "justify-end"
            }`}
          >
            <div className="max-w-[80%] rounded-2xl p-4 bg-yellow-50 border border-yellow-200">
              <p className="text-xs text-yellow-600 mb-1">🎤 음성을 듣고 있습니다...</p>
              <p className="text-gray-800">
                {activeSide === "doctor"
                  ? doctorSTT.transcript
                  : patientSTT.transcript}
              </p>
            </div>
          </div>
        )}

        {!activeSide && (doctorSTT.isProcessing || patientSTT.isProcessing) && (
          <div className="text-center text-sm text-blue-500 animate-pulse">
            음성을 변환하고 있습니다...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Error Display */}
      {(doctorSTT.error || patientSTT.error) && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mx-4">
          ⚠️ {doctorSTT.error || patientSTT.error}
        </div>
      )}

      {/* Mic Controls */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 no-print">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-blue-700">
            Doctor 의사
          </p>
          <p className="text-xs text-gray-500">한국어</p>
          <MicrophoneButton
            isListening={activeSide === "doctor"}
            onClick={handleDoctorMic}
            disabled={translating || doctorSTT.isProcessing || patientSTT.isProcessing}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-green-700">
            Patient 환자
          </p>
          <p className="text-xs text-gray-500">{language.nameInNative}</p>
          <MicrophoneButton
            isListening={activeSide === "patient"}
            onClick={handlePatientMic}
            disabled={translating || doctorSTT.isProcessing || patientSTT.isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
