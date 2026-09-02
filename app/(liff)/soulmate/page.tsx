"use client";

// ความรักและเนื้อคู่ (Logic 17 v1 — ห้ามโชว์คำว่า "Logic" ให้ผู้ใช้เห็น)
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — หน้าผลลัพธ์/ข้อมูล
//
// ขอบเขต v1 (ผู้ใช้เคาะ 21 ส.ค. 2569): 4 หัวข้อจากข้อมูลจริง (ข.2 + ดาวเจ้าเรือน + เคมีธาตุ + ทิศ)
// เพศคู่ที่สนใจ = ผู้ใช้เลือกเองเสมอ ห้ามเดา · ภาพ AI ต้องมีป้ายกำกับทุกรูป

import { useEffect, useRef, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import FunctionChat from "../_components/FunctionChat";
import { useStoredProfile } from "../_components/useStoredProfile";
import { BODY_PREF, FACE_PREF, PERSONA_PREF } from "@/lib/engine/preference-match";
import { provincesByRegion } from "@/lib/provinces";
import { syncAuthStatus } from "@/app/_components/AuthStatus";
import { shareLinks } from "@/lib/share";
import { LOOK_STYLES, ART_STYLES, SKIN_TONES, SOULMATE_LOOK_NOTE } from "@/lib/engine/soulmate";
import styles from "./soulmate.module.css";

interface JyotishLayer {
  seventhSign: string;
  seventhLord: { grahaTh: string; house: number; houseMeaningTh: string; arenaTh: string };
  planetsIn7th: { grahaTh: string; traitTh: string }[];
  appearance: { th: string[]; en: string[] };
  darakaraka: { grahaTh: string; archetypeTh: string };
  upapada: { signTh: string; second: { signTh: string; occupantsTh: string[]; toneTh: string } };
  d9: { noteTh: string };
  nakshatra: { nameTh: string; idx: number };
  currentDasha: { mdTh: string; adTh: string } | null;
  windows: { fromTh: string; toTh: string; reasonTh: string }[];
  derived: {
    wealth: { signTh: string; toneTh: string };
    career: { signTh: string; lordTh: string; toneTh: string };
    roots: { signTh: string; toneTh: string };
  };
  caveats: string[];
}

interface ReadingResponse {
  reply?: string;
  jyotish?: JyotishLayer | null;
  convergence?: { label: string; detailTh: string } | null;
  preference?: {
    summaryTh: string;
    items: { tagTh: string; matchedByTh: string[]; chemistryTh: string | null }[];
    caveats: string[];
  } | null;
  dualPath?: {
    a: { key: string; elementTh: string; sourceTh: string; traitsTh: string; appearance: { faceTh: string; bodyTh: string }; styleTh: string; chemistry: { final_score: number; relation_th: string } };
    b: { key: string; elementTh: string; sourceTh: string; traitsTh: string; appearance: { faceTh: string; bodyTh: string }; styleTh: string; chemistry: { final_score: number; relation_th: string } };
    comparisonTh: string;
    caveats: string[];
  } | null;
  reading?: {
    mode: "lagna" | "element";
    lagnaSign?: string;
    seventhSign?: string;
    partner?: { traits: string; strengths: string; weaknesses: string; thaiElement: string };
    chemistry?: { score: { final_score: number; relation_th: string }; supportDirections: string[] };
    rankedElements?: { thai: string; score: number; relation: string }[];
    supportDirections?: string[];
    appearance?: { faceTh: string; bodyTh: string };
    nameLayer?: {
      elementTh: string;
      fit: { relation_th: string; final_score: number };
      namePower: number;
      card: { id: string; name: string | null };
      lens?: { partnerElementTh: string; traitsTh: string; appearance: { faceTh: string; bodyTh: string }; styleTh: string };
    } | null;
    caveats: string[];
  };
  error?: string;
  message?: string;
  needsLogin?: boolean;
  needsUpgrade?: boolean;
  quotaExceeded?: boolean;
  credits?: number | null;
}

interface MatchResponse {
  reply?: string;
  matchKoota?: {
    total: number; bandTh: string; aNakshatraTh: string; bNakshatraTh: string;
    kootas: { key: string; nameTh: string; got: number; max: number; noteTh: string }[];
    doshaFlags: string[]; caveats: string[];
  } | null;
  matchTiming?: {
    userWindows: { fromTh: string; toTh: string }[];
    partnerWindows: { fromTh: string; toTh: string }[];
    overlaps: { fromTh: string; toTh: string }[];
  } | null;
  match?: {
    partner: { dominantTh: string; missingTh: string[]; identityNumber: string };
    chemistry: { final_score: number; relation_th: string };
    coherence: { labelTh: string; avg: number; min: number; max: number; tone: string; weakest: { label: string; score: number }; strongest: { label: string; score: number } }[];
    patni: { userSeventh: string; partnerLagna: string; match: boolean } | null;
    nameLayer: { elementTh: string; fit: { relation_th: string; final_score: number }; namePower: number; card: { id: string; name: string | null } } | null;
    advice: { strengths: string[]; cautions: string[]; tips: string[] };
    caveats: string[];
  };
  error?: string;
  message?: string;
}

export default function SoulmatePage() {
  const { profile } = useStoredProfile();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [province, setProvince] = useState("bangkok");
  const [partnerGender, setPartnerGender] = useState("");
  const [ownName, setOwnName] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsTopup, setNeedsTopup] = useState(false);

  const [imgLoading, setImgLoading] = useState(false);
  const [images, setImages] = useState<{ url: string; caption: string }[]>([]);
  const [imgCaptions, setImgCaptions] = useState<string[]>([]);
  const [imgDisclaimer, setImgDisclaimer] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  // สัญชาติ/สไตล์ลุคของภาพ (preset เท่านั้น — ไม่ใช่คำทำนาย · โครงหน้า/วัยให้ AI จัดตามเหมาะสม)
  const [look, setLook] = useState("thai");
  // แท็กความชอบ (preset enum — Preference Overlap · 24 ส.ค. 2569)
  const [prefBody, setPrefBody] = useState("");
  const [prefFace, setPrefFace] = useState("");
  const [prefPersona, setPrefPersona] = useState("");
  // เลือกเส้นทางภาพ แบบ ก (ทางตำรา) / แบบ ข (ทางที่ใจเลือก) — เมื่อมีทางแยกจริง
  const [pathChoice, setPathChoice] = useState<"a" | "b">("a");
  const [prefSkin, setPrefSkin] = useState("");
  const [artStyle, setArtStyle] = useState("sketch");

  // เช็คกับคนที่คุณสนใจ (ผู้ใช้เคาะ 23 ส.ค. 2569) — ข้อมูลอีกฝ่ายไม่ถูกจัดเก็บ
  const [pBirthDate, setPBirthDate] = useState("");
  const [pBirthTime, setPBirthTime] = useState("");
  const [pProvince, setPProvince] = useState("bangkok");
  const [pName, setPName] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchRes, setMatchRes] = useState<MatchResponse | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  // เติมจากบัญชีเฉพาะช่องที่ยังว่าง — ไม่ทับที่ผู้ใช้พิมพ์เอง (แพทเทิร์นเดียวกับ /profile)
  useEffect(() => {
    if (!profile) return;
    if (profile.birth_date && !birthDate) {
      setBirthDate(profile.birth_date);
      setPrefilled(true);
    }
    if (profile.birth_time && !birthTime) setBirthTime(profile.birth_time.slice(0, 5));
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    if (fullName && !ownName) setOwnName(fullName);
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
          name: ownName.trim() || undefined,
          userGender: profile?.gender || undefined,
          prefBody: prefBody || undefined,
          prefFace: prefFace || undefined,
          prefPersona: prefPersona ? [prefPersona] : undefined,
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

  // เคาะ 2 ก.ย. 2569: ไม่มีทางแยก ก/ข = สร้างภาพให้เลยหลังคำทำนายขึ้น (ครั้งเดียวต่อชุดผล)
  const autoGenKey = useRef<string | null>(null);
  useEffect(() => {
    if (!res || res.dualPath || images.length || imgLoading) return;
    const key = JSON.stringify([birthDate, birthTime, partnerGender]);
    if (autoGenKey.current === key) return;
    autoGenKey.current = key;
    generateImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res]);

  async function generateImages(choice?: "a" | "b") {
    if (imgLoading) return;
    setImgError(null);
    setImgLoading(true);
    // เลื่อนลงไปที่ส่วนภาพให้เห็นสถานะกำลังวาด (ผู้ใช้เคาะ 2 ก.ย. 2569: เลือกแนวทางแล้วสร้างเลย)
    setTimeout(() => document.getElementById("soulmate-images")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    try {
      const r = await fetch("/api/soulmate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "images",
          pathChoice: res?.dualPath ? (choice ?? pathChoice) : undefined,
          prefSkin: prefSkin || undefined,
          artStyle,
          prefBody: prefBody || undefined,
          prefFace: prefFace || undefined,
          prefPersona: prefPersona ? [prefPersona] : undefined,
          birthDate,
          birthTime: birthTime || undefined,
          province: birthTime ? province : undefined,
          partnerGender: partnerGender || undefined,
          look: look || undefined,
        }),
      });
      const data = (await r.json()) as { images?: { url: string; caption: string }[]; captions?: string[]; shareUrl?: string | null; disclaimer?: string; error?: string; message?: string };
      if (!r.ok) {
        setImgError(data.message ?? data.error ?? "สร้างภาพไม่สำเร็จ");
      } else {
        setImages(data.images ?? []);
        setImgCaptions(data.captions ?? []);
        setShareUrl(data.shareUrl ?? null);
        setImgDisclaimer(data.disclaimer ?? "");
        syncAuthStatus();
      }
    } catch {
      setImgError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    } finally {
      setImgLoading(false);
    }
  }

  async function submitMatch(e: React.FormEvent) {
    e.preventDefault();
    setMatchError(null);
    setNeedsLogin(false);
    setNeedsTopup(false);
    if (!birthDate) return setMatchError("กรุณากรอกวันเกิดของคุณในแบบฟอร์มด้านบนก่อนค่ะ");
    if (!pBirthDate) return setMatchError("กรุณากรอกวันเกิดของอีกฝ่ายค่ะ");
    setMatchLoading(true);
    setMatchRes(null);
    try {
      const r = await fetch("/api/soulmate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "match",
          birthDate,
          birthTime: birthTime || undefined,
          province: birthTime ? province : undefined,
          partnerBirthDate: pBirthDate,
          partnerBirthTime: pBirthTime || undefined,
          partnerProvince: pBirthTime ? pProvince : undefined,
          partnerName: pName.trim() || undefined,
        }),
      });
      const data = (await r.json()) as MatchResponse & { needsLogin?: boolean };
      if (r.status === 401) {
        setNeedsLogin(true);
        setMatchError(data.error ?? "กรุณาเข้าสู่ระบบก่อนค่ะ");
      } else if (r.status === 429) {
        setNeedsTopup(true);
        setMatchError(data.message ?? "สิทธิ์ฟรีหมดแล้วค่ะ");
      } else if (!r.ok) {
        setMatchError(data.error ?? "เกิดข้อผิดพลาด");
      } else {
        setMatchRes(data);
        syncAuthStatus();
      }
    } catch {
      setMatchError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    } finally {
      setMatchLoading(false);
    }
  }

  const reading = res?.reading;
  const m = matchRes?.match;

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
            <span>ชื่อ-นามสกุลของคุณ (ไม่บังคับ — ชั้นเสริมธาตุจากชื่อ){profile?.first_name ? " · ✓ เติมจากบัญชี" : ""}</span>
            <input type="text" className={styles.input} value={ownName} onChange={(e) => setOwnName(e.target.value)} placeholder="เช่น สมชาย รักดี" maxLength={100} />
          </label>
          <label className={styles.field}>
            <span>เพศคู่ที่สนใจ (ไม่เลือก = ระบบดูจากเพศในโปรไฟล์ของคุณ)</span>
            <select className={styles.input} value={partnerGender} onChange={(e) => setPartnerGender(e.target.value)}>
              <option value="">— ให้ระบบเลือกจากโปรไฟล์ —</option>
              <option value="male">ผู้ชาย</option>
              <option value="female">ผู้หญิง</option>
              <option value="any">ไม่ระบุ</option>
            </select>
          </label>
          {/* แท็กความชอบ (ไม่บังคับ — Preference Overlap: เทียบความชอบกับแนวโน้มดวง + ปรับภาพ) */}
          <details style={{ marginTop: "0.2rem" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.88rem", fontWeight: 600 }}>💗 สเปกที่คุณชอบ (ไม่บังคับ — ระบบจะเทียบกับแนวโน้มดวงให้ และใช้ปรับภาพ)</summary>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <label className={styles.field} style={{ flex: 1, minWidth: 150 }}>
                <span>รูปร่างที่ชอบ</span>
                <select className={styles.input} value={prefBody} onChange={(e) => setPrefBody(e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {Object.entries(BODY_PREF).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
                </select>
              </label>
              <label className={styles.field} style={{ flex: 1, minWidth: 150 }}>
                <span>โครงหน้าที่ชอบ</span>
                <select className={styles.input} value={prefFace} onChange={(e) => setPrefFace(e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {Object.entries(FACE_PREF).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
                </select>
              </label>
              <label className={styles.field} style={{ flex: 1, minWidth: 150 }}>
                <span>บุคลิกที่ชอบ</span>
                <select className={styles.input} value={prefPersona} onChange={(e) => setPrefPersona(e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {Object.entries(PERSONA_PREF).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
                </select>
              </label>
            </div>
          </details>
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
              {reading.appearance && (
                <div className={styles.factRow}>
                  <span className={styles.factLabel}>แนวโน้มรูปลักษณ์ (นรลักษณ์ ค.1)</span>
                  <span>ใบหน้า{reading.appearance.faceTh} · รูปร่าง{reading.appearance.bodyTh}</span>
                </div>
              )}
            </div>
          )}
          {reading?.nameLayer && (
            <div style={{ marginBottom: "0.8rem" }}>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>ธาตุจากชื่อคุณ↔ธาตุคู่ ⚠️</span>
                <span>ธาตุ{reading.nameLayer.elementTh} · {reading.nameLayer.fit.relation_th} ({reading.nameLayer.fit.final_score >= 0 ? "+" : ""}{reading.nameLayer.fit.final_score})</span>
              </div>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>เลขศาสตร์ชื่อ · การ์ดพลังงาน ⚠️</span>
                <span>เลข {reading.nameLayer.namePower}{reading.nameLayer.card.name ? ` · การ์ด ${reading.nameLayer.card.id} "${reading.nameLayer.card.name}"` : ""}</span>
              </div>
              {reading.nameLayer.lens && (
                <>
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>คู่ในมุมธาตุชื่อ ⚠️</span>
                    <span>ธาตุ{reading.nameLayer.lens.partnerElementTh} — {reading.nameLayer.lens.traitsTh}</span>
                  </div>
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>รูปลักษณ์มุมธาตุชื่อ (ค.1)</span>
                    <span>ใบหน้า{reading.nameLayer.lens.appearance.faceTh} · รูปร่าง{reading.nameLayer.lens.appearance.bodyTh}</span>
                  </div>
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>สไตล์มุมธาตุชื่อ</span>
                    <span>{reading.nameLayer.lens.styleTh}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <div className={styles.reply}>{res.reply}</div>

          {/* ชั้น Jyotish สากล (ชั้นเสริม — งานวิจัย 24 ส.ค. 2569) · แสดงเฉพาะมีเวลาเกิด */}
          {res.jyotish && (
            <details className={styles.fold ?? undefined} open style={{ marginTop: "1rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}>
                🪐 มุมมองจากตำแหน่งดาว ณ เวลาเกิด (ชั้นคำนวณเสริม)
              </summary>
              <div style={{ fontSize: "0.88rem", lineHeight: 1.7, marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {res.convergence && (
                  <div style={{ padding: "0.5rem 0.7rem", borderRadius: 8, background: "rgba(184,134,11,0.10)", border: "1px solid rgba(184,134,11,0.35)" }}>
                    <strong>🧭 ความสอดคล้องระหว่างศาสตร์:</strong> {res.convergence.label}
                    <br /><span style={{ opacity: 0.85 }}>{res.convergence.detailTh}</span>
                  </div>
                )}
                <div>
                  <strong>เจ้าเรือนคู่ครอง ({res.jyotish.seventhLord.grahaTh}) อยู่ภพ {res.jyotish.seventhLord.house} — {res.jyotish.seventhLord.houseMeaningTh}</strong>
                  <br />{res.jyotish.seventhLord.arenaTh}
                </div>
                {res.jyotish.planetsIn7th.length > 0 && (
                  <div>
                    <strong>ดาวในภพคู่ครอง:</strong>{" "}
                    {res.jyotish.planetsIn7th.map((pp) => `${pp.grahaTh} — ${pp.traitTh}`).join(" · ")}
                  </div>
                )}
                {res.jyotish.appearance.th.length > 0 && (
                  <div>
                    <strong>แนวโน้มรูปลักษณ์เพิ่ม (จากดาวในภพคู่ครอง):</strong>{" "}
                    {res.jyotish.appearance.th.join(" · ")}
                    <span style={{ opacity: 0.75 }}> — เสริมจากนรลักษณ์ ค.1 ไม่ใช่คำระบุตัวบุคคล</span>
                  </div>
                )}
                <div><strong>ภาพตัวแทนคู่ (Darakaraka {res.jyotish.darakaraka.grahaTh}):</strong> {res.jyotish.darakaraka.archetypeTh}</div>
                <div><strong>ความยั่งยืนชีวิตคู่ (Upapada ราศี{res.jyotish.upapada.signTh}):</strong> {res.jyotish.upapada.second.toneTh}</div>
                <div><strong>คุณภาพระยะยาว (D9):</strong> {res.jyotish.d9.noteTh}</div>
                <div>
                  <strong>แนวโน้มฝั่งคู่ (ภพต่อเนื่อง — แนวโน้มกว้างๆ):</strong>
                  <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem" }}>
                    <li>ทรัพย์/ครอบครัวฝั่งคู่: ราศี{res.jyotish.derived.wealth.signTh} — {res.jyotish.derived.wealth.toneTh}</li>
                    <li>การงาน/บทบาทของคู่: ราศี{res.jyotish.derived.career.signTh} — {res.jyotish.derived.career.toneTh}</li>
                    <li>บ้าน/รากฐานพื้นเพของคู่: ราศี{res.jyotish.derived.roots.signTh} — {res.jyotish.derived.roots.toneTh}</li>
                  </ul>
                </div>
                <div>
                  <strong>จังหวะเวลาเรื่องคู่</strong> (นักษัตรเกิด: {res.jyotish.nakshatra.nameTh}
                  {res.jyotish.currentDasha ? ` · ทศาปัจจุบัน: ${res.jyotish.currentDasha.mdTh}/${res.jyotish.currentDasha.adTh}` : ""})
                  {res.jyotish.windows.length > 0 ? (
                    <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem" }}>
                      {res.jyotish.windows.map((w, i) => (
                        <li key={i}>{w.fromTh} – {w.toTh}: {w.reasonTh}</li>
                      ))}
                    </ul>
                  ) : (
                    <span> — ช่วง 8 ปีข้างหน้ายังไม่เข้าเงื่อนไขทศาเรื่องคู่เด่นชัด (ไม่ใช่ลางร้าย — เป็นเพียงจังหวะพลังงาน)</span>
                  )}
                </div>
                <div className={styles.caveat} style={{ marginTop: "0.3rem" }}>
                  {res.jyotish.caveats.map((c, i) => <p key={i}>⚠️ {c}</p>)}
                </div>
              </div>
            </details>
          )}

          {res.dualPath && (
            <div style={{ marginTop: "0.8rem" }}>
              <strong style={{ fontSize: "0.95rem" }}>🔀 สองเส้นทางเนื้อคู่ของคุณ</strong>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {([res.dualPath.a, res.dualPath.b] as const).map((path) => (
                  <div
                    key={path.key}
                    style={{
                      flex: 1, minWidth: 240, padding: "0.6rem 0.8rem", borderRadius: 8,
                      border: `2px solid ${(path.key === "ก" ? "a" : "b") === pathChoice ? "var(--gold)" : "rgba(184,134,11,0.3)"}`,
                      background: "rgba(184,134,11,0.06)", fontSize: "0.85rem", lineHeight: 1.7,
                    }}
                  >
                    <strong>แบบ {path.key} — ธาตุ{path.elementTh}</strong>
                    <br /><span style={{ opacity: 0.8 }}>{path.sourceTh}</span>
                    <br />นิสัยแนวโน้ม: {path.traitsTh}
                    <br />รูปลักษณ์: ใบหน้า{path.appearance.faceTh} · รูปร่าง{path.appearance.bodyTh}
                    <br />เคมีกับดวงคุณ: {path.chemistry.final_score >= 0 ? "+" : ""}{path.chemistry.final_score} ({path.chemistry.relation_th})
                    <br />
                    <button
                      type="button"
                      disabled={imgLoading}
                      onClick={() => {
                        const c = path.key === "ก" ? "a" : "b";
                        setPathChoice(c);
                        setImages([]); // เลือกแบบใหม่ = วาดชุดใหม่ (เคาะ 2 ก.ย. 2569: เลือกแล้วสร้างเลย)
                        generateImages(c);
                      }}
                      style={{
                        marginTop: "0.4rem", padding: "0.3rem 0.8rem", borderRadius: 999, cursor: "pointer",
                        border: "1px solid var(--gold)", fontFamily: "var(--font-sans-thai)", fontSize: "0.8rem",
                        background: (path.key === "ก" ? "a" : "b") === pathChoice ? "var(--gold)" : "transparent",
                        color: (path.key === "ก" ? "a" : "b") === pathChoice ? "#fffdf8" : "inherit",
                      }}
                    >
                      {imgLoading && (path.key === "ก" ? "a" : "b") === pathChoice
                        ? "🎨 กำลังวาด..."
                        : `🎨 สร้างภาพตามแบบ ${path.key} เลย`}
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.83rem", lineHeight: 1.6, margin: "0.5rem 0 0" }}>📊 {res.dualPath.comparisonTh}</p>
              <p style={{ fontSize: "0.75rem", opacity: 0.8, margin: "0.3rem 0 0" }}>⚠️ {res.dualPath.caveats[0]}</p>
            </div>
          )}
          {res.preference && (
            <div style={{ fontSize: "0.88rem", lineHeight: 1.7, marginTop: "0.8rem", padding: "0.6rem 0.8rem", borderRadius: 8, background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.3)" }}>
              <strong>💗 มุมความชอบของคุณ ↔ แนวโน้มดวง</strong>
              <br />{res.preference.summaryTh}
              <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem" }}>
                {res.preference.items.map((it, i) => (
                  <li key={i}>
                    {it.tagTh}: {it.matchedByTh.length ? `ตรงกับ ${it.matchedByTh.join(" · ")}` : "จุดต่างจากแนวโน้มดวง"}
                    {it.chemistryTh ? <><br /><span style={{ opacity: 0.8 }}>{it.chemistryTh}</span></> : null}
                  </li>
                ))}
              </ul>
              <span style={{ opacity: 0.75, display: "block", marginTop: "0.3rem" }}>⚠️ {res.preference.caveats[0]}</span>
            </div>
          )}
          {reading?.caveats?.length ? (
            <div className={styles.caveat}>{reading.caveats.map((c, i) => <p key={i}>⚠️ {c}</p>)}</div>
          ) : null}

          <div style={{ marginTop: "1.4rem" }} id="soulmate-images">
            <h2 className={styles.h2}>ภาพจินตนาการเนื้อคู่</h2>
            <p className={styles.note} style={{ marginTop: 0 }}>
              AI วาดจากบุคลิก ธาตุ และรูปร่างตามนรลักษณ์ที่คำนวณ (คอลลาจ 1 รูป 4 มุม · ฟรีครั้งแรก แล้วครั้งละ 30 เครดิต)
              {res?.dualPath ? ` — กำลังใช้ "ภาพเนื้อคู่ตามดวงแบบ ${pathChoice === "a" ? "ก" : "ข"}"` : ""} — เป็นภาพจินตนาการเท่านั้น
              ไม่ใช่บุคคลจริง และไม่ได้มาจากตำรา
            </p>
            {/* สัญชาติ/สไตล์ลุค (preset — ไม่มีช่องพิมพ์อิสระ กันอ้างชื่อบุคคลจริง ·
                โครงหน้า/วัยให้ AI จัดตามความเหมาะสม — ผู้ใช้เคาะ 23 ส.ค. 2569) */}
            {!images.length && (
              <details style={{ margin: "0.6rem 0" }}>
                <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>🎛 ปรับแต่งภาพ (ไม่บังคับ — สไตล์/ลุค/โทนผิว)</summary>
                <label className={styles.field} style={{ maxWidth: 280, marginBottom: 0, marginTop: "0.5rem" }}>
                  <span>สัญชาติ/สไตล์ลุคของภาพ</span>
                  <select className={styles.input} value={look} onChange={(e) => setLook(e.target.value)}>
                    {Object.entries(LOOK_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>{v.th}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field} style={{ maxWidth: 280, marginBottom: 0, marginTop: "0.5rem" }}>
                  <span>สไตล์ภาพ</span>
                  <select className={styles.input} value={artStyle} onChange={(e) => setArtStyle(e.target.value)}>
                    {Object.entries(ART_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>{v.th}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field} style={{ maxWidth: 280, marginBottom: 0, marginTop: "0.5rem" }}>
                  <span>โทนผิวของภาพ (ตัวเลือกการวาด — ไม่ใช่คำทำนาย)</span>
                  <select className={styles.input} value={prefSkin} onChange={(e) => setPrefSkin(e.target.value)}>
                    <option value="">— ตามลุคที่เลือก —</option>
                    {Object.entries(SKIN_TONES).map(([k, v]) => (
                      <option key={k} value={k}>{v.th}</option>
                    ))}
                  </select>
                </label>
                <p className={styles.note} style={{ marginTop: "0.4rem" }}>💡 {SOULMATE_LOOK_NOTE}</p>
              </details>
            )}
            {imgError && <p className={styles.error}>{imgError}</p>}
            {!images.length && (res?.dualPath ? (
              imgLoading ? (
                <p className={styles.note}>🎨 กำลังวาดภาพตามแบบ {pathChoice === "a" ? "ก" : "ข"}... (~15 วินาที)</p>
              ) : (
                <p className={styles.note}>👆 กดปุ่ม สร้างภาพตามแบบ ก หรือ ข ด้านบนได้เลย — ระบบจะวาดให้ทันที</p>
              )
            ) : (
              <button type="button" className={styles.ctaBtn} onClick={() => generateImages()} disabled={imgLoading}>
                {imgLoading ? "กำลังวาดภาพ... (~15 วินาที)" : "🎨 สร้างภาพเนื้อคู่ (คอลลาจ 4 มุม · ฟรีครั้งแรก)"}
              </button>
            ))}
            {images.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                {images.map((img, i) => (
                  <figure key={img.url} className={styles.imgCard} style={{ maxWidth: 420 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`ภาพจินตนาการเนื้อคู่${images.length > 1 ? ` ${i + 1}` : ""}`} />
                    {img.caption && (
                      <figcaption style={{ fontSize: "0.82rem", lineHeight: 1.55, marginTop: "0.4rem" }}>{img.caption}</figcaption>
                    )}
                    <figcaption className={styles.imgLabel}>🎨 {imgDisclaimer}</figcaption>
                  </figure>
                ))}
                {imgCaptions.length > 0 && (
                  <ul style={{ fontSize: "0.85rem", lineHeight: 1.7, paddingLeft: "1.2rem", margin: "0.3rem 0 0", textAlign: "left", maxWidth: 420 }}>
                    {imgCaptions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
              </div>
            )}
            {shareUrl && images.length > 0 && (
              <div className={styles.ctaRow} style={{ justifyContent: "center", marginTop: "0.8rem" }}>
                <button
                  type="button"
                  className={styles.ctaBtn}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    } catch { /* คัดลอกไม่ได้ */ }
                  }}
                >
                  {copied ? "✓ คัดลอกลิงก์แล้ว" : "🔗 คัดลอกลิงก์แชร์"}
                </button>
                <a
                  className={styles.ctaBtn}
                  href={shareLinks(`https://lalaluckychat.com${shareUrl}`, "เนื้อคู่ตามดวงของฉัน ✨").facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📘 แชร์ Facebook
                </a>
                <a className={styles.ctaBtn} href={`${shareUrl}/story`} download>
                  📱 ดาวน์โหลดสตอรี่ IG
                </a>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    type="button"
                    className={styles.ctaBtn}
                    onClick={() => {
                      navigator
                        .share({ url: `${window.location.origin}${shareUrl}`, text: "เนื้อคู่ตามดวงของฉัน ✨ เปิดดวงเนื้อคู่ของคุณบ้างสิ 🐾" })
                        .catch(() => {});
                    }}
                  >
                    📤 แชร์
                  </button>
                )}
                <p className={styles.note} style={{ width: "100%", textAlign: "center", marginTop: "0.3rem" }}>
                  ลิงก์แชร์แสดงเฉพาะภาพ+คำบรรยาย ไม่มีข้อมูลส่วนตัวของคุณ
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- เช็คกับคนที่คุณสนใจ (23 ส.ค. 2569) ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>💕 เช็คกับคนที่คุณสนใจ</h2>
        <p className={styles.note} style={{ marginTop: 0 }}>
          ใส่วันเกิดของเขา — ระบบเทียบเคมีธาตุ ความสอดคล้อง 5 ด้าน และภพคู่ครอง (ปัตนิ) ให้
          · ข้อมูลของอีกฝ่ายใช้คำนวณชั่วขณะ <b>ไม่ถูกจัดเก็บ</b>
        </p>
        <form onSubmit={submitMatch}>
          <label className={styles.field}>
            <span>วันเกิดของเขา (ค.ศ.) — จำเป็น</span>
            <input type="date" className={styles.input} value={pBirthDate} onChange={(e) => setPBirthDate(e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>เวลาเกิดของเขา (ถ้าทราบ — เปิดชั้นเช็คภพคู่ครองไขว้ตามตำรา)</span>
            <input type="time" className={styles.input} value={pBirthTime} onChange={(e) => setPBirthTime(e.target.value)} />
          </label>
          {pBirthTime && (
            <label className={styles.field}>
              <span>จังหวัดที่เขาเกิด</span>
              <select className={styles.input} value={pProvince} onChange={(e) => setPProvince(e.target.value)}>
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
            <span>ชื่อ-นามสกุลของเขา (ไม่บังคับ — ชั้นเสริมธาตุจากชื่อ ตารางรอเจ้าของสูตรยืนยัน)</span>
            <input type="text" className={styles.input} value={pName} onChange={(e) => setPName(e.target.value)} maxLength={60} placeholder="เช่น สมชาย รักดี" />
          </label>
          {matchError && <p className={styles.error}>{matchError}</p>}
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
          <button type="submit" className={styles.btn} disabled={matchLoading}>
            {matchLoading ? "กำลังคำนวณ..." : "💕 เช็คความเข้ากัน"}
          </button>
          <p className={styles.note}>
            ใช้สิทธิ์เดียวกับคำทำนายเนื้อคู่ (ฟรีครั้งแรก · จากนั้น 20 เครดิต) — ไม่รองรับรูปถ่ายของอีกฝ่าย
            เพราะเป็นข้อมูลชีวมิติที่เจ้าตัวต้องยินยอมเอง
          </p>
        </form>

        {matchRes?.reply && m && (
          <div style={{ marginTop: "1.2rem", borderTop: "1px dashed var(--marble-vein)", paddingTop: "1rem" }}>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>ธาตุของเขา</span>
              <span>{m.partner.dominantTh} · ขาด {m.partner.missingTh.length ? m.partner.missingTh.join(", ") : "—"} · เลขตัวตน {m.partner.identityNumber}</span>
            </div>
            <div className={styles.factRow}>
              <span className={styles.factLabel}>เคมีธาตุคุณ↔เขา</span>
              <span>{m.chemistry.relation_th} ({m.chemistry.final_score >= 0 ? "+" : ""}{m.chemistry.final_score})</span>
            </div>
            {m.patni && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>ภพคู่ครอง (ปัตนิ)</span>
                <span>{m.patni.match ? `💞 ตรงกันทั้งสองทาง (ราศี${m.patni.partnerLagna})` : `ไม่ตรง — ภพคู่ครองของคุณคือราศี${m.patni.userSeventh} (ไม่ใช่ลางร้าย)`}</span>
              </div>
            )}
            {m.nameLayer && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>ธาตุจากชื่อเขา ⚠️</span>
                <span>{m.nameLayer.elementTh} — {m.nameLayer.fit.relation_th}</span>
              </div>
            )}
            {m.nameLayer && (
              <div className={styles.factRow}>
                <span className={styles.factLabel}>เลขศาสตร์ชื่อเขา · การ์ดพลังงานเขา ⚠️</span>
                <span>เลข {m.nameLayer.namePower}{m.nameLayer.card.name ? ` · การ์ด ${m.nameLayer.card.id} "${m.nameLayer.card.name}"` : ""}</span>
              </div>
            )}
            <details className={styles.fold ?? undefined} open style={{ marginTop: "0.6rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>📊 ความสอดคล้อง 5 ด้าน (จากเลขตัวตนทั้งคู่)</summary>
              {m.coherence.map((c) => (
                <div key={c.labelTh} className={styles.factRow}>
                  <span className={styles.factLabel}>{c.labelTh}</span>
                  <span>
                    {c.tone === "strong" ? "✅" : c.tone === "caution" ? "⚠️" : "·"} เฉลี่ย {c.avg} · สูงสุด {c.strongest.label} ({c.max}) · ต่ำสุด {c.weakest.label} ({c.min})
                  </span>
                </div>
              ))}
            </details>
            {matchRes.matchKoota && (
              <div style={{ fontSize: "0.85rem", lineHeight: 1.7, marginTop: "0.7rem", padding: "0.5rem 0.7rem", borderRadius: 8, background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.3)" }}>
                <strong>🌙 คะแนนคู่ตามเกณฑ์ดวงจันทร์สองฝ่าย (ชั้นเสริม): {matchRes.matchKoota.total}/36</strong>
                <br />{matchRes.matchKoota.bandTh} · นักษัตร {matchRes.matchKoota.aNakshatraTh} × {matchRes.matchKoota.bNakshatraTh}
                <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem" }}>
                  {matchRes.matchKoota.kootas.map((k) => (
                    <li key={k.key}>{k.nameTh}: {k.got}/{k.max} — {k.noteTh}</li>
                  ))}
                </ul>
                {matchRes.matchKoota.doshaFlags.length > 0 && (
                  <div style={{ marginTop: "0.3rem" }}>{matchRes.matchKoota.doshaFlags.map((f, i) => <div key={i}>⚠️ {f}</div>)}</div>
                )}
                <span style={{ opacity: 0.75, display: "block", marginTop: "0.3rem" }}>{matchRes.matchKoota.caveats[0]}</span>
              </div>
            )}
            {matchRes.matchTiming && (
              <div style={{ fontSize: "0.85rem", lineHeight: 1.7, marginTop: "0.7rem", padding: "0.5rem 0.7rem", borderRadius: 8, background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.3)" }}>
                <strong>🪐 จังหวะเวลาสองฝ่าย (ชั้นคำนวณเสริมจากตำแหน่งดาว)</strong>
                <br />ช่วงจังหวะของคุณ: {matchRes.matchTiming.userWindows.map((w) => `${w.fromTh}–${w.toTh}`).join(" · ") || "—"}
                <br />ช่วงจังหวะของเขา: {matchRes.matchTiming.partnerWindows.map((w) => `${w.fromTh}–${w.toTh}`).join(" · ") || "—"}
                <br /><strong>ช่วงทับซ้อน (น้ำหนักทั้งคู่):</strong>{" "}
                {matchRes.matchTiming.overlaps.length
                  ? matchRes.matchTiming.overlaps.map((w) => `${w.fromTh}–${w.toTh}`).join(" · ")
                  : "ช่วง 8 ปีข้างหน้าไม่มีช่วงทับซ้อนเด่นชัด (เป็นจังหวะพลังงาน ไม่ใช่ลางร้าย)"}
                <br /><span style={{ opacity: 0.75 }}>จังหวะ = ช่วงที่เรื่องคู่มีน้ำหนักตามทศา — ไม่ใช่คำการันตี · คำนวณชั่วขณะ ไม่จัดเก็บข้อมูลอีกฝ่าย</span>
              </div>
            )}
            <div className={styles.reply} style={{ marginTop: "0.8rem" }}>{matchRes.reply}</div>
            {m.caveats.length > 0 && (
              <div className={styles.caveat}>{m.caveats.map((c, i) => <p key={i}>⚠️ {c}</p>)}</div>
            )}
          </div>
        )}
      </section>

      <FunctionChat
        logicId={17}
        context={res?.reading ?? null}
        placeholder="เช่น นิสัยแบบนี้ควรเริ่มทำความรู้จักยังไงดี"
      />
    </div>
  );
}
