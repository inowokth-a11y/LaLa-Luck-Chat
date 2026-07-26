"use client";

// หน้าออกแบบโลโก้ (Logic 19 + fal) — ใส่ชื่อแบรนด์ → เลือกสไตล์ตามธาตุ → สร้างภาพ
// 🔴 จุดต่างของแพลตฟอร์ม: โชว์ "คะแนนความสอดคล้อง/ขัดแย้ง" ของสไตล์แต่ละธาตุกับธาตุประจำตัว
//    (คำนวณด้วย wuXingScore ฟรี — ไม่เสียค่า gen) ให้ผู้ใช้เทียบก่อนเลือกสร้าง
// 🔴 ต้องล็อกอิน (route กันไว้ เพราะ fal เสียเงินจริง) · โทนสว่างหินอ่อน (§2)

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStoredProfile } from "../_components/useStoredProfile";
import { calculateElementSeed, wuXingScore, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { thaiDayOfWeek } from "@/lib/engine/card-id";

type Variant = "preview" | "vector";
const ELEMENTS: Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

interface Harmony {
  final_score: number;
  relation_th: string;
  productive_clash: boolean;
}
interface Result {
  imageUrl: string;
  contentType?: string;
  prompt: string;
  element: string;
  userElement: string | null;
  harmony: Harmony | null;
  variant: Variant;
  remaining: number;
  limit: number;
}

const ZODIAC = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"];
const zodiacFromYear = (y: number) => ZODIAC[(((y - 2020) % 12) + 12) % 12];

/** ธาตุประจำตัว + ธาตุที่ขาด จากวันเกิด (client-side, engine ล้วน) */
function userElementFrom(birthDate?: string | null): { dominant: Element5; missing: Element5[] } | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const year = +birthDate.slice(0, 4), month = +birthDate.slice(5, 7), day = +birthDate.slice(8, 10);
  const now = new Date().getUTCFullYear();
  if (year < 1900 || year > now) return null;
  try {
    const s = calculateElementSeed({ day_of_week: thaiDayOfWeek(birthDate), birth_month: month, birth_year_ad: year, birth_day: day, zodiac_year_animal: zodiacFromYear(year) });
    return { dominant: s.dominant, missing: s.missing };
  } catch {
    return null;
  }
}

/** ป้ายคะแนนความเข้ากัน */
function harmonyBadge(score: number): { emoji: string; text: string; color: string } {
  if (score >= 2) return { emoji: "★", text: "เสริมคุณมาก", color: "var(--good,#2f6b3f)" };
  if (score === 1) return { emoji: "◎", text: "กลมกลืน", color: "var(--gold)" };
  if (score === 0) return { emoji: "–", text: "กลาง", color: "var(--text-dim,#6b6255)" };
  if (score === -1) return { emoji: "▽", text: "สูบพลัง", color: "var(--text-dim,#6b6255)" };
  return { emoji: "⚠", text: "พิฆาต", color: "var(--bad,#a83a1e)" };
}

const extFromType = (ct?: string) => (ct?.includes("svg") ? "svg" : ct?.includes("png") ? "png" : ct?.includes("webp") ? "webp" : "jpg");
function downloadHref(result: Result, brand: string): string {
  const safeBrand = brand.trim().replace(/[^a-zA-Z0-9ก-๙._-]/g, "-").slice(0, 40) || "logo";
  const name = `logo-${safeBrand}-${result.variant}.${extFromType(result.contentType)}`;
  return `/api/logo/download?url=${encodeURIComponent(result.imageUrl)}&name=${encodeURIComponent(name)}`;
}

