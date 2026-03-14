import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Hospital - 다국어 의료 통역 서비스",
  description:
    "외국인 환자를 위한 다국어 음성 통역 및 사전 문진 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-surface min-h-screen">{children}</body>
    </html>
  );
}
