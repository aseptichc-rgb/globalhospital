"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session } from "@google/genai";

const SILENCE_THRESHOLD = 20;
const SILENCE_DURATION_MS = 1800;
const MIN_SPEECH_MS = 500;

export interface LiveSegment {
  id: string;
  inputTranscript: string;
  outputTranslation: string;
}

interface UseLiveInterpretationArgs {
  sourceLang: string;
  targetLang: string;
}

interface UseLiveInterpretationReturn {
  start: () => Promise<void>;
  stop: () => void;
  isListening: boolean;
  isConnecting: boolean;
  partialInput: string;
  partialOutput: string;
  lastSegment: LiveSegment | null;
  error: string | null;
  muteMic: (muted: boolean) => void;
}

// Concatenate Int16 PCM chunks into a base64 string for transport.
function int16ToBase64(view: Int16Array): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK))
    );
  }
  return btoa(binary);
}

export function useLiveInterpretation(
  args: UseLiveInterpretationArgs
): UseLiveInterpretationReturn {
  const { sourceLang, targetLang } = args;

  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialInput, setPartialInput] = useState("");
  const [partialOutput, setPartialOutput] = useState("");
  const [lastSegment, setLastSegment] = useState<LiveSegment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const hasSpokeRef = useRef(false);
  const muteRef = useRef(false);
  const pendingChunksRef = useRef<Int16Array[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Accumulators for the current turn.
  const turnInputRef = useRef("");
  const turnOutputRef = useRef("");

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {}
      sessionRef.current = null;
    }
    pendingChunksRef.current = [];
    hasSpokeRef.current = false;
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsListening(false);
    setIsConnecting(false);
    setPartialInput("");
    setPartialOutput("");
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  const finalizeSegment = useCallback(() => {
    const input = turnInputRef.current.trim();
    const output = turnOutputRef.current.trim();
    turnInputRef.current = "";
    turnOutputRef.current = "";
    setPartialInput("");
    setPartialOutput("");
    if (!input && !output) return;
    setLastSegment({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inputTranscript: input,
      outputTranslation: output,
    });
  }, []);

  const muteMic = useCallback((muted: boolean) => {
    muteRef.current = muted;
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setIsConnecting(true);
    turnInputRef.current = "";
    turnOutputRef.current = "";
    setPartialInput("");
    setPartialOutput("");

    let tokenData: { token: string; model: string; systemInstruction: string };
    try {
      const res = await fetch("/api/gemini/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLang, targetLang }),
      });
      if (!res.ok) throw new Error(`Token endpoint ${res.status}`);
      tokenData = await res.json();
    } catch (e) {
      setIsConnecting(false);
      setError(`토큰 발급 실패: ${(e as Error).message}`);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      setIsConnecting(false);
      const err = e as DOMException;
      setError(
        err.name === "NotAllowedError"
          ? "마이크 권한이 차단되었습니다."
          : `마이크 오류: ${err.message}`
      );
      return;
    }
    streamRef.current = stream;

    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioCtor({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    try {
      await audioContext.audioWorklet.addModule("/pcm-worklet.js");
    } catch (e) {
      cleanup();
      setIsConnecting(false);
      setError(`오디오 워크릿 로드 실패: ${(e as Error).message}`);
      return;
    }

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, "pcm-worklet");
    workletNodeRef.current = workletNode;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    source.connect(analyser);
    source.connect(workletNode);
    // Worklet output is not connected to destination — we only use postMessage.

    const ai = new GoogleGenAI({ apiKey: tokenData.token });

    let session: Session;
    try {
      session = await ai.live.connect({
        model: tokenData.model,
        config: {
          responseModalities: [Modality.TEXT],
          systemInstruction: tokenData.systemInstruction,
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {},
          onmessage: (message) => {
            const content = message.serverContent;
            if (!content) return;
            if (content.inputTranscription?.text) {
              turnInputRef.current += content.inputTranscription.text;
              setPartialInput(turnInputRef.current);
            }
            if (content.outputTranscription?.text) {
              turnOutputRef.current += content.outputTranscription.text;
              setPartialOutput(turnOutputRef.current);
            }
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.text) {
                  turnOutputRef.current += part.text;
                  setPartialOutput(turnOutputRef.current);
                }
              }
            }
            if (content.turnComplete) {
              finalizeSegment();
            }
          },
          onerror: (e: unknown) => {
            console.error("Live session error event:", e);
            const ev = e as {
              message?: string;
              reason?: string;
              code?: number;
              error?: { message?: string };
              type?: string;
            };
            const msg =
              ev?.message ||
              ev?.reason ||
              ev?.error?.message ||
              (ev?.code ? `code ${ev.code}` : "") ||
              ev?.type ||
              (typeof e === "string" ? e : JSON.stringify(e)) ||
              "알 수 없는 오류";
            setError(`Live 세션 오류: ${msg}`);
          },
          onclose: (e: unknown) => {
            console.warn("Live session closed:", e);
            const ev = e as { code?: number; reason?: string };
            if (ev?.reason || (ev?.code && ev.code !== 1000)) {
              setError(
                `Live 세션 종료: ${ev.reason || ""}${
                  ev.code ? ` (code ${ev.code})` : ""
                }`.trim()
              );
            }
            // Flush any pending turn when the server closes.
            finalizeSegment();
          },
        },
      });
    } catch (e) {
      cleanup();
      setIsConnecting(false);
      setError(`Live 연결 실패: ${(e as Error).message}`);
      return;
    }
    sessionRef.current = session;

    workletNode.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
      if (muteRef.current) return;
      pendingChunksRef.current.push(new Int16Array(ev.data));
    };

    // Flush batched PCM (~100ms) to the session.
    flushTimerRef.current = setInterval(() => {
      if (!sessionRef.current || pendingChunksRef.current.length === 0) return;
      const chunks = pendingChunksRef.current;
      pendingChunksRef.current = [];
      let total = 0;
      for (const c of chunks) total += c.length;
      const merged = new Int16Array(total);
      let off = 0;
      for (const c of chunks) {
        merged.set(c, off);
        off += c.length;
      }
      try {
        sessionRef.current.sendRealtimeInput({
          audio: {
            data: int16ToBase64(merged),
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } catch (e) {
        console.warn("sendRealtimeInput failed:", e);
      }
    }, 100);

    // Silence detection → force turn end so TTS downstream can fire.
    const dataArray = new Uint8Array(analyser.fftSize);
    speechStartRef.current = Date.now();
    const checkSilence = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const elapsed = Date.now() - speechStartRef.current;

      if (rms > SILENCE_THRESHOLD && !muteRef.current) {
        hasSpokeRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (
        hasSpokeRef.current &&
        elapsed > MIN_SPEECH_MS &&
        !silenceTimerRef.current &&
        !muteRef.current
      ) {
        silenceTimerRef.current = setTimeout(() => {
          // Signal end-of-utterance to Gemini Live. The server replies with
          // turnComplete, which finalizeSegment() handles in onmessage.
          try {
            sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
          } catch (e) {
            console.warn("audioStreamEnd failed:", e);
          }
          hasSpokeRef.current = false;
          speechStartRef.current = Date.now();
          silenceTimerRef.current = null;
        }, SILENCE_DURATION_MS);
      }
      animFrameRef.current = requestAnimationFrame(checkSilence);
    };
    animFrameRef.current = requestAnimationFrame(checkSilence);

    setIsConnecting(false);
    setIsListening(true);
  }, [sourceLang, targetLang, cleanup, finalizeSegment]);

  return {
    start,
    stop,
    isListening,
    isConnecting,
    partialInput,
    partialOutput,
    lastSegment,
    error,
    muteMic,
  };
}
