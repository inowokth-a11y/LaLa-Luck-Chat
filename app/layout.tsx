import type { Metadata } from "next";
import { Noto_Serif_Thai, Noto_Sans_Thai, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthStatus from "./_components/AuthStatus";
import RefTracker from "./_components/RefTracker";
import LalaFloat from "./_components/LalaFloat";

// Typography คงที่ทุกหน้า (CLAUDE.md §2)
const serifThai = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-serif-thai",
  display: "swap",
});
const sansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-sans-thai",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LaLa Lucky Chat",
  description: "แพลตฟอร์มดูดวง/ไลฟ์สไตล์ที่คำนวณจริง — ธาตุ โหราศาสตร์ไทย ตัวเลข",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${serifThai.variable} ${sansThai.variable} ${mono.variable}`}>
      <body>
        <AuthStatus />
        <RefTracker />
        <LalaFloat />
        {children}
      </body>
    </html>
  );
}
