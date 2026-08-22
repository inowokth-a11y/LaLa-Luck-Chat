"use client";

// Logic 20 — "ทำนายแบบองค์รวม" (ยกเครื่อง 22 ส.ค. 2569 ตามคำสั่งผู้ใช้ + เปลี่ยนชื่อโหมด)
// เพิ่มหลายส่วนพร้อมกัน (ตนเอง · บ้าน · ทะเบียนรถ · โทรศัพท์ · เพื่อนร่วมงาน ฯลฯ)
// → คะแนน 5 ด้านของแต่ละส่วน → ความสอดคล้องทั้งข่าย → จุดแข็ง/ข้อควรระวัง/คำแนะนำ (฿0 ล้วน)
//
// ⚠️ HTML ต้นฉบับมีสำเนาสูตรของตัวเองที่ล้าสมัย (DAY_ELEMENT บั๊ก B2, ไม่มีลี่ชุน B1)
//    หน้านี้เรียก calculateElementSeed() ตัวจริงจาก lib/engine/element.ts เท่านั้น
//    **ห้ามลอกสูตรจาก HTML กลับมา** (CLAUDE.md §5.1)
// 🔴 ตัวเลขทุกตัวมาจาก engine (numberAspects / wuXingScore / network-holistic) — หน้าห้ามคำนวณเอง

import { useEffect, useMemo, useRef, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import { useStoredProfile } from "../_components/useStoredProfile";
import { syncAuthStatus } from "@/app/_components/AuthStatus";
import {
  calculateElementSeed,
  THAI_LABEL_4,
  THAI_LABEL_5,
  type Element4,
  type Element5,
  type ElementSeedResult,
} from "@/lib/engine/element";
import {
  aggregateScore,
  entityElementFromNumber,
  scoreEntities,
  relationColorVar,
  ENTITY_ICONS,
  ENTITY_LABELS,
  isPersonType,
  type Entity,
  type EntityType,
} from "@/lib/engine/compatibility";
import {
  birthPowerNumber,
  parseRefInput,
  partAspects,
  analyzeCoherence,
  holisticAdvice,
  personSeedFromBirthDate,
  startDateOmen,
  FREE_NETWORK_PARTS,
  MAX_NETWORK_PARTS,
  type HolisticPart,
} from "@/lib/engine/network-holistic";
import type { NumberAspectsResult } from "@/lib/engine/number-aspects";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import styles from "./compatibility.module.css";
import FunctionChat from "../_components/FunctionChat";

const ZODIAC_ANIMALS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
];

function zodiacAnimalFromYear(yearAd: number): string {
  return ZODIAC_ANIMALS[(((yearAd - 2020) % 12) + 12) % 12];
}

const CX = 160;
const CY = 160;
const RADIUS = 118;

/** แถบคะแนน 5 ด้าน — ตัวเลขมาจาก engine ล้วน component แค่วาด */
function AspectBars({ aspects, title }: { aspects: NumberAspectsResult; title?: string }) {
  return (
    <div className={styles.aspectBox}>
      {title && <div className={styles.aspectTitle}>{title}</div>}
      {Object.entries(aspects.คะแนน).map(([label, score]) => (
        <div key={label} className={styles.aspectRow}>
          <span className={styles.aspectLabel}>{label}</span>
          <span className={styles.aspectTrack}>
            <span
              className={styles.aspectFill}
              data-tone={score >= 7 ? "good" : score <= 4 ? "bad" : undefined}
              style={{ width: `${score * 10}%`, display: "block" }}
            />
          </span>
          <span className={styles.aspectScore}>{score}/10</span>
        </div>
      ))}
      <div className={styles.aspectRow}>
        <span className={styles.aspectLabel} style={{ fontWeight: 700 }}>ภาพรวม</span>
        <span className={styles.aspectTrack}>
          <span className={styles.aspectFill} style={{ width: `${aspects.ภาพรวม * 10}%`, display: "block" }} />
        </span>
        <span className={styles.aspectScore}>{aspects.ภาพรวม}/10</span>
      </div>
    </div>
  );
}

/** แถวกรอกในฟอร์ม (ยังไม่คำนวณ) — กด "รับคำทำนายในภาพรวม" ถึงจะกลายเป็น entity */
interface DraftRow {
  id: number;
  type: EntityType;
  name: string;
  ref: string;
  /** วันเกิด (เฉพาะประเภทบุคคล — แทนเลขอ้างอิง) */
  birthDate: string;
  /** วันเริ่มต้นของวัตถุ (วันออกรถ/ขึ้นบ้าน — ไม่บังคับ) → กาลโยคย้อนหลัง */
  startDate: string;
  /** เวลาเริ่มต้น (ไม่บังคับ — มีแล้วเพิ่มชั้นยาม) */
  startTime: string;
  shared: boolean;
}

