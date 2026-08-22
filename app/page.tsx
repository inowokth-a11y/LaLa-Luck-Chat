"use client";

// หน้าแรก = ประตูเดียวสู่การ์ดใบแรก (flow ใหม่ 1 ส.ค. 2569 — ผู้ใช้ออกแบบ)
//   ยังไม่ล็อกอิน: ฟอร์ม Logic 1 → /consent (PDPA) → เลือกช่องทางเข้า → /welcome (ฉากคำนวณ)
//   ล็อกอินแล้ว: ข้ามฟอร์ม → ปุ่ม "ดูการ์ดของฉัน" + เมนูเครื่องมือ
// 🔴 ข้อมูลที่กรอกยังอยู่แค่ในเครื่อง (sessionStorage) จนกว่าจะยินยอม PDPA — ค่อยบันทึกที่ /welcome

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MascotLogo from "./_components/MascotLogo";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";
import { saveIntake } from "./_components/intake";

const GENDER_OPTIONS = [
  { value: "", label: "ไม่ระบุ" },
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "other", label: "อื่นๆ / LGBTQ+" },
];

const TOOLS: { href: string; label: string }[] = [
  { href: "/dream", label: "🌙 ทำนายฝัน" },
  { href: "/soulmate", label: "💞 ความรักและเนื้อคู่" },
  { href: "/chat", label: "💬 ถามอาจารย์ลาลา ลักกี้ (วิเคราะห์อิสระ)" },
  // "ดวงของฉัน" (/fortune) ถอดปุ่มตามคำสั่งผู้ใช้ 22 ส.ค. 2569 (ซ้ำซ้อนกับ flow การ์ด+แชท)
  // — ตัวหน้ายังอยู่ (SEO/sitemap เข้าถึงได้ตรง) แค่ไม่โชว์ในเมนู
  { href: "/compatibility", label: "🤝 ทำนายแบบองค์รวม บ้าน-ทะเบียนรถ-เบอร์โทร" },
  { href: "/timing", label: "📅 ดูฤกษ์ดี" },
  { href: "/fengshui", label: "🧭 ฮวงจุ้ย" },
  { href: "/oracle", label: "🎴 เสี่ยงทาย" },
  { href: "/wellness", label: "🥗 อาหาร & กิจกรรมตามธาตุ" },
  { href: "/logo", label: "🎨 สร้างโลโก้ตามดวง" },
  { href: "/wellbeing", label: "💙 เช็คสุขภาวะ" },
];

