"use client";

// 🐱 ดูดวงแมว — ตำราแมวศุภลักษณ์ 17 ชนิด + ชั้นธาตุ (เฟส 1 · 6 ก.ย. 2569)
// โทน ☀️ หินอ่อน (หน้าข้อมูล) · engine ฝั่ง client ฿0 (ผลขึ้นทันที) · AI เรียบเรียงผ่าน /api/cat
// (ล็อกอิน · ฟรีครั้งแรก · แล้ว 20 เครดิต — server คำนวณใหม่จาก input ดิบ ไม่เชื่อผลจาก client)
// 🔴 เล่าเฉพาะด้านมงคล ไม่มีคำตัดสินร้าย (ผู้ใช้ตัดสิน) · ไม่เกี่ยวสุขภาพสัตว์

import { useEffect, useMemo, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import ModeFeedback from "../_components/ModeFeedback";
import { useStoredProfile } from "../_components/useStoredProfile";
import { calculateElementSeed, type Element5 } from "@/lib/engine/element";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import {
  CAT_COATS,
  CAT_MARKS,
  CAT_EYES,
  CAT_TAMRA,
  catReading,
  type CatReading,
} from "@/lib/engine/cat-tamra";
import styles from "./cat.module.css";

const ZODIAC_ANIMALS = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];
const zodiacFromYear = (y: number) => ZODIAC_ANIMALS[(((y - 2020) % 12) + 12) % 12];

/** แต้ม/ลายเสริมที่เกี่ยวกับสีขนแต่ละกลุ่ม (ตัวเลือกไม่เกี่ยวไม่ต้องโชว์ให้รก) */
const MARKS_FOR_COAT: Record<string, string[]> = {
  black_white_marks: [
    "none", "white_collar", "white_collar_mouth", "white_mouth", "white_paws4",
    "white_nose_dot", "white_ears", "white_speckled", "white_chest_belly_face", "white_stripe_back",
  ],
  white_black_marks: ["none", "nine_black_spots", "black_eye_rings", "black_chest_band"],
};

