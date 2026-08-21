"use client";

// ความรักและเนื้อคู่ (Logic 17 v1 — ห้ามโชว์คำว่า "Logic" ให้ผู้ใช้เห็น)
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — หน้าผลลัพธ์/ข้อมูล
//
// ขอบเขต v1 (ผู้ใช้เคาะ 21 ส.ค. 2569): 4 หัวข้อจากข้อมูลจริง (ข.2 + ดาวเจ้าเรือน + เคมีธาตุ + ทิศ)
// เพศคู่ที่สนใจ = ผู้ใช้เลือกเองเสมอ ห้ามเดา · ภาพ AI ต้องมีป้ายกำกับทุกรูป

import { useEffect, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import FunctionChat from "../_components/FunctionChat";
import { useStoredProfile } from "../_components/useStoredProfile";
import { provincesByRegion } from "@/lib/provinces";
import { syncAuthStatus } from "@/app/_components/AuthStatus";
import styles from "./soulmate.module.css";

interface ReadingResponse {
  reply?: string;
  reading?: {
    mode: "lagna" | "element";
    lagnaSign?: string;
    seventhSign?: string;
    partner?: { traits: string; strengths: string; weaknesses: string; thaiElement: string };
    chemistry?: { score: { final_score: number; relation_th: string }; supportDirections: string[] };
    rankedElements?: { thai: string; score: number; relation: string }[];
    supportDirections?: string[];
    caveats: string[];
  };
  error?: string;
  message?: string;
  needsLogin?: boolean;
  needsUpgrade?: boolean;
  quotaExceeded?: boolean;
  credits?: number | null;
}

export default function SoulmatePage() {
  const { profile } = useStoredProfile();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [province, setProvince] = useState("bangkok");
  const [partnerGender, setPartnerGender] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsTopup, setNeedsTopup] = useState(false);

  const [imgLoading, setImgLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imgDisclaimer, setImgDisclaimer] = useState("");
  const [imgError, setImgError] = useState<string | null>(null);

  // เติมจากบัญชีเฉพาะช่องที่ยังว่าง — ไม่ทับที่ผู้ใช้พิมพ์เอง (แพทเทิร์นเดียวกับ /profile)
  useEffect(() => {
    if (!profile) return;
    if (profile.birth_date && !birthDate) {
      setBirthDate(profile.birth_date);
      setPrefilled(true);
    }
    if (profile.birth_time && !birthTime) setBirthTime(profile.birth_time.slice(0, 5));
    if (profile.birth_province) setProvince(profile.birth_province);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsLogin(false);
    setNeedsTopup(false);
    setImages([]);
    setImgError(null);
    if (!partnerGender) return setError("กรุณาเลือกเพศคู่ที่สนใจก่อนค่ะ");
    const year = Number(birthDate.slice(0, 4));
    if (!year) return setError("กรุณากรอกวันเกิดให้ครบ");
    if (year > 2400) return setError("กรุณากรอกเป็น ค.ศ. (เช่น 1995) ไม่ใช่ พ.ศ.");

    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/soulmate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "reading",
          birthDate,
          birthTime: birthTime || undefined,
          province: birthTime ? province : undefined,
          partnerGender,
        }),
      });
      const data = (await r.json()) as ReadingResponse;
      if (r.status === 401) {
        setNeedsLogin(true);
        setError(data.error ?? "กรุณาเข้าสู่ระบบก่อนค่ะ");
      } else if (r.status === 429) {
        setNeedsTopup(true);
        setError(data.message ?? "สิทธิ์ฟรีหมดแล้วค่ะ");
      } else if (!r.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด");
      } else {
        setRes(data);
        syncAuthStatus();
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    } finally {
      setLoading(false);
    }
  }

  async function generateImages() {
    setImgError(null);
    setImgLoading(true);
    try {
      const r = await fetch("/api/soulmate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "images",
          birthDate,
          birthTime: birthTime || undefined,
          province: birthTime ? province : undefined,
          partnerGender,
        }),
      });
      const data = (await r.json()) as { images?: string[]; disclaimer?: string; error?: string; message?: string };
      if (!r.ok) {
        setImgError(data.message ?? data.error ?? "สร้างภาพไม่สำเร็จ");
      } else {
        setImages(data.images ?? []);
        setImgDisclaimer(data.disclaimer ?? "");
        syncAuthStatus();
      }
    } catch {
      setImgError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    } finally {
      setImgLoading(false);
    }
  }

  const reading = res?.reading;

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}>
          <MascotLogo size={84} />
        </div>
        <h1>💞 ความรักและเนื้อคู่</h1>
        <p className={styles.sub}>
          คำทำนายจากการคำนวณจริง — ลัคนา → ราศีคู่ครอง (ภพปัตนิ) ลักษณะนิสัยคู่ตามตำรา
          และเคมีธาตุของคุณ · ฟรีครั้งแรก
        </p>
      </header>

      <section className={styles.panel}>
        <h2 className={styles.h2}>ข้อมูลสำหรับคำนวณ</h2>
        <form onSubmit={submit}>
          <label className={styles.field}>
            <span>วันเกิด (ค.ศ.){prefilled ? " · ✓ เติมข้อมูลจากบัญชีของคุณ" : ""}</span>
            <input type="date" className={styles.input} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>เวลาเกิด (ถ้าทราบ — ใช้คำนวณลัคนา · ไม่ทราบก็ดูได้ แต่จะเป็นคำทำนายชั้นธาตุ)</span>
            <input type="time" className={styles.input} value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
          </label>
          {birthTime && (
            <label className={styles.field}>
              <span>จังหวัดที่เกิด (พิกัดมีผลกับลัคนา)</span>
              <select className={styles.input} value={province} onChange={(e) => setProvince(e.target.value)}>
                {provincesByRegion().map((g) => (
                  <optgroup key={g.region} label={g.region}>
                    {g.items.map((p) => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          <label className={styles.field}>
            <span>เพศคู่ที่สนใจ (ระบบจะไม่เดาให้)</span>
            <select className={styles.input} value={partnerGender} onChange={(e) => setPartnerGender(e.target.value)} required>
              <option value="">— เลือก —</option>
              <option value="male">ผู้ชาย</option>
              <option value="female">ผู้หญิง</option>
              <option value="any">ไม่ระบุ</option>
            </select>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          {needsLogin && (
            <div className={styles.ctaRow}>
              <a className={styles.ctaBtn} href="/login?next=/soulmate">เข้าสู่ระบบ / ผูกบัญชี →</a>
            </div>
          )}
          {needsTopup && (
            <div className={styles.ctaRow}>
              <a className={styles.ctaBtn} href="/account">⭐ เติมเครดิต →</a>
            </div>
          )}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "กำลังคำนวณ..." : "🔮 ดูคำทำนายเนื้อคู่"}
          </button>
          <p className={styles.note}>
            ฟรีครั้งแรก · ครั้งต่อไปใช้ 20 เครดิต — หัวข้อ รูปลักษณ์ / พื้นเพ / ฐานะ / อายุ /
            ช่วงเวลาที่จะพบ ยังไม่เปิด (รอข้อมูลจากตำราต้นทาง)
          </p>
        </form>
      </section>

      {res?.reply && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>คำทำนายเนื้อคู่ของคุณ</h2>
          {reading?.mode === "lagna" && reading.partner && (
            <div style={{ marginBottom: "1rem" }}>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>ลัคนาของคุณ</span>
                <span>ราศี{reading.lagnaSign}</span>
              </div>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>ราศีคู่ครอง (ภพปัตนิ)</span>
                <span>ราศี{reading.seventhSign} · ธาตุ{reading.partner.thaiElement}</span>
              </div>
              {reading.chemistry && (
                <div className={styles.factRow}>
                  <span className={styles.factLabel}>เคมีธาตุคุณ↔เขา</span>
                  <span>{reading.chemistry.score.relation_th} ({reading.chemistry.score.final_score >= 0 ? "+" : ""}{reading.chemistry.score.final_score})</span>
                </div>
              )}
            </div>
          )}
          <div className={styles.reply}>{res.reply}</div>
          {reading?.caveats?.length ? (
            <div className={styles.caveat}>{reading.caveats.map((c, i) => <p key={i}>⚠️ {c}</p>)}</div>
          ) : null}

          <div style={{ marginTop: "1.4rem" }}>
            <h2 className={styles.h2}>ภาพจินตนาการเนื้อคู่</h2>
            <p className={styles.note} style={{ marginTop: 0 }}>
              AI วาดจากบุคลิกและธาตุที่คำนวณ (3 รูป · 30 เครดิต) — เป็นภาพจินตนาการเท่านั้น
              ไม่ใช่บุคคลจริง และไม่ได้มาจากตำรา
            </p>
            {imgError && <p className={styles.error}>{imgError}</p>}
            {!images.length && (
              <button type="button" className={styles.ctaBtn} onClick={generateImages} disabled={imgLoading}>
                {imgLoading ? "กำลังวาดภาพ... (~15 วินาที)" : "🎨 สร้างภาพเนื้อคู่ (3 รูป · 30 เครดิต)"}
              </button>
            )}
            {images.length > 0 && (
              <div className={styles.imgGrid}>
                {images.map((url) => (
                  <figure key={url} className={styles.imgCard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="ภาพจินตนาการเนื้อคู่จาก AI" />
                    <figcaption className={styles.imgLabel}>🎨 {imgDisclaimer}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <FunctionChat
        logicId={17}
        context={res?.reading ?? null}
        placeholder="เช่น นิสัยแบบนี้ควรเริ่มทำความรู้จักยังไงดี"
      />
    </div>
  );
}
