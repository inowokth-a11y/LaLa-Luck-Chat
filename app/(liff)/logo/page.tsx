"use client";

// หน้าออกแบบโลโก้ (Logic 19 + fal) — ใส่ชื่อแบรนด์ → ระบบเลือกสไตล์ตามธาตุ → สร้างภาพ
// 🔴 ต้องล็อกอิน (route กันไว้ เพราะ fal เสียเงินจริง) · ธาตุมาจากโปรไฟล์ถ้ามี
// โทนสว่างหินอ่อน (§2 หน้าผลลัพธ์)

import { useState } from "react";
import Link from "next/link";
import { useStoredProfile } from "../_components/useStoredProfile";

type Variant = "preview" | "vector";

interface Result {
  imageUrl: string;
  prompt: string;
  element: string;
  variant: Variant;
  remaining: number;
  limit: number;
}

const THAI_EL: Record<string, string> = { Wood: "ไม้", Fire: "ไฟ", Earth: "ดิน", Metal: "ทอง", Water: "น้ำ" };

export default function LogoPage() {
  const { profile } = useStoredProfile();
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState<Variant>("preview");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  async function generate() {
    if (!brand.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNeedsLogin(false);
    try {
      const res = await fetch("/api/logo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandName: brand.trim(), variant }),
      });
      const d = await res.json();
      if (d.needsLogin) setNeedsLogin(true);
      else if (d.error || d.message) setError(d.error ?? d.message);
      else setResult(d as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const S = styles;
  return (
    <main className="tone-marble" style={S.page}>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <h1 style={S.h1}>ออกแบบโลโก้ตามธาตุ</h1>
        <p style={S.sub}>
          ใส่ชื่อแบรนด์ — ระบบเลือกรูปทรง/สีตาม<strong>ธาตุประจำตัวของคุณ</strong>
          {profile ? "" : " (เข้าสู่ระบบ + กรอกวันเกิดเพื่อให้ตรงกับธาตุคุณ)"}
        </p>
      </header>

      <div style={S.form}>
        <input
          style={S.input}
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="ชื่อแบรนด์ เช่น Lala Coffee"
          maxLength={60}
          disabled={busy}
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["preview", "vector"] as Variant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              style={{ ...S.chip, ...(variant === v ? S.chipActive : {}) }}
            >
              {v === "preview" ? "ตัวอย่างเร็ว (1 เครดิต)" : "เวกเตอร์ SVG (7 เครดิต)"}
            </button>
          ))}
        </div>
        <button style={S.gen} onClick={generate} disabled={busy || !brand.trim()}>
          {busy ? "กำลังสร้าง… (อาจใช้เวลาสักครู่)" : "สร้างโลโก้"}
        </button>
        <p style={S.note}>ช่วงทดลองสร้างได้ฟรีจำกัดจำนวนครั้ง · ต้องเข้าสู่ระบบก่อน</p>
      </div>

      {needsLogin && (
        <p style={S.err}>
          ต้องเข้าสู่ระบบก่อนสร้างโลโก้ — <Link href="/login?next=/logo" style={{ color: "var(--gold)" }}>เข้าสู่ระบบ</Link>
        </p>
      )}
      {error && <p style={S.err}>⚠️ {error}</p>}

      {result && (
        <section style={S.result}>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL ภายนอกชั่วคราวจาก fal ไม่เหมาะกับ next/image */}
          <img src={result.imageUrl} alt={`โลโก้ ${brand}`} style={S.img} />
          <p style={S.meta}>
            ธาตุ <strong style={{ color: "var(--gold)" }}>{THAI_EL[result.element] ?? result.element}</strong> ·
            {result.variant === "vector" ? " เวกเตอร์ (ใช้เชิงพาณิชย์ได้)" : " ตัวอย่าง"} · เหลือ {result.remaining}/{result.limit} ครั้ง
          </p>
          <a href={result.imageUrl} download target="_blank" rel="noreferrer" style={S.download}>ดาวน์โหลดภาพ</a>
          <details style={{ marginTop: "0.6rem" }}>
            <summary style={S.note}>ดู prompt ที่ใช้</summary>
            <p style={{ ...S.note, marginTop: "0.4rem" }}>{result.prompt}</p>
          </details>
        </section>
      )}

      <Link href="/chat" style={{ ...S.note, color: "var(--gold)", marginTop: "0.5rem" }}>← กลับไปแชท</Link>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg)", color: "var(--text,var(--ink))", maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.2rem 4rem", display: "flex", flexDirection: "column", gap: "1rem" },
  h1: { fontFamily: "var(--font-serif-thai)", fontSize: "1.7rem", color: "var(--gold)", margin: 0 },
  sub: { fontSize: "0.9rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: "0.7rem", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1.1rem", background: "color-mix(in srgb,var(--gold) 5%,transparent)" },
  input: { fontFamily: "var(--font-sans-thai)", fontSize: "0.95rem", padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  chip: { flex: 1, fontFamily: "var(--font-sans-thai)", fontSize: "0.82rem", padding: "0.55rem", borderRadius: 999, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer" },
  chipActive: { background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", borderColor: "var(--gold)", fontWeight: 600 },
  gen: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.95rem", padding: "0.75rem", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", cursor: "pointer" },
  note: { fontSize: "0.76rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  err: { color: "var(--bad,#a83a1e)", fontSize: "0.88rem" },
  result: { display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1.2rem" },
  img: { width: "100%", maxWidth: 320, aspectRatio: "1", objectFit: "contain", borderRadius: 8, background: "#fff" },
  meta: { fontSize: "0.85rem", color: "var(--text-dim,var(--ink-dim))", textAlign: "center" },
  download: { fontFamily: "var(--font-sans-thai)", fontSize: "0.88rem", color: "var(--gold)", textDecoration: "underline" },
};
