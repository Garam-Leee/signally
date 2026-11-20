import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "시그널리 | Signally",
  icons: { icon: { url: "/icons/brand/favicon.svg", type: "image/svg+xml" } },
  description: "우리 동네 신호를 한눈에",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