const S = {
  input: {
    width: "100%",
    padding: "0.65rem 0.8rem",
    border: "1px solid var(--gold-dim, #cbb98f)",
    borderRadius: 8,
    background: "var(--card-bg, #fffdf8)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans-thai)",
    fontSize: "0.95rem",
  } as React.CSSProperties,
  label: { display: "block", textAlign: "left", fontSize: "0.82rem", color: "var(--ink-dim)", margin: "0.7rem 0 0.25rem" } as React.CSSProperties,
  gold: {
    fontFamily: "var(--font-sans-thai)",
    color: "#fffdf8",
    fontWeight: 700,
    background: "linear-gradient(135deg, #d4a52f, var(--gold) 55%, #8a6608)",
    border: "1px solid #8a6608",
    padding: "0.85rem 1.6rem",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: "1.02rem",
    width: "100%",
    boxShadow: "0 4px 14px rgba(150, 112, 10, 0.35)",
    textShadow: "0 1px 2px rgba(90, 60, 0, 0.35)",
  } as React.CSSProperties,
};

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setLoggedIn(Boolean(data.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const year = Number(birthDate.slice(0, 4));
    if (!firstName.trim()) return setError("กรุณากรอกชื่อ");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return setError("กรุณาเลือกวันเกิด");
    if (year > 2400) return setError(`ปีเกิดดูเป็น พ.ศ. (${year}) — กรุณากรอกเป็น ค.ศ. เช่น ${year - 543}`);
    const nowYear = new Date().getUTCFullYear();
    if (year < 1900 || year > nowYear) return setError(`ปีเกิด ${year} อยู่นอกช่วงที่รองรับ`);

    saveIntake({ firstName: firstName.trim(), lastName: lastName.trim(), birthDate, birthTime, gender });
    router.push("/consent");
  }

  return (
    <main
      className="tone-marble bg-triskele"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        color: "var(--ink)",
        textAlign: "center",
        padding: "2rem 1rem 3rem",
      }}
    >
      <div className="gold-frame" style={{ width: "100%", maxWidth: 430 }}>
        <div className="gold-frame-inner" style={{ padding: "1.6rem 1.3rem 1.5rem" }}>
          <MascotLogo size={130} />
          <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.85rem", color: "var(--gold)", margin: "0.3rem 0 0" }}>
            LaLa Lucky Chat
          </h1>
          <p style={{ fontFamily: "var(--font-sans-thai)", color: "var(--ink-dim)", marginTop: "0.35rem", fontSize: "0.9rem" }}>
            คำนวณทุกมิติที่ส่งผลต่อกัน แพลตฟอร์มดูดวงที่ครอบคลุมที่สุด เชื่อมโยงมากที่สุด
          </p>

          {loggedIn === true && (
            <div style={{ marginTop: "1.1rem" }}>
              <p style={{ fontFamily: "var(--font-sans-thai)", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.6rem" }}>
                ✨ คุณเหมือนใครในตำนาน/ประวัติศาสตร์?
              </p>
              <button style={S.gold} onClick={() => router.push("/profile?auto=1")}>
                🔮 ใส่ข้อมูลเพื่อรับคำทำนาย
              </button>
            </div>
          )}

          {loggedIn === false && (
            <form onSubmit={onSubmit} style={{ marginTop: "0.9rem" }}>
              <p style={{ fontFamily: "var(--font-sans-thai)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                ✨ <b>คุณเหมือนใครในตำนาน/ประวัติศาสตร์?</b>
                <br />
                🐾 บอกแม่หมอหน่อย แล้วมาเปิด<b>การ์ดพลังงานประจำตัว</b>ของคุณกัน (ฟรี)
              </p>
              <label style={S.label}>ชื่อ *</label>
              <input style={S.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} required />
              <label style={S.label}>นามสกุล</label>
              <input style={S.input} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>วันเกิด (ค.ศ.) *</label>
                  <input style={S.input} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>เวลาเกิด (ถ้าทราบ)</label>
                  <input style={S.input} type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
                </div>
              </div>
              <label style={S.label}>เพศ (ไม่บังคับ)</label>
              <select style={S.input} value={gender} onChange={(e) => setGender(e.target.value)}>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {error && <p style={{ color: "var(--bad, #a83a1e)", fontSize: "0.85rem", marginTop: "0.6rem" }}>⚠️ {error}</p>}
              <button type="submit" style={{ ...S.gold, marginTop: "1rem" }}>
                🔮 ค้นหาการ์ดของฉัน
              </button>
              <p style={{ fontSize: "0.75rem", color: "var(--ink-dim)", marginTop: "0.5rem" }}>
                ขั้นถัดไปเราจะขอความยินยอมก่อน — ข้อมูลยังไม่ถูกส่งจนกว่าคุณจะกดยอมรับ
              </p>
            </form>
          )}
        </div>
      </div>

      <nav
        style={{
          marginTop: "0.3rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        <p style={{ fontFamily: "var(--font-sans-thai)", fontSize: "0.8rem", color: "var(--outer-ink-dim, var(--ink-dim))", margin: "0.2rem 0" }}>
          หรือสำรวจเครื่องมืออื่นของแม่หมอ
        </p>
        {TOOLS.map((t) => (
          <a
            key={t.href}
            href={t.href}
            style={{
              // ปรับให้เด่นขึ้น (ผู้ใช้สั่ง 10 ส.ค. 2569): ขอบทองเข้ม + ตัวหนา + เงาลึก
              fontFamily: "var(--font-sans-thai)",
              color: "#1d1812",
              fontWeight: 600,
              background: "var(--card-bg)",
              border: "1.5px solid var(--gold, #b8860b)",
              boxShadow: "0 3px 10px rgba(110, 82, 16, 0.22)",
              padding: "0.7rem 1.4rem",
              textDecoration: "none",
              borderRadius: "10px",
              fontSize: "0.95rem",
            }}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <p style={{ fontFamily: "var(--font-sans-thai)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
        {loggedIn === false && (
          <>
            <Link href="/login" style={{ color: "var(--outer-gold, var(--gold))", textDecoration: "underline" }}>
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
            {" · "}
          </>
        )}
        <Link href="/privacy" style={{ color: "var(--outer-ink-dim, var(--ink-dim))", textDecoration: "underline" }}>
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </main>
  );
}
