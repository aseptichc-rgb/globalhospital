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
  const { show, hide, registerInput, isVisible } = useKeyboardContext();
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

  // Sync keyboard internal buffer whenever our value changes
  // (e.g. voice input, clearing after send)
  useEffect(() => {
    // The keyboard syncs via the VirtualKeyboard component's useEffect
  }, [value]);

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