export default function CatPage() {
  const { profile } = useStoredProfile();
  const [coat, setCoat] = useState("");
  const [mark, setMark] = useState("none");
  const [eye, setEye] = useState("unknown");
  const [catName, setCatName] = useState("");
  const [ownerBirth, setOwnerBirth] = useState("");
  const [result, setResult] = useState<CatReading | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<{ text: string; needsLogin?: boolean; topup?: boolean } | null>(null);

  // prefill วันเกิดเจ้าของจากบัญชี (เฉพาะช่องว่าง — แพทเทิร์นเดียวทุกหน้า)
  useEffect(() => {
    if (profile?.birth_date && !ownerBirth) setOwnerBirth(profile.birth_date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const marks = MARKS_FOR_COAT[coat] ?? null;

  const owner = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ownerBirth);
    if (!m) return null;
    const year = Number(m[1]);
    if (year > 2400 || year < 1900) return null;
    const s = calculateElementSeed({
      day_of_week: thaiDayOfWeek(ownerBirth),
      birth_month: Number(m[2]),
      birth_year_ad: year,
      birth_day: Number(m[3]),
      zodiac_year_animal: zodiacFromYear(year),
    });
    return { dominant: s.dominant as Element5, missing: s.missing as Element5[] };
  }, [ownerBirth]);

  function compute(e: React.FormEvent) {
    e.preventDefault();
    if (!coat) return;
    setReply(null);
    setAiErr(null);
    setResult(catReading({ coat, mark: marks ? mark : null, eye, catName: catName || null, owner }));
  }

  async function narrate() {
    if (aiBusy || !result) return;
    setAiBusy(true);
    setAiErr(null);
    try {
      const res = await fetch("/api/cat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coat, mark: marks ? mark : undefined, eye, catName: catName || undefined, ownerBirthDate: ownerBirth || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        setAiErr({ text: d.message ?? d.error ?? "ไม่สำเร็จ", needsLogin: d.needsLogin || d.needsUpgrade, topup: d.quotaExceeded });
      } else {
        setReply(d.reply);
      }
    } catch {
      setAiErr({ text: "เชื่อมต่อไม่สำเร็จ ลองอีกครั้งนะคะ" });
    } finally {
      setAiBusy(false);
    }
  }

  const score = result?.chemistry?.final_score ?? null;

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <MascotLogo size={72} />
        <h1 className={styles.h2} style={{ fontSize: "1.5rem" }}>🐱 ดูดวงแมว — ตำราแมวศุภลักษณ์</h1>
        <p className={styles.sub}>
          เลือกลักษณะแมวของคุณ ระบบเทียบกับตำราแมวมงคล 17 ชนิดจากสมุดข่อยโบราณ พร้อมธาตุจากสีขน
          และความเข้ากันกับดวงเจ้าของ — อาจารย์ลาลาเป็นแมวกวัก เรื่องนี้ถนัดที่สุดค่ะ
        </p>
      </header>

      <section className={styles.panel}>
        <h2 className={styles.h2}>1. ลักษณะแมวของคุณ</h2>
        <form onSubmit={compute}>
          <label className={styles.field}>
            <span>สีขนหลัก</span>
            <select className={styles.input} value={coat} onChange={(e) => { setCoat(e.target.value); setMark("none"); }}>
              <option value="">— เลือกสีขน —</option>
              {Object.entries(CAT_COATS).map(([k, v]) => (
                <option key={k} value={k}>{v.th}</option>
              ))}
            </select>
          </label>
          {marks && (
            <label className={styles.field}>
              <span>ตำแหน่งแต้ม/ลาย (ช่วยแยกชนิดในตำรา)</span>
              <select className={styles.input} value={mark} onChange={(e) => setMark(e.target.value)}>
                {marks.map((k) => (
                  <option key={k} value={k}>{CAT_MARKS[k as keyof typeof CAT_MARKS].th}</option>
                ))}
              </select>
            </label>
          )}
          <label className={styles.field}>
            <span>สีตา</span>
            <select className={styles.input} value={eye} onChange={(e) => setEye(e.target.value)}>
              {Object.entries(CAT_EYES).map(([k, v]) => (
                <option key={k} value={k}>{v.th}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>ชื่อแมว (ไม่บังคับ — ดูธาตุจากชื่อ)</span>
            <input className={styles.input} value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="เช่น ส้มโอ" maxLength={40} />
          </label>
          <label className={styles.field}>
            <span>วันเกิดเจ้าของ (ไม่บังคับ — ดูความเข้ากันของธาตุ) {profile?.birth_date && ownerBirth === profile.birth_date ? "✓ เติมจากบัญชี" : ""}</span>
            <input className={styles.input} type="date" value={ownerBirth} onChange={(e) => setOwnerBirth(e.target.value)} />
          </label>
          <button type="submit" className={styles.btn} disabled={!coat}>เปิดตำราแมว 🐾</button>
        </form>
      </section>

      {result && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>2. ผลจากตำรา</h2>
          <div className={styles.elCard}>
            <p className={styles.elTitle}>{result.inTamra ? "📜" : "🐈"} {result.titleTh}</p>
            <p className={styles.kv}><b>ลักษณะ:</b> {result.traitsTh}</p>
            <p className={styles.kv}><b>คุณตามตำรา:</b> {result.boonTh}</p>
            {result.match.eyeNoteTh && <p className={styles.note}>👁 {result.match.eyeNoteTh}</p>}
            {!result.inTamra && result.match.breed && (
              <p className={styles.note}>ℹ️ ขาวมณีเป็นแมวไทยยุคหลัง — ไม่อยู่ในสมุดข่อย 17 ชนิด แต่หลายแหล่งนับรวมเป็นแมวมงคล</p>
            )}
          </div>

          <h3 className={styles.h3}>ธาตุของแมวและความเข้ากัน</h3>
          {result.element ? (
            <p className={styles.kv}>
              🐾 ธาตุแมว: <b>{result.element.elementTh}</b> (จากสีขน{result.element.colorTh})
            </p>
          ) : (
            <p className={styles.kv}>🐾 ขนหลายสี — ระบุธาตุเดียวไม่ได้ (อ่านผ่านตำราอย่างเดียว)</p>
          )}
          {result.chemistry && (
            <p className={styles.kv}>
              💞 เคมีกับดวงคุณ: <b>{score! >= 0 ? "+" : ""}{score}</b> — {result.chemistry.relation_th}
            </p>
          )}
          {!owner && <p className={styles.note}>กรอกวันเกิดเจ้าของเพื่อดูความเข้ากันของธาตุแมวกับดวงคุณ</p>}
          {result.colorTipTh && <p className={styles.kv}>🎀 {result.colorTipTh}</p>}
          {result.nameLayer && (
            <p className={styles.kv}>
              🏷 ชื่อ &quot;{catName}&quot; → ธาตุ{result.nameLayer.elementTh} · เข้ากับดวงคุณ {result.nameLayer.fit.final_score >= 0 ? "+" : ""}{result.nameLayer.fit.final_score} ({result.nameLayer.fit.relation_th})
            </p>
          )}

          <div style={{ marginTop: "0.9rem" }}>
            {reply ? (
              <div className={styles.elCard}>
                <p className={styles.elTitle}>🐱 อาจารย์ลาลา ลักกี้ เล่าดวงแมว</p>
                {reply.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className={styles.kv} style={{ whiteSpace: "pre-wrap" }}>{para}</p>
                ))}
              </div>
            ) : (
              <>
                <button type="button" className={styles.btn} onClick={narrate} disabled={aiBusy}>
                  {aiBusy ? "แม่หมอกำลังเล่า…" : "ให้อาจารย์ลาลาเล่าดวงแมวให้ฟัง (ฟรีครั้งแรก · แล้ว 20 เครดิต)"}
                </button>
                {aiErr && (
                  <p className={styles.error} style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
                    {aiErr.text}{" "}
                    {aiErr.needsLogin && <a href="/login?next=/cat">เข้าสู่ระบบ →</a>}
                    {aiErr.topup && <a href="/account">⭐ เติมเครดิต →</a>}
                  </p>
                )}
              </>
            )}
          </div>

          <p className={styles.note} style={{ marginTop: "0.9rem" }}>
            {result.caveats.map((c, i) => (
              <span key={i}>⚠️ {c}<br /></span>
            ))}
          </p>
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.h2}>แมวมงคล 17 ชนิดในตำรา</h2>
        <p className={styles.note}>ลักษณะโดยย่อจากสมุดข่อย — ลองเทียบกับแมวที่บ้านดูค่ะ</p>
        <ul style={{ paddingLeft: "1.2rem", margin: "0.4rem 0 0", fontSize: "0.85rem", lineHeight: 1.7 }}>
          {CAT_TAMRA.map((b) => (
            <li key={b.key}>
              <b>{b.nameTh}</b>{b.aliasTh ? ` (${b.aliasTh})` : ""}{b.inTamra ? "" : " — นอกสมุดข่อย"}: {b.traitsTh} · <i>{b.boonTh}</i>
            </li>
          ))}
        </ul>
      </section>

      <ModeFeedback logicId={22} />
    </div>
  );
}
