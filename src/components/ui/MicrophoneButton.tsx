"use client";

interface MicrophoneButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Microphone — primary blue idle, brand danger while recording
 * (BRAND.md §3 — coral is care, not danger).
 */
export default function MicrophoneButton({
  isListening,
  onClick,
  disabled,
}: MicrophoneButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200"
      style={{
        background: isListening ? "var(--gh-danger)" : "var(--gh-blue)",
        color: "var(--gh-white)",
        boxShadow: isListening
          ? "0 8px 24px rgba(215, 38, 61, 0.32)"
          : "var(--gh-shadow-cta)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      aria-label={
        isListening
          ? "녹음 중지 · Stop recording"
          : "녹음 시작 · Start recording"
      }
    >
      {isListening && (
        <span
          className="absolute inset-0 rounded-full mic-pulse"
          style={{ background: "rgba(215, 38, 61, 0.55)" }}
        />
      )}
      <svg
        className="w-6 h-6 relative z-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        {isListening ? (
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        ) : (
          <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
        )}
      </svg>
    </button>
  );
}
