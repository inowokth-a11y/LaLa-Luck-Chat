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
  // 🔴 metadataBase จำเป็น — ไม่ตั้งแล้ว Next ใช้ VERCEL_URL (โดเมน vercel.app เก่า) ประกอบ URL รูป OG
  metadataBase: new URL("https://lalaluckychat.com"),
  title: "LaLa Lucky Chat",
  description: "คำนวณทุกมิติที่ส่งผลต่อกัน แพลตฟอร์มดูดวงที่ครอบคลุมที่สุด เชื่อมโยงมากที่สุด",
  openGraph: {
    title: "LaLa Lucky Chat — คำนวณทุกมิติที่ส่งผลต่อกัน",
    description: "คำนวณทุกมิติที่ส่งผลต่อกัน แพลตฟอร์มดูดวงที่ครอบคลุมที่สุด เชื่อมโยงมากที่สุด — เปิดการ์ดพลังงานประจำตัวฟรีกับอาจารย์ลาลา ลักกี้",
    siteName: "LaLa Lucky Chat",
    locale: "th_TH",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
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
