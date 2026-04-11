"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Silence detection config
const SILENCE_THRESHOLD = 20; // RMS volume below this = silence (0-128 scale)
const SILENCE_DURATION_MS = 1800; // ~1.8s of silence to auto-stop
const MIN_RECORDING_MS = 500; // minimum recording time before auto-stop kicks in
// Hard cap: long recordings produce multi-MB webm blobs whose container
// metadata MediaRecorder fails to finalize, which Gemini rejects as an
// "invalid argument". Cut off any single turn at 60s.
const MAX_RECORDING_MS = 60000;

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
  isProcessing: boolean;
}

export function useSpeechRecognition(
  lang: string
): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Silence detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const animFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const hasSpokeRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      cleanupSilenceDetection();
    };
  }, [cleanupSilenceDetection]);

  const sendToGemini = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        // Nothing to upload — clear the processing latch that stopListening set.
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setError(null);
      try {
        console.log(
          `[STT client] sending blob size=${blob.size} type=${blob.type} lang=${lang}`
        );
        // Convert blob to base64
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Normalize MIME type (remove codecs parameter)
        const mimeType = blob.type.split(";")[0] || "audio/webm";

        const res = await fetch("/api/gemini/speech-to-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64,
            mimeType,
            lang,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `STT API error: ${res.status}`);
        }

        const data = await res.json();
        if (data.transcript) {
          setTranscript(data.transcript);
        }
      } catch (err) {
        console.error("Gemini STT error:", err);
        setError("음성 인식 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsProcessing(false);
      }
    },
    [lang]
  );

  const stopListening = useCallback(() => {
    cleanupSilenceDetection();

    // Latch into "processing" BEFORE flipping isListening so that consumers
    // (e.g. live-mode auto-rearm in InterpretationChat) don't see a window
    // where !isListening && !isProcessing && transcript === "" and decide to
    // throw away the audio that recorder.onstop is about to dispatch.
    const wasRecording =
      mediaRecorderRef.current?.state === "recording";
    if (wasRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current!.stop();
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setIsListening(false);
  }, [cleanupSilenceDetection]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("이 브라우저에서는 마이크를 지원하지 않습니다.");
      return;
    }

    // Re-entrancy guard: ignore if a recorder is already active for this hook
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setError(null);
    setTranscript("");
    chunksRef.current = [];
    hasSpokeRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const permErr = err as DOMException;
      if (permErr.name === "NotAllowedError") {
        setError(
          "마이크 접근이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
        );
      } else if (permErr.name === "NotFoundError") {
        setError(
          "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요."
        );
      } else {
        setError(`마이크 오류: ${permErr.message}`);
      }
      return;
    }

    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    // When recorder stops, combine all chunks into one complete file and send
    recorder.onstop = () => {
      const chunks = chunksRef.current;
      if (chunks.length > 0) {
        const completeBlob = new Blob(chunks, { type: chunks[0].type });
        chunksRef.current = [];
        sendToGemini(completeBlob);
      }
    };

    recorder.start(250); // Record in 250ms chunks for reliable data capture
    recordingStartTimeRef.current = Date.now();
    setIsListening(true);

    maxDurationTimerRef.current = setTimeout(() => {
      stopListening();
    }, MAX_RECORDING_MS);

    // Set up silence detection with Web Audio API
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.fftSize);

    const checkSilence = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteTimeDomainData(dataArray);

      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i] - 128; // center around 0
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      const elapsed = Date.now() - recordingStartTimeRef.current;

      if (rms > SILENCE_THRESHOLD) {
        // User is speaking
        hasSpokeRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (
        hasSpokeRef.current &&
        elapsed > MIN_RECORDING_MS &&
        !silenceTimerRef.current
      ) {
        // Silence detected after speech — start countdown
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, SILENCE_DURATION_MS);
      }

      animFrameRef.current = requestAnimationFrame(checkSilence);
    };

    animFrameRef.current = requestAnimationFrame(checkSilence);
  }, [isSupported, sendToGemini, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
    isProcessing,
  };
}
