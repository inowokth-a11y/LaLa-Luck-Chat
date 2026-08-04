"use client";

// ปุ่ม 🔊 อ่านคำตอบออกเสียง — TTS v1 ด้วย Web Speech API (ผู้ใช้ตัดสิน 4 ส.ค. 2569: ทาง ฿0)
//
// - เสียงมาจากเครื่องผู้ใช้เอง (iOS/Android/Chrome มีเสียงไทยในตัว) — ไม่มีต้นทุนเซิร์ฟเวอร์
// - เบราว์เซอร์ไม่รองรับ/ไม่มีเสียง = ไม่แสดงปุ่ม (ไม่พัง ไม่หลอกผู้ใช้)
// - อ่านทีละข้อความ: กดอันใหม่ = หยุดอันเก่า (speechSynthesis เป็น global คิวเดียว)
// ⚠️ ถ้าวันหนึ่งอัปเป็นเสียง cloud (Azure ฯลฯ ~฿0.58/ครั้ง) ต้องผ่านการตัดสินราคา §12 ก่อน

import { useEffect, useRef, useState } from "react";
import { speechText } from "@/lib/chat/speech-text";

export default function SpeakButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      // ออกจากหน้า/ข้อความถูกถอด — หยุดเสียงของเราถ้ายังพูดอยู่
      if (utterRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel(); // หยุดข้อความอื่นที่ค้าง — อ่านทีละอัน
    const u = new SpeechSynthesisUtterance(speechText(text));
    u.lang = "th-TH";
    // เลือกเสียงไทยถ้ามี (รายชื่อ voice โหลด async — ตอนกดปุ่มมักพร้อมแล้ว)
    const thai = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("th"));
    if (thai) u.voice = thai;
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? "หยุดอ่านออกเสียง" : "อ่านออกเสียง"}
      title={speaking ? "หยุดอ่าน" : "ฟังแม่หมออ่านให้"}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.85rem",
        opacity: 0.55,
        padding: "0.1rem 0.25rem",
        lineHeight: 1,
      }}
    >
      {speaking ? "⏹" : "🔊"}
    </button>
  );
}
