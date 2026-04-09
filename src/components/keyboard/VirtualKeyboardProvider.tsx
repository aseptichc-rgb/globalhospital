"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";

interface KeyboardContextValue {
  /** Whether the virtual keyboard is currently visible */
  isVisible: boolean;
  /** Show the virtual keyboard */
  show: () => void;
  /** Hide the virtual keyboard */
  hide: () => void;
  /** Register the active textarea so the keyboard can write into it */
  registerInput: (
    el: HTMLTextAreaElement | null,
    setValue: (v: string) => void,
  ) => void;
  /** Ref to the currently active textarea */
  activeInputRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Setter for the active textarea value */
  activeSetValue: React.RefObject<((v: string) => void) | null>;
  /** Current language code for layout selection */
  languageCode: string;
  /** Text direction */
  dir: "ltr" | "rtl";
  /** Height of the virtual keyboard in pixels (0 when hidden) */
  keyboardHeight: number;
  /** Set the keyboard height (called by VirtualKeyboard component) */
  setKeyboardHeight: (h: number) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboardContext() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error(
      "useKeyboardContext must be used inside VirtualKeyboardProvider",
    );
  }
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
  languageCode: string;
  dir: "ltr" | "rtl";
}

export default function VirtualKeyboardProvider({
  children,
  languageCode,
  dir,
}: ProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const activeInputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeSetValue = useRef<((v: string) => void) | null>(null);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => {
    setIsVisible(false);
    setKeyboardHeight(0);
  }, []);

  const registerInput = useCallback(
    (el: HTMLTextAreaElement | null, setValue: (v: string) => void) => {
      activeInputRef.current = el;
      activeSetValue.current = setValue;
    },
    [],
  );

  return (
    <KeyboardContext.Provider
      value={{
        isVisible,
        show,
        hide,
        registerInput,
        activeInputRef,
        activeSetValue,
        languageCode,
        dir,
        keyboardHeight,
        setKeyboardHeight,
      }}
    >
      {children}
    </KeyboardContext.Provider>
  );
}
