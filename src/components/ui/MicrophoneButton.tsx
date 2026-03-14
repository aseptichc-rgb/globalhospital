"use client";

interface MicrophoneButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

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
      className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
        isListening
          ? "bg-red-500 text-white"
          : "bg-primary-light text-white hover:bg-primary"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      aria-label={isListening ? "Stop recording" : "Start recording"}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-400 mic-pulse" />
      )}
      <svg
        className="w-6 h-6 relative z-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isListening ? (
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        ) : (
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
            />
          </>
        )}
      </svg>
    </button>
  );
}
