"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import "./keyboardTheme.css";
import { useKeyboardContext } from "./VirtualKeyboardProvider";
import { loadLayout, IME_LANGUAGES } from "./keyboardLayouts";

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

const DISPLAY_LABELS: Record<string, string> = {
  "{bksp}": "⌫",
  "{enter}": "↵",
  "{shift}": "⇧",
  "{lock}": "⇪",
  "{tab}": "⇥",
  "{space}": " ",
};

export default function VirtualKeyboard() {
  const {
    isVisible,
    hide,
    activeInputRef,
    activeSetValue,
    languageCode,
    dir,
    setKeyboardHeight,
    inputRevision,
  } = useKeyboardContext();

  const containerElRef = useRef<HTMLDivElement | null>(null);

  const [layoutData, setLayoutData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [layoutName, setLayoutName] = useState("default");
  const keyboardRef = useRef<any>(null);

  // Track the last value we know about to prevent sync loops
  const lastKnownValue = useRef("");

  // Load layout when language changes
  useEffect(() => {
    let cancelled = false;
    loadLayout(languageCode).then((data) => {
      if (!cancelled) {
        setLayoutData(data);
        setLayoutName("default");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [languageCode]);

  const onChange = useCallback(
    (input: string) => {
      // Update our tracking ref so the sync effect knows not to re-set
      lastKnownValue.current = input;
      if (activeSetValue.current) {
        activeSetValue.current(input);
      }
      // Keep textarea cursor at end
      const el = activeInputRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = input.length;
        });
      }
    },
    [activeInputRef, activeSetValue],
  );

  const onKeyPress = useCallback(
    (button: string) => {
      if (button === "{shift}" || button === "{lock}") {
        setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
      }
    },
    [],
  );

  // Sync keyboard buffer with textarea value ONLY when they differ
  // (handles external changes like voice input or clearing after send).
  // Re-runs whenever the active textarea reports a value change via
  // `inputRevision`, so the buffer never drifts behind the textarea.
  useEffect(() => {
    if (!keyboardRef.current || !activeInputRef.current) return;
    const textareaVal = activeInputRef.current.value;
    if (textareaVal !== lastKnownValue.current) {
      lastKnownValue.current = textareaVal;
      keyboardRef.current.setInput(textareaVal);
    }
  }, [inputRevision, activeInputRef]);

  // Report keyboard height to context when visible
  useEffect(() => {
    if (isVisible && containerElRef.current) {
      const h = containerElRef.current.getBoundingClientRect().height;
      setKeyboardHeight(h);
    }
  }, [isVisible, layoutData, setKeyboardHeight]);

  const isRtl = RTL_LANGUAGES.has(languageCode);

  // IME languages (Chinese) use the OS native keyboard for composition.
  if (IME_LANGUAGES.has(languageCode)) return null;

  if (!layoutData) return null;

  return (
    <div
      ref={containerElRef}
      className={`keyboard-container ${isVisible ? "keyboard-visible" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
    >
      {/* Toolbar */}
      <div className="keyboard-toolbar">
        <div className="keyboard-toolbar-lang">
          <span>{dir === "rtl" ? "⌨️ RTL" : "⌨️"}</span>
        </div>
        <div className="keyboard-toolbar-actions">
          <button
            className="keyboard-close-btn"
            onClick={hide}
            aria-label="Close keyboard"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Keyboard */}
      <Keyboard
        keyboardRef={(r: any) => (keyboardRef.current = r)}
        layout={(layoutData as any).layout}
        layoutName={layoutName}
        onChange={onChange}
        onKeyPress={onKeyPress}
        display={DISPLAY_LABELS}
        mergeDisplay
        theme={`hg-theme-default kiosk-keyboard ${isRtl ? "kiosk-keyboard-rtl" : ""}`}
        preventMouseDownDefault
      />
    </div>
  );
}
