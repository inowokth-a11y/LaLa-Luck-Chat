import type { Metadata } from "next";
import { Noto_Serif_Thai, Noto_Sans_Thai, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthStatus from "./_components/AuthStatus";

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
  title: "KRUTH ELEMENT",
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
        {children}
      </body>
    </html>
  );
}
