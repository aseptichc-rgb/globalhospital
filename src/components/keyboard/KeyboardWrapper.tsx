"use client";

import dynamic from "next/dynamic";
import VirtualKeyboardProvider from "./VirtualKeyboardProvider";

const VirtualKeyboard = dynamic(() => import("./VirtualKeyboard"), {
  ssr: false,
});

interface KeyboardWrapperProps {
  children: React.ReactNode;
  languageCode: string;
  dir: "ltr" | "rtl";
}

/**
 * Client-side wrapper that provides the virtual keyboard context
 * and renders the keyboard overlay. Used inside the server-rendered
 * [lang]/layout.tsx.
 */
export default function KeyboardWrapper({
  children,
  languageCode,
  dir,
}: KeyboardWrapperProps) {
  return (
    <VirtualKeyboardProvider languageCode={languageCode} dir={dir}>
      {children}
      <VirtualKeyboard />
    </VirtualKeyboardProvider>
  );
}
