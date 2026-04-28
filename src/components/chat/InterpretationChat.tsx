"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConsultationStore } from "@/hooks/useConsultationStore";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useLiveInterpretation } from "@/hooks/useLiveInterpretation";
import { LanguageConfig } from "@/types/language";
import { ChatMessage } from "@/types/consultation";
import MicrophoneButton from "@/components/ui/MicrophoneButton";
import KeyboardTextarea from "@/components/keyboard/KeyboardTextarea";

interface InterpretationChatProps {
  language: LanguageConfig;
}

export default function InterpretationChat({
  language,
}: InterpretationChatProps) {
  const {
    chatMessages: storedChatMessages,
    addChatMessage,
    clearChatMessages,
    formData,
    followUpQuestions,
    followUpAnswers,
    languageCode: storedLanguageCode,
    setLanguage,
  } = useConsultationStore();

  // If we're entering interpretation for a different language than the
  // last session (or skip-intake jumped straight here without ever setting
  // the language), the persisted chatMessages belong to a previous session
  // and should not be shown. Mask them locally until the effect below has
  // synced the store, so the stale bubbles never paint.
  const languageMatches = storedLanguageCode === language.code;
  const chatMessages = languageMatches ? storedChatMessages : [];

  useEffect(() => {
    if (storedLanguageCode !== language.code) {
      clearChatMessages();
      setLanguage(language.code);
    }
  }, [storedLanguageCode, language.code, clearChatMessages, setLanguage]);

  const [activeSide, setActiveSide] = useState<"doctor" | "patient" | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [doctorText, setDoctorText] = useState("");
  const [patientText, setPatientText] = useState("");
  const liveModeRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(chatMessages.length);

  // Short notification beep generated via Web Audio API (no asset file needed)
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
      osc.onended = () => ctx.close();
    } catch (e) {
      console.error("Notification sound error:", e);
    }
  }, []);

  // Play a beep whenever a new translated message is appended to the chat
  useEffect(() => {
    if (chatMessages.length > prevMessageCountRef.current) {
      playNotificationSound();
    }
    prevMessageCountRef.current = chatMessages.length;
  }, [chatMessages.length, playNotificationSound]);

  // Doctor side (Korean)
  const doctorSTT = useSpeechRecognition("ko-KR");
  const doctorTTS = useSpeechSynthesis(language.bcp47);

  // Patient side (selected language)
  const patientSTT = useSpeechRecognition(language.bcp47);

  // Live-mode simultaneous interpreter (one hook per direction; only one is
  // connected at a time via start()/stop()).
  const doctorLive = useLiveInterpretation({
    sourceLang: "Korean",
    targetLang: language.geminiLangName,
  });
  const patientLive = useLiveInterpretation({
    sourceLang: language.geminiLangName,
    targetLang: "Korean",
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Tracks which side is currently being listened to (set on start, cleared on translate)
  const pendingSideRef = useRef<"doctor" | "patient" | null>(null);
  // Forward ref so translateAndAdd can call startSide without circular deps
  const startSideRef = useRef<((side: "doctor" | "patient") => void) | null>(null);

  const translateAndAdd = useCallback(
    async (
      text: string,
      speaker: "doctor" | "patient"
    ) => {
      if (!text.trim()) {
        if (liveModeRef.current) {
          startSideRef.current?.(speaker);
        }
        return;
      }

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
        if (!res.ok) {
          // fetch() does not throw on HTTP 4xx/5xx — convert to a thrown
          // error so the catch branch (which handles live-mode auto-rearm)
          // actually runs instead of silently dropping in an empty bubble.
          let detail = "";
          try {
            const body = await res.json();
            detail = body?.error || JSON.stringify(body);
          } catch {
            try {
              detail = await res.text();
            } catch {}
          }
          throw new Error(`Translate API error: ${res.status} ${detail}`);
        }
        const data = await res.json();
        if (!data.translatedText) {
          throw new Error("Empty translation response");
        }

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
        setTranslating(false);

        // Wait for TTS playback to finish before re-opening the mic so we don't capture our own audio.
        // Korean translation (directed at the doctor) is shown on screen only — no TTS.
        if (data.translatedText && speaker === "doctor") {
          await doctorTTS.speak(data.translatedText);
          // Extra buffer for TTS audio tail / acoustic echo on mobile speakers
          await new Promise((r) => setTimeout(r, 600));
        }

        // In live mode, automatically hand the turn to the other side
        if (liveModeRef.current) {
          const next = speaker === "doctor" ? "patient" : "doctor";
          startSideRef.current?.(next);
        }
      } catch (err) {
        console.error("Translation error:", err);
        setTranslating(false);
        if (liveModeRef.current) {
          // Brief pause before retrying so we don't hammer the API on repeat errors
          await new Promise((r) => setTimeout(r, 800));
          startSideRef.current?.(speaker);
        }
      }
    },
    [language.geminiLangName, language.bcp47, addChatMessage, doctorTTS]
  );

  // When doctor side finishes (manual stop or silence auto-stop), translate
  useEffect(() => {
    if (liveModeRef.current) return;
    if (
      pendingSideRef.current === "doctor" &&
      !doctorSTT.isListening &&
      !doctorSTT.isProcessing
    ) {
      if (doctorSTT.transcript) {
        const text = doctorSTT.transcript;
        pendingSideRef.current = null;
        doctorSTT.resetTranscript();
        translateAndAdd(text, "doctor");
      } else if (liveModeRef.current) {
        // No speech captured — re-arm same side in live mode
        pendingSideRef.current = null;
        startSideRef.current?.("doctor");
      }
    }
  }, [doctorSTT.transcript, doctorSTT.isListening, doctorSTT.isProcessing, translateAndAdd, doctorSTT]);

  useEffect(() => {
    if (liveModeRef.current) return;
    if (
      pendingSideRef.current === "patient" &&
      !patientSTT.isListening &&
      !patientSTT.isProcessing
    ) {
      if (patientSTT.transcript) {
        const text = patientSTT.transcript;
        pendingSideRef.current = null;
        patientSTT.resetTranscript();
        translateAndAdd(text, "patient");
      } else if (liveModeRef.current) {
        pendingSideRef.current = null;
        startSideRef.current?.("patient");
      }
    }
  }, [patientSTT.transcript, patientSTT.isListening, patientSTT.isProcessing, translateAndAdd, patientSTT]);

  const startSide = useCallback(
    (side: "doctor" | "patient") => {
      if (liveModeRef.current) {
        // Live mode: use streaming Gemini Live sessions.
        if (side === "doctor") {
          patientLive.stop();
          pendingSideRef.current = "doctor";
          setActiveSide("doctor");
          setTimeout(() => {
            if (pendingSideRef.current === "doctor") doctorLive.start();
          }, 150);
        } else {
          doctorLive.stop();
          pendingSideRef.current = "patient";
          setActiveSide("patient");
          setTimeout(() => {
            if (pendingSideRef.current === "patient") patientLive.start();
          }, 150);
        }
        return;
      }
      if (side === "doctor") {
        patientSTT.stopListening();
        doctorSTT.resetTranscript();
        pendingSideRef.current = "doctor";
        setActiveSide("doctor");
        // Yield a tick so the previous recorder/stream finishes tearing down
        // before we acquire a new microphone stream on the same device.
        setTimeout(() => {
          if (pendingSideRef.current === "doctor") doctorSTT.startListening();
        }, 150);
      } else {
        doctorSTT.stopListening();
        patientSTT.resetTranscript();
        pendingSideRef.current = "patient";
        setActiveSide("patient");
        setTimeout(() => {
          if (pendingSideRef.current === "patient") patientSTT.startListening();
        }, 150);
      }
    },
    [doctorSTT, patientSTT, doctorLive, patientLive]
  );

  useEffect(() => {
    startSideRef.current = startSide;
  }, [startSide]);

  // React to finalized live segments from either side.
  const handleLiveSegment = useCallback(
    async (speaker: "doctor" | "patient", input: string, output: string) => {
      const originalText = input.trim();
      const translatedText = output.trim();
      if (!originalText && !translatedText) {
        if (liveModeRef.current) startSideRef.current?.(speaker);
        return;
      }

      const message: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        speaker,
        originalText: originalText || translatedText,
        translatedText: translatedText,
        originalLang: speaker === "doctor" ? "ko-KR" : language.bcp47,
        translatedLang: speaker === "doctor" ? language.bcp47 : "ko-KR",
      };
      addChatMessage(message);

      if (speaker === "doctor" && translatedText) {
        // Mute the active mic during TTS to avoid echo capture.
        doctorLive.muteMic(true);
        patientLive.muteMic(true);
        await doctorTTS.speak(translatedText);
        await new Promise((r) => setTimeout(r, 600));
        doctorLive.muteMic(false);
        patientLive.muteMic(false);
      }

      if (liveModeRef.current) {
        const next = speaker === "doctor" ? "patient" : "doctor";
        startSideRef.current?.(next);
      }
    },
    [addChatMessage, doctorTTS, doctorLive, patientLive, language.bcp47]
  );

  useEffect(() => {
    if (doctorLive.lastSegment) {
      const seg = doctorLive.lastSegment;
      handleLiveSegment("doctor", seg.inputTranscript, seg.outputTranslation);
    }
    // Only react when the segment id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorLive.lastSegment?.id]);

  useEffect(() => {
    if (patientLive.lastSegment) {
      const seg = patientLive.lastSegment;
      handleLiveSegment("patient", seg.inputTranscript, seg.outputTranslation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientLive.lastSegment?.id]);

  const handleDoctorMic = useCallback(() => {
    if (liveMode) {
      if (activeSide !== "doctor") startSide("doctor");
      return;
    }
    if (activeSide === "doctor") {
      doctorSTT.stopListening();
      setActiveSide(null);
    } else {
      startSide("doctor");
    }
  }, [liveMode, activeSide, doctorSTT, startSide]);

  const handlePatientMic = useCallback(() => {
    if (liveMode) {
      if (activeSide !== "patient") startSide("patient");
      return;
    }
    if (activeSide === "patient") {
      patientSTT.stopListening();
      setActiveSide(null);
    } else {
      startSide("patient");
    }
  }, [liveMode, activeSide, patientSTT, startSide]);

  const sendText = useCallback(
    async (side: "doctor" | "patient") => {
      if (translating || liveMode) return;
      const text = side === "doctor" ? doctorText : patientText;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Stop any active mic on either side so the chat-input message doesn't
      // race with an in-flight STT translation.
      if (activeSide === "doctor") doctorSTT.stopListening();
      if (activeSide === "patient") patientSTT.stopListening();
      pendingSideRef.current = null;
      setActiveSide(null);

      if (side === "doctor") setDoctorText("");
      else setPatientText("");

      try {
        await translateAndAdd(trimmed, side);
      } catch (err) {
        console.error("Send text error:", err);
      }
    },
    [
      translating,
      liveMode,
      doctorText,
      patientText,
      activeSide,
      doctorSTT,
      patientSTT,
      translateAndAdd,
    ]
  );

  const handleLiveToggle = useCallback(() => {
    const next = !liveMode;
    liveModeRef.current = next;
    setLiveMode(next);
    if (next) {
      startSide("doctor");
    } else {
      doctorSTT.stopListening();
      patientSTT.stopListening();
      doctorLive.stop();
      patientLive.stop();
      doctorTTS.cancel();
      pendingSideRef.current = null;
      setActiveSide(null);
    }
  }, [liveMode, doctorSTT, patientSTT, doctorLive, patientLive, doctorTTS, startSide]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Top Bar: Summary Toggle + Live Mode Toggle */}
      <div className="flex items-center justify-between gap-3 mb-3 no-print">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="text-sm font-semibold underline"
          style={{ color: "var(--gh-blue)" }}
        >
          {showSummary ? "사전 문진 숨기기 · Hide" : "사전 문진 보기 · Show"} summary
        </button>

        <button
          onClick={handleLiveToggle}
          aria-pressed={liveMode}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full font-semibold text-sm transition-all"
          style={
            liveMode
              ? {
                  background: "var(--gh-mint)",
                  color: "var(--gh-ink)",
                  boxShadow: "0 8px 24px rgba(52, 212, 176, 0.3)",
                }
              : {
                  background: "var(--gh-white)",
                  color: "var(--gh-blue)",
                  border: "1.5px solid var(--gh-blue)",
                }
          }
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{
              background: liveMode ? "var(--gh-ink)" : "var(--gh-mint)",
              animation: liveMode ? "gh-pulse 1.4s ease-in-out infinite" : "none",
            }}
          />
          {liveMode ? "실시간 통역 끄기" : "실시간 통역 켜기"}
        </button>
      </div>

      {/* Collapsible Summary */}
      {showSummary && (
        <div
          className="p-4 rounded-2xl mb-4 max-h-60 overflow-y-auto text-sm"
          style={{
            background: "var(--gh-bone)",
            border: "1px solid var(--gh-cloud)",
          }}
        >
          <h3
            className="font-extrabold mb-2"
            style={{ color: "var(--gh-blue-deep)" }}
          >
            사전 문진 요약 · Pre-Consultation Summary
          </h3>
          {formData.chiefComplaint?.original && (
            <div className="mb-2">
              <span className="font-semibold">Chief Complaint:</span>{" "}
              {formData.chiefComplaint.original}
              {formData.chiefComplaint.korean && (
                <span className="ml-2" style={{ color: "var(--gh-blue)" }}>
                  ({formData.chiefComplaint.korean})
                </span>
              )}
            </div>
          )}
          {followUpQuestions.map((q, i) => (
            <div key={i} className="mb-1">
              <span className="font-semibold">Q{i + 1}:</span> {q}
              {followUpAnswers[i]?.original && (
                <span className="ml-2" style={{ color: "var(--gh-steel)" }}>
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
          <div
            className="text-center py-12"
            style={{ color: "var(--gh-steel)" }}
          >
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="var(--gh-cloud)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-base font-semibold" style={{ color: "var(--gh-ink)" }}>
              마이크를 눌러 말씀해 주세요
            </p>
            <p className="text-sm mt-1">
              Tap the mic to speak, or turn on Live mode above
            </p>
            <p className="text-xs mt-3" style={{ color: "var(--gh-steel)" }}>
              Doctor 의사 (한국어) · Patient 환자 ({language.nameInNative})
            </p>
          </div>
        )}

        {chatMessages.map((msg) => {
          // The non-Korean rendering of the message: doctor messages are
          // translated INTO the patient's language, patient messages were
          // already SPOKEN in the patient's language. In both cases the
          // patient-language string is the one we want to read aloud.
          const patientLangText =
            msg.speaker === "doctor" ? msg.translatedText : msg.originalText;
          return (
            <div
              key={msg.id}
              className={`flex ${
                msg.speaker === "doctor" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className="max-w-[80%] p-4"
                style={{
                  background:
                    msg.speaker === "doctor"
                      ? "var(--gh-cloud)"
                      : "rgba(52, 212, 176, 0.18)",
                  borderRadius: "var(--gh-r-md)",
                  borderTopLeftRadius:
                    msg.speaker === "doctor" ? "var(--gh-r-xs)" : undefined,
                  borderTopRightRadius:
                    msg.speaker === "patient" ? "var(--gh-r-xs)" : undefined,
                }}
              >
                <p
                  className="text-xs font-semibold mb-1 uppercase"
                  style={{
                    color: "var(--gh-steel)",
                    letterSpacing: "var(--gh-tracking-label)",
                  }}
                >
                  {msg.speaker === "doctor" ? "Doctor · 의사" : "Patient · 환자"}
                </p>
                <p
                  className="text-xl font-semibold leading-relaxed"
                  style={{ color: "var(--gh-ink)" }}
                >
                  {msg.originalText}
                </p>
                <p
                  className="text-lg mt-2 pt-2 leading-relaxed"
                  style={{
                    color: "var(--gh-blue-deep)",
                    borderTop: "1px solid rgba(14, 26, 43, 0.12)",
                  }}
                >
                  → {msg.translatedText}
                </p>
                {patientLangText && (
                  <button
                    type="button"
                    onClick={() => doctorTTS.speak(patientLangText)}
                    aria-label="Read patient-language text aloud"
                    className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors"
                    style={{ color: "var(--gh-blue)" }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                    {language.nameInNative}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {translating && (
          <div
            className="text-center text-sm animate-pulse"
            style={{ color: "var(--gh-steel)" }}
          >
            통역 중… · Translating…
          </div>
        )}

        {activeSide && (
          <div
            className={`flex ${
              activeSide === "doctor" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className="max-w-[80%] p-4"
              style={{
                background: "rgba(52, 212, 176, 0.14)",
                border: "1px solid rgba(52, 212, 176, 0.4)",
                borderRadius: "var(--gh-r-md)",
              }}
            >
              <span className="gh-live-dot mb-2">
                {liveMode ? "Live · 실시간" : "Listening · 듣는 중"}
              </span>
              {liveMode ? (
                <>
                  <p className="text-base mt-2" style={{ color: "var(--gh-steel)" }}>
                    {activeSide === "doctor"
                      ? doctorLive.partialInput
                      : patientLive.partialInput}
                  </p>
                  <p
                    className="text-lg font-semibold mt-1"
                    style={{ color: "var(--gh-ink)" }}
                  >
                    →{" "}
                    {activeSide === "doctor"
                      ? doctorLive.partialOutput
                      : patientLive.partialOutput}
                  </p>
                </>
              ) : (
                <p
                  className="text-lg mt-2"
                  style={{ color: "var(--gh-ink)" }}
                >
                  {activeSide === "doctor"
                    ? doctorSTT.transcript
                    : patientSTT.transcript}
                </p>
              )}
            </div>
          </div>
        )}

        {!activeSide && (doctorSTT.isProcessing || patientSTT.isProcessing) && (
          <div
            className="text-center text-sm animate-pulse"
            style={{ color: "var(--gh-blue)" }}
          >
            음성을 변환하고 있습니다… · Transcribing…
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Error Display */}
      {(doctorSTT.error || patientSTT.error || doctorLive.error || patientLive.error) && (
        <div
          className="text-sm px-3 py-2 mx-4"
          style={{
            color: "var(--gh-danger)",
            background: "rgba(215, 38, 61, 0.08)",
            border: "1px solid rgba(215, 38, 61, 0.25)",
            borderRadius: "var(--gh-r-sm)",
          }}
          role="alert"
        >
          ⚠ {doctorSTT.error || patientSTT.error || doctorLive.error || patientLive.error}
        </div>
      )}

      {/* Mic Controls */}
      <div
        className="grid grid-cols-2 gap-4 pt-4 no-print"
        style={{ borderTop: "1px solid var(--gh-cloud)" }}
      >
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-sm font-extrabold"
            style={{ color: "var(--gh-blue-deep)" }}
          >
            Doctor · 의사
          </p>
          <p className="text-xs" style={{ color: "var(--gh-steel)" }}>한국어</p>
          <MicrophoneButton
            isListening={activeSide === "doctor"}
            onClick={handleDoctorMic}
            disabled={translating || doctorSTT.isProcessing || patientSTT.isProcessing}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendText("doctor");
            }}
            className="w-full flex items-end gap-1.5 mt-1"
          >
            <textarea
              value={doctorText}
              onChange={(e) => setDoctorText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText("doctor");
                }
              }}
              rows={1}
              dir="ltr"
              lang="ko-KR"
              placeholder="한국어로 입력…"
              disabled={translating || liveMode}
              className="gh-input flex-1 min-w-0 resize-none disabled:opacity-60"
              style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }}
            />
            <button
              type="submit"
              disabled={translating || liveMode || !doctorText.trim()}
              aria-label="Send · 보내기"
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors"
              style={{
                background: "var(--gh-blue)",
                color: "var(--gh-white)",
                boxShadow: "var(--gh-shadow-cta)",
                opacity: translating || liveMode || !doctorText.trim() ? 0.4 : 1,
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p
            className="text-sm font-extrabold"
            style={{ color: "#0E8C68" }}
          >
            Patient · 환자
          </p>
          <p className="text-xs" style={{ color: "var(--gh-steel)" }}>
            {language.nameInNative}
          </p>
          <MicrophoneButton
            isListening={activeSide === "patient"}
            onClick={handlePatientMic}
            disabled={translating || doctorSTT.isProcessing || patientSTT.isProcessing}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendText("patient");
            }}
            className="w-full flex items-end gap-1.5 mt-1"
          >
            <KeyboardTextarea
              value={patientText}
              onValueChange={setPatientText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText("patient");
                }
              }}
              rows={1}
              dir={language.dir}
              lang={language.bcp47}
              placeholder={`${language.nameInNative}…`}
              disabled={translating || liveMode}
              className="gh-input flex-1 min-w-0 resize-none disabled:opacity-60"
              style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }}
            />
            <button
              type="submit"
              disabled={translating || liveMode || !patientText.trim()}
              aria-label="Send · 보내기"
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors"
              style={{
                background: "var(--gh-mint)",
                color: "var(--gh-ink)",
                boxShadow: "0 8px 24px rgba(52, 212, 176, 0.3)",
                opacity: translating || liveMode || !patientText.trim() ? 0.4 : 1,
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