export default function LogoPage() {
  const { profile } = useStoredProfile();
  const me = useMemo(() => userElementFrom(profile?.birth_date), [profile]);

  const [brand, setBrand] = useState("");
  const [style, setStyle] = useState<Element5 | null>(null); // ธาตุสไตล์ที่เลือก
  const [extra, setExtra] = useState("");
  const [variant, setVariant] = useState<Variant>("preview");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  // ดีฟอลต์สไตล์ = ธาตุประจำตัว (กลมกลืนที่สุด) · คะแนนแต่ละธาตุเทียบกับธาตุเรา (ฟรี)
  const chosen = style ?? me?.dominant ?? "Earth";
  const scores = useMemo(() => {
    if (!me) return null;
    return Object.fromEntries(ELEMENTS.map((e) => [e, wuXingScore(me.dominant, e, me.missing).final_score])) as Record<Element5, number>;
  }, [me]);

  async function generate() {
    if (!brand.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNeedsLogin(false);
    try {
      const res = await fetch("/api/logo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandName: brand.trim(), variant, element: chosen, extra: extra.trim() }),
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
          ใส่ชื่อแบรนด์ → เลือกสไตล์ธาตุ — ระบบบอก<strong>คะแนนความเข้ากันกับธาตุประจำตัวคุณ</strong>ก่อนสร้าง
          {me ? "" : " (เข้าสู่ระบบ + กรอกวันเกิดเพื่อดูคะแนน)"}
        </p>
      </header>

      <div style={S.form}>
        <input style={S.input} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ชื่อแบรนด์ เช่น Lala Coffee" maxLength={60} disabled={busy} />

        {/* เลือกสไตล์ธาตุ + คะแนนความเข้ากัน (ฟรี) */}
        <div>
          <span style={S.label}>สไตล์ตามธาตุ {me && <span style={S.note}>(ธาตุคุณ: {THAI_LABEL_5[me.dominant]})</span>}</span>
          <div style={S.elGrid}>
            {ELEMENTS.map((el) => {
              const sc = scores?.[el];
              const b = sc !== undefined ? harmonyBadge(sc) : null;
              const active = chosen === el;
              return (
                <button key={el} type="button" onClick={() => setStyle(el)} style={{ ...S.elChip, ...(active ? S.elActive : {}) }}>
                  <strong>{THAI_LABEL_5[el]}</strong>
                  {b && <span style={{ fontSize: "0.68rem", color: active ? "inherit" : b.color }}>{b.emoji} {b.text}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <textarea style={S.textarea} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="ความต้องการเพิ่มเติม (ไม่บังคับ) เช่น มีรูปแก้วกาแฟ, สไตล์มินิมอล, โทนอบอุ่น" maxLength={200} rows={2} disabled={busy} />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["preview", "vector"] as Variant[]).map((v) => (
            <button key={v} type="button" onClick={() => setVariant(v)} style={{ ...S.chip, ...(variant === v ? S.chipActive : {}) }}>
              {v === "preview" ? "ตัวอย่างเร็ว (1 เครดิต)" : "เวกเตอร์ SVG (7 เครดิต)"}
            </button>
          ))}
        </div>
        <button style={S.gen} onClick={generate} disabled={busy || !brand.trim()}>
          {busy ? "กำลังสร้าง… (อาจใช้เวลาสักครู่)" : `สร้างโลโก้สไตล์${THAI_LABEL_5[chosen]}`}
        </button>
        <p style={S.note}>ช่วงทดลองสร้างได้ฟรีจำกัดจำนวนครั้ง · ต้องเข้าสู่ระบบก่อน</p>
      </div>

      {needsLogin && (
        <p style={S.err}>ต้องเข้าสู่ระบบก่อนสร้างโลโก้ — <Link href="/login?next=/logo" style={{ color: "var(--gold)" }}>เข้าสู่ระบบ</Link></p>
      )}
      {error && <p style={S.err}>⚠️ {error}</p>}

      {result && (
        <section style={S.result}>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL ภายนอกชั่วคราวจาก fal ไม่เหมาะกับ next/image */}
          <img src={result.imageUrl} alt={`โลโก้ ${brand}`} style={S.img} />
          <p style={S.meta}>
            สไตล์ธาตุ <strong style={{ color: "var(--gold)" }}>{THAI_LABEL_5[result.element as Element5] ?? result.element}</strong>
            {result.variant === "vector" ? " · เวกเตอร์ (ใช้เชิงพาณิชย์ได้)" : " · ตัวอย่าง"}
          </p>
          {result.harmony && (
            <p style={{ ...S.meta, color: harmonyBadge(result.harmony.final_score).color }}>
              {harmonyBadge(result.harmony.final_score).emoji} ความเข้ากับธาตุคุณ: {result.harmony.relation_th}
            </p>
          )}
          <a href={downloadHref(result, brand)} download style={S.download}>⬇ เซฟรูปโลโก้</a>
          <p style={S.note}>เหลือ {result.remaining}/{result.limit} ครั้ง (ช่วงทดลอง)</p>
          <details style={{ marginTop: "0.4rem", alignSelf: "stretch" }}>
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
  form: { display: "flex", flexDirection: "column", gap: "0.8rem", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1.1rem", background: "color-mix(in srgb,var(--gold) 5%,transparent)" },
  label: { fontSize: "0.82rem", color: "var(--text,var(--ink))", display: "block", marginBottom: "0.4rem" },
  input: { fontFamily: "var(--font-sans-thai)", fontSize: "0.95rem", padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  textarea: { fontFamily: "var(--font-sans-thai)", fontSize: "0.9rem", padding: "0.6rem 0.9rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))", resize: "vertical" },
  elGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(88px,1fr))", gap: "0.4rem" },
  elChip: { display: "flex", flexDirection: "column", gap: "0.15rem", alignItems: "center", padding: "0.5rem 0.3rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer", fontSize: "0.85rem" },
  elActive: { background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", borderColor: "var(--gold)" },
  chip: { flex: 1, fontFamily: "var(--font-sans-thai)", fontSize: "0.82rem", padding: "0.55rem", borderRadius: 999, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer" },
  chipActive: { background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", borderColor: "var(--gold)", fontWeight: 600 },
  gen: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.95rem", padding: "0.75rem", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", cursor: "pointer" },
  note: { fontSize: "0.76rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  err: { color: "var(--bad,#a83a1e)", fontSize: "0.88rem" },
  result: { display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1.2rem" },
  img: { width: "100%", maxWidth: 320, aspectRatio: "1", objectFit: "contain", borderRadius: 8, background: "#fff" },
  meta: { fontSize: "0.85rem", color: "var(--text-dim,var(--ink-dim))", textAlign: "center" },
  download: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.9rem", color: "var(--marble-bg,#f4f0e6)", background: "var(--gold)", padding: "0.6rem 1.4rem", borderRadius: 8, textDecoration: "none" },
};