const emptyRow = (id: number): DraftRow => ({
  id, type: "house", name: "", ref: "", birthDate: "", startDate: "", startTime: "", shared: false,
});

/** ปลดล็อกข่ายใหญ่ (>2 สิ่งรอบตัว) จำต่อเซสชันเบราว์เซอร์ — หักครั้งเดียว ปรับรายการซ้ำไม่หักซ้ำ */
const UNLOCK_KEY = "kruth_holistic_unlock";

export default function CompatibilityPage() {
  const { profile } = useStoredProfile();
  const [birthDate, setBirthDate] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [seed, setSeed] = useState<ElementSeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [entities, setEntities] = useState<Entity[]>([]);
  // กาง/พับผลรายส่วน (ผู้ใช้ขอ 22 ส.ค. 2569) — id ของส่วนที่กางอยู่
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // ฟอร์มหลายแถว (ผู้ใช้ขอ 22 ส.ค. 2569): เพิ่มช่องได้สูงสุด MAX_NETWORK_PARTS
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(1)]);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsTopup, setNeedsTopup] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // คำทำนาย 4 องก์จากอาจารย์ลาลา (22 ส.ค. 2569) — เฉพาะข่ายปลดล็อก (>FREE_NETWORK_PARTS)
  const [wantNarration, setWantNarration] = useState(false);
  const [narration, setNarration] = useState<string | null>(null);
  const [narrLoading, setNarrLoading] = useState(false);
  const narrKey = useRef<string>("");

  // เติมวันเกิดจากบัญชี (กรอกในโหมดอื่นแล้วไม่ต้องกรอกซ้ำ) — เฉพาะช่องที่ยังว่าง
  useEffect(() => {
    if (profile?.birth_date && !birthDate) {
      setBirthDate(profile.birth_date);
      setPrefilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const selfElement = (seed?.dominant ?? null) as Element5 | null;
  const selfMissing = useMemo(() => (seed?.missing ?? []) as Element5[], [seed]);

  const scored = useMemo(
    () => (selfElement ? scoreEntities(entities, selfElement, selfMissing) : []),
    [entities, selfElement, selfMissing]
  );
  const aggregate = useMemo(
    () => (selfElement ? aggregateScore(entities, selfElement, selfMissing) : null),
    [entities, selfElement, selfMissing]
  );
  /** สลับกาง/พับ · forceOpen = คลิกจากแผนผัง (เปิดเสมอ ไม่สลับปิด) */
  function toggleExpand(id: number, forceOpen = false) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (forceOpen || !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // ---- โหมดองค์รวม: คะแนน 5 ด้านของทุกส่วน (ตนเอง = เลขตัวตนจาก BirthPower) ----
  const selfNumberStr = useMemo(() => {
    if (!seed || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    return String(birthPowerNumber(birthDate)).padStart(2, "0");
  }, [seed, birthDate]);

  const holisticParts = useMemo<HolisticPart[]>(() => {
    if (!seed || !selfElement || !selfNumberStr) return [];
    const parts: HolisticPart[] = [
      {
        label: `ตัวคุณ (เลขตัวตน ${selfNumberStr})`,
        icon: "👤",
        aspects: partAspects({ digits: selfNumberStr, letters: null }, selfElement, selfMissing),
        chemistry: null,
        element: null,
      },
    ];
    for (const s of scored) {
      // บุคคล (มีวันเกิด): คะแนน 5 ด้านจาก "เลขตัวตน" ของเขา — วิธีเดียวกับส่วนตนเอง
      if (s.entity.birthDate) {
        const pseed = personSeedFromBirthDate(s.entity.birthDate);
        if (!pseed) continue;
        const idNum = String(birthPowerNumber(s.entity.birthDate)).padStart(2, "0");
        parts.push({
          label: s.entity.name,
          icon: ENTITY_ICONS[s.entity.type],
          aspects: partAspects({ digits: idNum, letters: null }, selfElement, selfMissing),
          chemistry: s.result,
          element: s.entity.element,
          personMissing: pseed.missing_th,
        });
        continue;
      }
      const ref = s.entity.ref ? parseRefInput(s.entity.ref) : null;
      if (!ref) continue;
      parts.push({
        label: s.entity.name,
        icon: ENTITY_ICONS[s.entity.type],
        aspects: partAspects(ref, selfElement, selfMissing),
        chemistry: s.result,
        element: s.entity.element,
        // จังหวะเริ่มต้น (กาลโยคย้อนหลัง) — เฉพาะวัตถุที่ให้วันเริ่มต้นมา
        omen: s.entity.startDate ? startDateOmen(s.entity.startDate, s.entity.startTime ?? null) : null,
      });
    }
    return parts;
  }, [seed, selfElement, selfMissing, selfNumberStr, scored]);

  const coherence = useMemo(() => analyzeCoherence(holisticParts), [holisticParts]);
  const advice = useMemo(
    () => (holisticParts.length >= 2 ? holisticAdvice(holisticParts, coherence, selfElement) : null),
    [holisticParts, coherence, selfElement]
  );

  // เรียกอาจารย์ลาลาเรียบเรียง 4 องก์ — ครั้งเดียวต่อชุดผล (guard ด้วย key กันยิงซ้ำ/ยิงรัว)
  useEffect(() => {
    if (!wantNarration || !seed || !advice || holisticParts.length < FREE_NETWORK_PARTS + 2) return;
    const clip = (s: string | null | undefined) => (s ? s.slice(0, 120) : null);
    const ctx = {
      ตัวคุณ: { ธาตุเด่น: THAI_LABEL_4[seed.dominant], ธาตุที่ขาด: seed.missing_th },
      parts: holisticParts.map((p) => ({
        label: p.label,
        icon: p.icon,
        คะแนน5ด้าน: p.aspects.คะแนน,
        ภาพรวม: p.aspects.ภาพรวม,
        การ์ดผลรวม: clip(p.aspects.การ์ดผลรวม),
        ความหมายเลขท้าย: clip(p.aspects.ความหมายเลขท้าย),
        ธาตุ: p.element ? THAI_LABEL_5[p.element] : null,
        เคมีกับผู้ใช้: p.chemistry
          ? { คะแนน: p.chemistry.final_score, ความสัมพันธ์: p.chemistry.relation_th }
          : null,
        จังหวะเริ่มต้น: p.omen
          ? { วัน: p.omen.dayTh, ดี: p.omen.good, ร้าย: p.omen.bad, หมายเหตุ: p.omen.note, ยามเมื่อทราบเวลา: p.omen.timeVerdict }
          : null,
        ธาตุที่บุคคลนี้ขาด: p.personMissing ?? null,
      })),
      ความสอดคล้องรายด้าน: coherence.map((c) => ({
        ด้าน: c.labelTh, เฉลี่ย: c.avg, ต่ำสุด: `${c.weakest.label} (${c.min})`, สูงสุด: `${c.strongest.label} (${c.max})`, tone: c.tone,
      })),
      จุดแข็ง: advice.strengths,
      ข้อควรระวัง: advice.cautions,
      คำแนะนำ: advice.tips,
      คำเตือนที่ต้องคงไว้: advice.caveats,
    };
    const key = JSON.stringify(ctx);
    if (key === narrKey.current) return;
    narrKey.current = key;
    setNarrLoading(true);
    fetch("/api/holistic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "narrate", context: ctx }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => {
        if (ok && typeof d.reply === "string") setNarration(d.reply);
      })
      .catch(() => {
        /* คำทำนายเรียบเรียงพัง = ผลตัวเลข/เทมเพลตยังครบ — ไม่ทำหน้าพัง */
      })
      .finally(() => setNarrLoading(false));
  }, [wantNarration, seed, advice, holisticParts, coherence]);

  /** คำนวณธาตุ+เลขตัวตนจากวันเกิด — คืน seed หรือ null (พร้อม set error) · reuse ทั้งปุ่มแยกและปุ่มรวม */
  function computeSelf(): ElementSeedResult | null {
    setSeedError(null);
    const year = Number(birthDate.slice(0, 4));
    const month = Number(birthDate.slice(5, 7));
    const day = Number(birthDate.slice(8, 10));
    if (!year || !month || !day) {
      setSeedError("กรุณากรอกวันเกิดให้ครบ");
      return null;
    }
    // normalization layer: ข้อมูลจริงของ Platform D มี พ.ศ. ปนอยู่ (CLAUDE.md §8)
    if (year > 2400) {
      setSeedError("กรุณากรอกเป็น ค.ศ. (เช่น 1995) ไม่ใช่ พ.ศ.");
      return null;
    }
    const s = calculateElementSeed({
      day_of_week: thaiDayOfWeek(birthDate),
      birth_month: month,
      birth_year_ad: year,
      birth_day: day,
      zodiac_year_animal: zodiacAnimalFromYear(year),
    });
    setSeed(s);
    return s;
  }

  function calcSelf(e: React.FormEvent) {
    e.preventDefault();
    computeSelf();
  }

  // ---- ฟอร์มหลายแถว ----
  function updateRow(id: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    // 🔴 เช็คเพดาน + ออก id ภายใน functional update เท่านั้น — เช็คจาก state นอก closure
    //    โดนกดรัวใน tick เดียวทะลุเพดานได้ (เจอจริงตอนทดสอบ: 12 คลิกรวด → 15 แถว id ซ้ำ)
    setRows((prev) => {
      if (prev.length >= MAX_NETWORK_PARTS) return prev;
      const id = Math.max(0, ...prev.map((r) => r.id)) + 1;
      return [...prev, emptyRow(id)];
    });
  }
  function removeRow(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev.map(() => emptyRow(id))));
    removeEntity(id);
  }

  function removeEntity(id: number) {
    setEntities((prev) => prev.filter((x) => x.id !== id));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  /**
   * ปุ่มหลัก "รับคำทำนายในภาพรวม" — คำนวณตัวคุณให้อัตโนมัติถ้ายังไม่ได้กด แล้วคำนวณทุกส่วน
   * ฟรี ≤FREE_NETWORK_PARTS สิ่งรอบตัว · เกิน = ปลดล็อกผ่าน /api/holistic (20 เครดิต ครั้งเดียว/เซสชัน)
   */
  async function getReading(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNeedsLogin(false);
    setNeedsTopup(false);

    // 1. ตัวคุณ — ยังไม่คำนวณ = คำนวณให้เลย (ผู้ใช้สั่ง: กดปุ่มเดียวจบ)
    const s = seed ?? computeSelf();
    if (!s) {
      setFormError("กรุณากรอกวันเกิดในข้อ 1 ให้ถูกต้องก่อนค่ะ");
      return;
    }

    // 2. ตรวจแถว — แถวว่างล้วนข้าม · วัตถุต้องมีเลขอ้างอิง · บุคคลต้องมีวันเกิด (สูตรคนตัวจริง)
    const drafts: { row: DraftRow; digits?: string; personElement?: Element5 }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isPersonType(r.type)) {
        if (!r.name.trim() && !r.birthDate.trim()) continue; // แถวว่าง — ข้าม
        const pseed = personSeedFromBirthDate(r.birthDate);
        if (!pseed) {
          setFormError(`รายการที่ ${i + 1}: กรุณากรอกวันเกิด (ค.ศ.) ของบุคคลนี้ให้ถูกต้อง`);
          return;
        }
        drafts.push({ row: r, personElement: pseed.dominant as Element5 });
      } else {
        if (!r.name.trim() && !r.ref.trim()) continue; // แถวว่าง — ข้าม
        const parsed = parseRefInput(r.ref);
        if (!parsed) {
          setFormError(`รายการที่ ${i + 1}: กรุณากรอกเลขอ้างอิง 1-10 หลัก เช่น 47 · จง 6266 · 0812345678`);
          return;
        }
        drafts.push({ row: r, digits: parsed.digits });
      }
    }

    // 3. เกิน 2 สิ่งรอบตัว → ปลดล็อกด้วยเครดิต (จำต่อเซสชัน — ปรับรายการซ้ำไม่หักซ้ำ)
    if (drafts.length > FREE_NETWORK_PARTS && sessionStorage.getItem(UNLOCK_KEY) !== "1") {
      setUnlocking(true);
      try {
        const r = await fetch("/api/holistic", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ count: drafts.length }),
        });
        const d = await r.json();
        if (r.status === 401) {
          setNeedsLogin(true);
          setFormError(d.error ?? "กรุณาเข้าสู่ระบบก่อนค่ะ");
          return;
        }
        if (r.status === 429) {
          setNeedsTopup(true);
          setFormError(d.message ?? "เครดิตไม่พอค่ะ");
          return;
        }
        if (!r.ok) {
          setFormError(d.error ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้งค่ะ");
          return;
        }
        sessionStorage.setItem(UNLOCK_KEY, "1");
        syncAuthStatus();
      } catch {
        setFormError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
        return;
      } finally {
        setUnlocking(false);
      }
    }

    // 4. สร้าง entity ทั้งชุดจากแถว (id เดียวกับแถว — ลบจากผลลัพธ์ = ลบแถวด้วย)
    setEntities(
      drafts.map(({ row, digits, personElement }) =>
        personElement
          ? {
              id: row.id,
              name: row.name.trim() || `${ENTITY_LABELS[row.type]}`,
              type: row.type,
              element: personElement,
              shared: row.shared,
              birthDate: row.birthDate,
            }
          : {
              id: row.id,
              name: row.name.trim() || `${ENTITY_LABELS[row.type]} ${row.ref.trim()}`,
              type: row.type,
              element: entityElementFromNumber(Number(digits)),
              shared: row.shared,
              ref: row.ref.trim(),
              ...(row.startDate ? { startDate: row.startDate, startTime: row.startTime || undefined } : {}),
            }
      )
    );
    // คำทำนายฉบับเรียบเรียง (4 องก์) — เฉพาะข่ายที่ปลดล็อก (>FREE_NETWORK_PARTS)
    setWantNarration(drafts.length > FREE_NETWORK_PARTS);
    setNarration(null);
  }

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
        <h1>ทำนายแบบองค์รวม</h1>
        <p className={styles.sub}>
          บ้าน · ทะเบียนรถ · โทรศัพท์ · เพื่อนร่วมงาน — ดูคะแนน 5 ด้านของแต่ละส่วน
          <br />
          แล้วดูความสอดคล้องของทั้งชีวิตคุณ · คำนวณจากเลขศาสตร์และธาตุจริง ไม่ใช่การเดา
        </p>
      </header>

      {/* ---- 1. ธาตุของคุณ ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>1. ตัวคุณ</h2>
        <form onSubmit={calcSelf}>
          <label className={styles.field}>
            <span>วันเกิด (ค.ศ.){prefilled ? " · ✓ เติมข้อมูลจากบัญชีของคุณ" : ""}</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.input}
              required
            />
          </label>
          {seedError && <p className={styles.error}>{seedError}</p>}
          <button type="submit" className={styles.btn}>
            คำนวณธาตุและเลขตัวตนของฉัน
          </button>
        </form>

        {seed && (
          <div className={styles.seedSummary}>
            <span
              className={styles.elemTag}
              style={{ background: `var(--${seed.dominant.toLowerCase()})` }}
            >
              {THAI_LABEL_4[seed.dominant]} (เด่น)
            </span>
            {seed.missing.length > 0 ? (
              <span className={styles.missingTags}>
                {seed.missing.map((m) => (
                  <span key={m} className={styles.missingTag}>
                    ขาด {THAI_LABEL_4[m as Element4]}
                  </span>
                ))}
              </span>
            ) : (
              <span className={styles.missingTag}>ธาตุครบทั้ง 4</span>
            )}
            <p className={styles.note}>
              ธาตุที่ขาดไม่ใช่จุดอ่อนเสมอไป — สิ่งรอบตัวที่เป็นธาตุนั้นอาจกลายเป็น “ยา” ได้
              (Productive&nbsp;Clash)
            </p>
            {holisticParts[0] && (
              <details className={styles.fold} open>
                <summary>คะแนน 5 ด้านของ {holisticParts[0].label}</summary>
                <AspectBars aspects={holisticParts[0].aspects} />
              </details>
            )}
          </div>
        )}
      </section>

      {/* ---- 2. เพิ่มสิ่งรอบตัว (หลายแถว — ผู้ใช้ขอ 22 ส.ค. 2569) ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>2. เพิ่มสิ่งรอบตัว (เพิ่มได้หลายรายการ)</h2>
        <p className={styles.note} style={{ marginTop: 0 }}>
          ฟรี {FREE_NETWORK_PARTS} รายการแรก · เกินนั้นใช้ 20 เครดิต/ครั้ง (สูงสุด {MAX_NETWORK_PARTS} รายการ
          — หักครั้งเดียว ปรับรายการแล้วทำนายซ้ำได้)
        </p>
        <form onSubmit={getReading}>
          {rows.map((r, i) => (
            <div key={r.id} className={styles.draftRow}>
              <div className={styles.draftRowHead}>
                <span className={styles.draftRowNo}>รายการที่ {i + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeRow(r.id)}
                    aria-label={`ลบรายการที่ ${i + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>ประเภท</span>
                  <select
                    value={r.type}
                    onChange={(e) => updateRow(r.id, { type: e.target.value as EntityType })}
                    className={styles.input}
                  >
                    {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
                      <option key={t} value={t}>
                        {ENTITY_ICONS[t]} {ENTITY_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>ชื่อเรียก (ไม่บังคับ)</span>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="เช่น บ้านหลังใหม่ / รถคันเก่ง"
                    className={styles.input}
                  />
                </label>
              </div>
              {isPersonType(r.type) ? (
                // บุคคล — วันเกิดแทนเลข (สูตรคนตัวจริง: ธาตุจาก ElementSeed + เลขตัวตน 5 ด้าน)
                <label className={styles.field}>
                  <span>วันเกิดของเขา (ค.ศ.) — คำนวณธาตุและเลขตัวตนด้วยสูตรบุคคลจริง</span>
                  <input
                    type="date"
                    value={r.birthDate}
                    onChange={(e) => updateRow(r.id, { birthDate: e.target.value })}
                    className={styles.input}
                  />
                </label>
              ) : (
                <>
                  <label className={styles.field}>
                    <span>เลขอ้างอิง (บ้านเลขที่ / ทะเบียน / เบอร์โทร — ใส่อักษรป้ายได้)</span>
                    <input
                      type="text"
                      inputMode="text"
                      value={r.ref}
                      onChange={(e) => updateRow(r.id, { ref: e.target.value })}
                      placeholder="เช่น 47 · จง 6266 · 0812345678"
                      className={styles.input}
                    />
                  </label>
                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span>วันเริ่มต้น ถ้าทราบ (วันออกรถ / ขึ้นบ้าน / เปิดกิจการ)</span>
                      <input
                        type="date"
                        value={r.startDate}
                        onChange={(e) => updateRow(r.id, { startDate: e.target.value })}
                        className={styles.input}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>เวลา ถ้าทราบ (เพิ่มชั้นยาม)</span>
                      <input
                        type="time"
                        value={r.startTime}
                        onChange={(e) => updateRow(r.id, { startTime: e.target.value })}
                        className={styles.input}
                        disabled={!r.startDate}
                      />
                    </label>
                  </div>
                </>
              )}
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={r.shared}
                  onChange={(e) => updateRow(r.id, { shared: e.target.checked })}
                />
                <span>อยู่กับสิ่งนี้ทุกวัน (ให้น้ำหนักมากขึ้น 1.5 เท่า)</span>
              </label>
            </div>
          ))}

          <button
            type="button"
            className={styles.addRowBtn}
            onClick={addRow}
            disabled={rows.length >= MAX_NETWORK_PARTS}
          >
            {rows.length >= MAX_NETWORK_PARTS
              ? `ครบ ${MAX_NETWORK_PARTS} รายการแล้ว`
              : "➕ เพิ่มข้อมูลสิ่งรอบตัว"}
          </button>

          {formError && <p className={styles.error}>{formError}</p>}
          {needsLogin && (
            <a href="/login?next=/compatibility" className={styles.ctaLink}>เข้าสู่ระบบ / ผูกบัญชี →</a>
          )}
          {needsTopup && (
            <a href="/account" className={styles.ctaLink}>⭐ เติมเครดิต →</a>
          )}
          <button type="submit" className={styles.btn} disabled={unlocking}>
            {unlocking ? "กำลังปลดล็อก..." : "🔮 รับคำทำนายในภาพรวม"}
          </button>
        </form>
      </section>

      {/* ---- 3. คะแนนรายส่วน + แผนผังธาตุ ---- */}
      {seed && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>3. คะแนนรายส่วน & เคมีธาตุ</h2>

          <details className={styles.fold} open>
            <summary>🕸 แผนผังเคมีธาตุ & คะแนนรวมของข่าย</summary>
          {aggregate && (
            <div className={styles.aggBox}>
              <div className={styles.aggScore} data-tone={aggregate.tone}>
                {aggregate.score === null ? "--" : `${aggregate.score} / 100`}
              </div>
              <div className={styles.aggTrack}>
                <div
                  className={styles.aggFill}
                  data-tone={aggregate.tone}
                  style={{ width: `${aggregate.score ?? 0}%` }}
                />
              </div>
              <div className={styles.aggLabel}>{aggregate.label}</div>
              <p className={styles.note}>
                ⚠️ คะแนนรวมเป็นตัวช่วยอ่านภาพรวมที่ออกแบบขึ้นเอง ไม่มีในตำรา — ให้ดูรายจุดประกอบเสมอ
              </p>
            </div>
          )}

          <svg viewBox="0 0 320 320" className={styles.graph} role="img" aria-label="แผนผังความสัมพันธ์ของธาตุ">
            {scored.map(({ entity, result }, i) => {
              const angle = (i / Math.max(scored.length, 1)) * 2 * Math.PI - Math.PI / 2;
              const ex = CX + RADIUS * Math.cos(angle);
              const ey = CY + RADIUS * Math.sin(angle);
              const color = relationColorVar(result);
              return (
                <g
                  key={entity.id}
                  className={styles.node}
                  onClick={() => toggleExpand(entity.id, true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleExpand(entity.id, true)}
                >
                  <line
                    x1={CX}
                    y1={CY}
                    x2={ex}
                    y2={ey}
                    stroke={color}
                    strokeWidth={entity.shared ? 4.5 : 2.5}
                  />
                  <circle
                    cx={ex}
                    cy={ey}
                    r={20}
                    fill={`var(--${entity.element.toLowerCase()})`}
                    stroke={result.productive_clash ? "var(--clash)" : "var(--marble-vein)"}
                    strokeWidth={result.productive_clash ? 2.5 : 1}
                  />
                  <text x={ex} y={ey + 5} className={styles.icon}>
                    {ENTITY_ICONS[entity.type]}
                  </text>
                  <text x={ex} y={ey - 26} className={styles.badge} fill={color}>
                    {result.final_score > 0 ? "+" : ""}
                    {result.final_score}
                  </text>
                  <text x={ex} y={ey + (Math.sin(angle) > 0 ? 34 : -34)} className={styles.label}>
                    {entity.name.length > 10 ? `${entity.name.slice(0, 9)}…` : entity.name}
                  </text>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={26} fill={`var(--${seed.dominant.toLowerCase()})`} />
            <text x={CX} y={CY + 5} className={styles.selfLabel}>
              คุณ
            </text>
          </svg>

          {entities.length === 0 && (
            <p className={styles.empty}>ยังไม่มีสิ่งรอบตัวในข่าย — เพิ่มจากข้อ 2 ด้านบน</p>
          )}
          </details>

          {/* แอคคอร์เดียนรายส่วน — กาง/พับผลทำนายของแต่ละส่วน (คลิกโหนดในแผนผังก็เปิดได้) */}
          {scored.map(({ entity, result }) => {
            const part = holisticParts.find((p) => p.label === entity.name);
            const open = expanded.has(entity.id);
            return (
              <div key={entity.id} className={styles.accItem}>
                <div className={styles.accHeadRow}>
                  <button
                    type="button"
                    className={styles.accHead}
                    onClick={() => toggleExpand(entity.id)}
                    aria-expanded={open}
                  >
                    <span className={styles.accChev}>{open ? "▾" : "▸"}</span>
                    <span className={styles.accTitle}>
                      {ENTITY_ICONS[entity.type]} {entity.name}
                    </span>
                    {part && <span className={styles.accScore}>{part.aspects.ภาพรวม}/10</span>}
                    <span className="num" style={{ color: relationColorVar(result), fontWeight: 700 }}>
                      {result.final_score > 0 ? "+" : ""}
                      {result.final_score}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeRow(entity.id)}
                    aria-label={`ลบ ${entity.name}`}
                  >
                    ✕
                  </button>
                </div>
                {open && (
                  <div className={styles.accBody}>
                    <div className={styles.detailRow}>
                      <span>ธาตุ</span>
                      <b>{THAI_LABEL_5[entity.element]}</b>
                    </div>
                    <div className={styles.detailRow}>
                      <span>เคมีธาตุกับคุณ</span>
                      <b className="num">
                        {result.final_score > 0 ? "+" : ""}
                        {result.final_score}
                      </b>
                    </div>
                    <p className={styles.relation}>{result.relation_th}</p>
                    {part && (
                      <>
                        {part.personMissing && (
                          <div className={styles.detailRow}>
                            <span>ธาตุที่เขาขาด</span>
                            <b>{part.personMissing.length ? part.personMissing.join(", ") : "ครบทั้ง 4"}</b>
                          </div>
                        )}
                        <AspectBars
                          aspects={part.aspects}
                          title={part.personMissing ? "คะแนน 5 ด้านจากเลขตัวตนของเขา" : "คะแนน 5 ด้านของส่วนนี้"}
                        />
                        {part.omen && (
                          <p className={styles.partMeta}>
                            🏁 จังหวะเริ่มต้น (วัน{part.omen.dayTh}): {part.omen.note}
                            {part.omen.timeVerdict ? ` · เมื่อรวมยาม: ${part.omen.timeVerdict}` : ""}
                          </p>
                        )}
                        {part.aspects.การ์ดผลรวม && (
                          <p className={styles.partMeta}>🃏 การ์ดผลรวมเลข: {part.aspects.การ์ดผลรวม}</p>
                        )}
                        {part.aspects.ความหมายเลขท้าย && (
                          <p className={styles.partMeta}>✨ เลขท้าย: {part.aspects.ความหมายเลขท้าย}</p>
                        )}
                        {part.personMissing && (
                          <p className={styles.partMeta} style={{ opacity: 0.8 }}>
                            อ่านเป็น &quot;ความเข้ากันของพลังงาน&quot; เท่านั้น — ไม่ใช่คำตัดสินตัวบุคคล
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ---- 4. ความสอดคล้องทั้งข่าย + คำแนะนำ ---- */}
      {advice && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>4. ความสอดคล้องทั้งข่าย (5 ด้าน)</h2>
          <details className={styles.fold} open>
            <summary>📊 ตารางความสอดคล้องรายด้าน</summary>
            {coherence.map((c) => (
              <div key={c.key} className={styles.coRow}>
                <span className={styles.coLabel}>{c.labelTh}</span>
                <span className={styles.coChip} data-tone={c.tone}>
                  {c.tone === "strong" ? "✅ หนุนกันทั้งข่าย" : c.tone === "caution" ? "⚠️ มีจุดต้องดู" : "· กลางๆ"}
                </span>
                <span className={styles.coDetail}>
                  เฉลี่ย {c.avg} · สูงสุด {c.strongest.label} ({c.max}) · ต่ำสุด {c.weakest.label} ({c.min})
                </span>
              </div>
            ))}
          </details>

          {advice.strengths.length > 0 && (
            <details className={styles.fold} open>
              <summary>✅ จุดแข็งที่ช่วยส่งเสริม ({advice.strengths.length})</summary>
              <ul className={styles.adviceList}>
                {advice.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
          {advice.cautions.length > 0 && (
            <details className={styles.fold} open>
              <summary>⚠️ ข้อควรระวัง ({advice.cautions.length})</summary>
              <ul className={styles.adviceList}>
                {advice.cautions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
          {advice.tips.length > 0 && (
            <details className={styles.fold} open>
              <summary>💡 ข้อแนะนำอื่น ({advice.tips.length})</summary>
              <ul className={styles.adviceList}>
                {advice.tips.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
          <p className={styles.note} style={{ marginTop: "0.8rem" }}>
            {advice.caveats.map((c, i) => <span key={i}>⚠️ {c}<br /></span>)}
          </p>
          {/* upsell เส้นฟรี: ข่าย ≤2 ชิ้นยังไม่มีคำทำนายฉบับเรียบเรียง */}
          {entities.length > 0 && entities.length <= FREE_NETWORK_PARTS && (
            <p className={styles.note} style={{ marginTop: "0.6rem" }}>
              💡 เพิ่มเป็น {FREE_NETWORK_PARTS + 1} รายการขึ้นไป — รับ
              <b>คำทำนายฉบับเรียบเรียงจากอาจารย์ลาลา</b> (รวมในการปลดล็อก 20 เครดิต)
            </p>
          )}
        </section>
      )}

      {/* ---- 5. คำทำนายฉบับเรียบเรียง (4 องก์ — เฉพาะข่ายปลดล็อก) ---- */}
      {(narrLoading || narration) && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>5. คำทำนายจากอาจารย์ลาลา</h2>
          {narrLoading && <p className={styles.note}>🐾 แม่หมอกำลังเรียบเรียงคำทำนายของทั้งข่าย...</p>}
          {narration && <div className={styles.narration}>{narration}</div>}
        </section>
      )}

      {/* แชท AI ประจำฟังก์ชัน — ช่วงทดลองถามได้ 2 คำถาม (lib/chat/quota.ts) */}
      <FunctionChat
        logicId={20}
        context={
          seed
            ? {
                ธาตุของฉัน: seed,
                ส่วนในข่าย: holisticParts.map((p) => ({
                  ส่วน: `${p.icon} ${p.label}`,
                  คะแนน5ด้าน: p.aspects.คะแนน,
                  ภาพรวม: p.aspects.ภาพรวม,
                  เคมีธาตุ: p.chemistry?.relation_th ?? "—",
                })),
                ความสอดคล้อง: coherence.map((c) => ({ ด้าน: c.labelTh, เฉลี่ย: c.avg, ต่ำสุด: `${c.weakest.label} ${c.min}` })),
                คำแนะนำ: advice,
                คะแนนรวมข่ายธาตุ: aggregate,
              }
            : null
        }
        placeholder="เช่น ควรแก้ตรงไหนก่อนดี"
      />
    </div>
  );
}
