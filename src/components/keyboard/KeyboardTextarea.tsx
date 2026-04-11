"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { useKeyboardContext } from "./VirtualKeyboardProvider";

type NativeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

interface KeyboardTextareaProps extends NativeTextareaProps {
  /** Externally controlled value */
  value: string;
  /** Setter for the value — used by the virtual keyboard */
  onValueChange: (value: string) => void;
  /** Forwarded ref (optional) */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Drop-in replacement for <textarea> that connects to the
 * virtual keyboard.  On focus it suppresses the OS keyboard
 * via `inputMode="none"` and shows the app keyboard instead.
 */
export default function KeyboardTextarea({
  value,
  onValueChange,
  textareaRef,
  onFocus,
  onBlur,
  ...rest
}: KeyboardTextareaProps) {
  const {
    show,
    hide,
    registerInput,
    isVisible,
    notifyInputChanged,
  } = useKeyboardContext();
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = textareaRef ?? internalRef;

  // When this textarea gains focus, register it with the provider
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      registerInput(ref.current, onValueChange);
      show();
      onFocus?.(e);
    },
    [registerInput, ref, onValueChange, show, onFocus],
  );

  // Whenever the controlled value changes (typing, voice input, parent
  // clearing after send) tell the provider so that VirtualKeyboard can
  // re-run its sync effect and update its internal buffer. Without this,
  // the keyboard buffer drifts away from the textarea and subsequent
  // keystrokes append onto a stale value.
  useEffect(() => {
    notifyInputChanged();
  }, [value, notifyInputChanged]);

  // Assign ref
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      if (textareaRef) {
        (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      }
    },
    [textareaRef],
  );

  return (
    <textarea
      ref={setRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onFocus={handleFocus}
      inputMode="none"
      {...rest}
    />
  );
}
