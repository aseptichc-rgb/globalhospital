"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import "./keyboardTheme.css";
import { useKeyboardContext } from "./VirtualKeyboardProvider";
import { loadLayout } from "./keyboardLayouts";

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
  } = useKeyboardContext();

  const [layoutData, setLayoutData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [layoutName, setLayoutName] = useState("default");
  const keyboardRef = useRef<any>(null);

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
      if (button === "{enter}") {
        // Do nothing — let the textarea's onKeyDown handle Enter
      }
    },
    [],
  );

  // Sync keyboard input with textarea value when it changes externally
  useEffect(() => {
    if (keyboardRef.current && activeInputRef.current) {
      const currentVal = activeInputRef.current.value;
      keyboardRef.current.setInput(currentVal);
    }
  });

  const isRtl = RTL_LANGUAGES.has(languageCode);

  if (!layoutData) return null;

  return (
    <div
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
        physicalKeyboardHighlight
        physicalKeyboardHighlightPress
      />
    </div>
  );
}
