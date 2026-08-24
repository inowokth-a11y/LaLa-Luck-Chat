// จัดอันดับ "วันฤกษ์ดี" ในช่วงวันที่ — ต่อยอด Logic 3 (กาลโยค + อุบากอง) CLAUDE.md §3.6
// ตรรกะล้วน (เทสต์ได้ · คำนวณฝั่ง client ได้ ฟรี ไม่ใช้ AI)
//
// 🔴 caveat สำคัญ (บากไว้ทุกผล): อาจารย์ใหญ่หลายท่านเลิกใช้กาลโยคเป็นเกณฑ์หลัก — ใช้ประกอบ
//    · อุบากองมีแค่ยามกลางวัน (06:01-18:00) · ยังไม่รวมชั้นดวงส่วนตัว (ลัคนายังไม่ verify §5.2)

import { checkDayKalaYoke } from "./kalayoke";
import { bestTimeToday } from "./auspicious";
import { thaiDayOfWeek } from "./card-id";
import { calculateElementSeed, wuXingScore, DAY_ELEMENT, THAI_LABEL_4, type Element4, type Element5 } from "./element";
import { getMoonSign, kalakiniRuledSigns } from "./daily";
import { artifactElement } from "./numerology";
import { nameElement } from "./naming";

/** เน้นประเภทวันดีตามงาน: ธงชัย=สิ่งของ/สถานที่ · อธิบดี=บุคคล/อำนาจ · any=นับวันดีทุกแบบ */
export type Emphasis = "thanchai" | "athibodi" | "any";

export interface Activity {
  key: string;
  label: string;
  emphasis: Emphasis;
}
export const ACTIVITIES: Activity[] = [
  { key: "open_company", label: "เปิด/จดทะเบียนบริษัท", emphasis: "thanchai" },
  { key: "car_registration", label: "ขอทะเบียนรถ/ออกรถ", emphasis: "thanchai" },
  { key: "housewarming", label: "ขึ้นบ้านใหม่", emphasis: "thanchai" },
  { key: "negotiation", label: "เจรจา/ประชุมสำคัญ", emphasis: "athibodi" },
  { key: "general", label: "ทั่วไป", emphasis: "any" },
];

/**
 * ช่องกรอกเพิ่มรายหมวด (ผู้ใช้สั่ง 22 ส.ค. 2569) — เฉพาะข้อมูลที่มีชั้นคำนวณจริงรองรับ:
 * วันเกิด → กาลกิณี (จันทร์จรเข้าเรือนกาลกิณี — ตาราง verify แล้ว) + ธาตุประจำวัน×ธาตุผู้ทำ ·
 * เลขบ้าน/ทะเบียน → ธาตุวัตถุ (Logic 2)×ธาตุประจำวัน · ชื่อกิจการ → ธาตุชื่อ (Logic 19 ⚠️
 * ตารางกลุ่มอักษรยังไม่ verify) · วันเกิดคู่เจรจา → ชั้นเดียวกับผู้ทำ
 * ทุกช่องไม่บังคับ — ไม่กรอก = ผลเท่าเวอร์ชันเดิมทุกตัวอักษร
 */
export interface ActivityFields {
  /** ป้ายช่องเลขอ้างอิง — ไม่มี = ไม่โชว์ช่องเลข */
  refLabel?: string;
  /** โชว์ช่องชื่อกิจการ (ธาตุชื่อ) */
  businessName?: boolean;
  /** โชว์ช่องวันเกิดคู่เจรจา */
  partnerBirthDate?: boolean;
}
export const ACTIVITY_FIELDS: Record<string, ActivityFields> = {
  open_company: { businessName: true },
  car_registration: { refLabel: "เลขทะเบียน ถ้ามีแล้ว/เลขที่จอง (เช่น จง 6266)" },
  housewarming: { refLabel: "บ้านเลขที่ (เช่น 47)" },
  negotiation: { partnerBirthDate: true },
  general: {},
};

export const TIMING_CAVEAT =
  "กาลโยคเป็นเกณฑ์ประกอบ — อาจารย์โหราศาสตร์ไทยหลายท่านเลิกใช้เป็นเกณฑ์หลัก (ยังไม่มีข้อพิสูจน์ความแม่นเพียงพอ) · " +
  "ยามอุบากองครอบคลุมเฉพาะกลางวัน (06:01-18:00) · ผลนี้ยังไม่รวมชั้นดวงส่วนตัว (ลัคนา) โปรดใช้วิจารณญาณ";

export type Verdict = "excellent" | "good" | "neutral" | "avoid";

export interface DayRanking {
  dateISO: string;
  dayOfWeekTh: string;
  goodTypes: string[]; // ธงชัย/อธิบดี ที่ตรงวันนี้
  badTypes: string[]; // อุบาทว์/โลกาวินาศ ที่ตรงวันนี้
  verdict: Verdict;
  score: number;
  bestHour: { range: string; yam: string; meaning: string; score: number };
  /** เหตุผลจากชั้นข้อมูลส่วนตัว/รายหมวด — มีเฉพาะเมื่อผู้ใช้กรอกข้อมูลเสริม */
  personalNotes?: string[];
}

/** จ.ศ. ที่ใช้ได้จริงของวันนั้น — ปีกาลโยคเปลี่ยน 16 เม.ย. (ก่อนหน้านั้นใช้ปีก่อน) §3.6
 *  (export ให้ network-holistic ใช้ตรวจ "จังหวะเริ่มต้น" — แหล่งเดียว ห้ามก๊อปสูตร) */
export function kalaYokeCsForDate(y: number, m: number, d: number): number {
  const afterBoundary = m > 4 || (m === 4 && d >= 16);
  return (afterBoundary ? y : y - 1) - 638; // จ.ศ. = ค.ศ. - 638
}

const toISO = (dt: Date) => dt.toISOString().slice(0, 10);
const GOOD_SET = new Set(["ธงชัย", "อธิบดี"]);

/** วนทุกวันในช่วง [fromISO, toISO] → จัดอันดับวันดีที่สุดก่อน (จำกัดจำนวนวันกันลูปยาว) */
// --- ชั้นข้อมูลส่วนตัว/รายหมวด (ทุกตัวไม่บังคับ) ---

const ZODIAC_ANIMALS_TM = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];

interface PersonLayer {
  labelPrefix: string; // "" = ผู้ทำ · "คู่เจรจา" = อีกฝ่าย
  dominant: Element4;
  missing: Element4[];
  kalakini: { planetTh: string; signs: string[] } | null;
}

/** เตรียมชั้นบุคคลจากวันเกิด — null เมื่อวันที่ไม่ถูกต้อง (พ.ศ./รูปแบบผิด = ไม่คำนวณ ไม่เดา) */
function buildPersonLayer(birthDate: string | null | undefined, labelPrefix: string): PersonLayer | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, mo, da] = birthDate.split("-").map(Number);
  const nowY = new Date().getUTCFullYear();
  if (y < 1900 || y > nowY) return null;
  const seed = calculateElementSeed({
    day_of_week: thaiDayOfWeek(birthDate),
    birth_month: mo,
    birth_year_ad: y,
    birth_day: da,
    zodiac_year_animal: ZODIAC_ANIMALS_TM[(((y - 2020) % 12) + 12) % 12],
  });
  return {
    labelPrefix,
    dominant: seed.dominant,
    missing: seed.missing,
    kalakini: kalakiniRuledSigns(thaiDayOfWeek(birthDate)),
  };
}

export function rankAuspiciousDays(opts: {
  fromISO: string;
  toISO: string;
  emphasis: Emphasis;
  maxDays?: number;
  /** วันเกิดผู้ทำ (YYYY-MM-DD) → ชั้นกาลกิณี + ธาตุประจำวัน×ธาตุผู้ทำ */
  birthDate?: string | null;
  /** วันเกิดคู่เจรจา (หมวดเจรจา) — ชั้นเดียวกับผู้ทำ */
  partnerBirthDate?: string | null;
  /** เลขอ้างอิงของวัตถุ (บ้านเลขที่/ทะเบียน) → ธาตุวัตถุ (Logic 2)×ธาตุประจำวัน */
  refNumber?: string | null;
  refLabel?: string;
  /** ชื่อกิจการ → ธาตุชื่อ (Logic 19 ⚠️ ตารางยังไม่ verify)×ธาตุประจำวัน */
  businessName?: string | null;
}): { days: DayRanking[]; caveat: string } {
  const { emphasis } = opts;
  const maxDays = Math.min(opts.maxDays ?? 92, 366);
  const start = new Date(opts.fromISO + "T00:00:00Z");
  const end = new Date(opts.toISO + "T00:00:00Z");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { days: [], caveat: TIMING_CAVEAT };
  }

  // เตรียมชั้นเสริมครั้งเดียวนอกลูป (ทุกตัว optional — ไม่ให้ = พฤติกรรมเดิมเป๊ะ)
  const persons: PersonLayer[] = [
    buildPersonLayer(opts.birthDate, ""),
    buildPersonLayer(opts.partnerBirthDate, "คู่เจรจา"),
  ].filter((p): p is PersonLayer => p !== null);
  const refDigits = (opts.refNumber ?? "").replace(/\D/g, "");
  const refElRaw = refDigits && refDigits.length <= 10 ? artifactElement(Number(refDigits)) : null;
  const refEl = (refElRaw && ["Fire", "Earth", "Metal", "Water", "Wood"].includes(refElRaw) ? refElRaw : null) as Element5 | null;
  const nameEl = opts.businessName?.trim() ? nameElement(opts.businessName.trim()) : null;
  const hasPersonal = persons.length > 0 || refEl !== null || nameEl !== null;

  const emphType = emphasis === "thanchai" ? "ธงชัย" : emphasis === "athibodi" ? "อธิบดี" : null;
  const days: DayRanking[] = [];

  const cur = new Date(start);
  for (let i = 0; i < maxDays && cur <= end; i++) {
    const iso = toISO(cur);
    const y = cur.getUTCFullYear(), m = cur.getUTCMonth() + 1, d = cur.getUTCDate();
    const dayTh = thaiDayOfWeek(iso);
    const cs = kalaYokeCsForDate(y, m, d);

    const hits = checkDayKalaYoke(dayTh, cs).kala_yoke_hits;
    const goodTypes = hits.filter((h) => GOOD_SET.has(h.type)).map((h) => h.type);
    const badTypes = hits.filter((h) => !GOOD_SET.has(h.type)).map((h) => h.type);

    // คะแนน: ตรงประเภทที่เน้น +3 · มีวันดีอื่น +1 · มีวันร้าย -3
    let score = 0;
    if (emphType && goodTypes.includes(emphType)) score += 3;
    else if (goodTypes.length > 0) score += 1;
    if (badTypes.length > 0) score -= 3;

    // --- ชั้นเสริมส่วนตัว/รายหมวด (น้ำหนักเบากว่ากาลโยค ยกเว้นกาลกิณี: −3 เท่าวันร้าย · ธาตุ ±1) ---
    const personalNotes: string[] = [];
    let kalakiniHit = false;
    if (hasPersonal) {
      const dayEl = DAY_ELEMENT[dayTh];
      // จันทร์จร ณ ~เที่ยงวันไทย (12:00 = 05:00 UTC) เป็นตัวแทนของวัน (จันทร์ ~13°/วัน)
      const moonSign = persons.some((p) => p.kalakini && p.kalakini.signs.length > 0)
        ? getMoonSign({ year: y, month: m, day: d, hour: 5 })
        : null;
      for (const p of persons) {
        const who = p.labelPrefix ? `ของ${p.labelPrefix}` : "ของคุณ";
        if (moonSign && p.kalakini && p.kalakini.signs.includes(moonSign)) {
          score -= 3;
          kalakiniHit = true;
          personalNotes.push(`⚠️ จันทร์จร (ราศี${moonSign}) เข้าเรือนกาลกิณี${who} (${p.kalakini.planetTh})`);
        }
        if (dayEl) {
          const fit = wuXingScore(p.dominant, dayEl, [...p.missing]).final_score;
          if (fit >= 2) {
            score += 1;
            personalNotes.push(`ธาตุประจำวัน (${THAI_LABEL_4[dayEl]}) เกื้อหนุนธาตุ${who} (+${fit})`);
          } else if (fit <= -2) {
            score -= 1;
            personalNotes.push(`ธาตุประจำวัน (${THAI_LABEL_4[dayEl]}) พิฆาตกับธาตุ${who} (${fit})`);
          }
        }
      }
      // วัตถุ/ชื่อกิจการ: มุม "วันบำรุงสิ่งนั้น" (เขา=วัน ให้กำเนิด เรา=ของ → +2 ตามทาง ค)
      for (const [el, label] of [
        [refEl, opts.refLabel ?? "สิ่งที่เกี่ยวข้อง"],
        [nameEl, "ชื่อกิจการ"],
      ] as Array<[Element5 | null, string]>) {
        if (!el || !dayEl) continue;
        const fit = wuXingScore(el, dayEl, []).final_score;
        if (fit >= 2) {
          score += 1;
          personalNotes.push(`ธาตุประจำวันบำรุงธาตุของ${label} (+${fit})`);
        } else if (fit <= -2) {
          score -= 1;
          personalNotes.push(`ธาตุประจำวันไม่ถูกกับธาตุของ${label} (${fit})`);
        }
      }
    }

    const bh = bestTimeToday(dayTh).best;
    // กาลกิณีนับเป็นสัญญาณร้ายเทียบเท่าวันร้ายกาลโยค (หลักเดียวกับ Logic 8 ที่ถือเป็นวันควรระวัง)
    const verdict: Verdict =
      (badTypes.length > 0 || kalakiniHit) && score < 0 ? "avoid" : score >= 3 ? "excellent" : score >= 1 ? "good" : "neutral";

    days.push({
      dateISO: iso,
      dayOfWeekTh: dayTh,
      goodTypes,
      badTypes,
      verdict,
      score,
      bestHour: { range: bh.time_range, yam: bh.yam_name, meaning: bh.meaning, score: bh.score },
      ...(hasPersonal ? { personalNotes } : {}),
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  // เรียง: คะแนนมากก่อน → ยามดีสุดของวัน → วันที่เร็วกว่า
  days.sort((a, b) => b.score - a.score || b.bestHour.score - a.bestHour.score || a.dateISO.localeCompare(b.dateISO));

  // caveat เพิ่มตามชั้นที่ใช้จริง — บอกตรงว่าชั้นไหนรวมแล้ว/ยังไม่รวม + ข้อจำกัดราหู/ตารางชื่อ
  let caveat = TIMING_CAVEAT;
  if (hasPersonal) {
    caveat +=
      " · ชั้นดวงส่วนตัวที่รวมแล้ว: กาลกิณี (จันทร์จร ณ ประมาณเที่ยงวัน) + ธาตุประจำวัน — ยังไม่รวมชั้นลัคนารายชั่วโมง";
    if (persons.some((p) => p.kalakini && p.kalakini.signs.length === 0)) {
      caveat += " · ผู้เกิดวันศุกร์ (กาลกิณีคือราหู) ตรวจเรือนกาลกิณีไม่ได้ตามหลักดั้งเดิม";
    }
    if (nameEl) caveat += " · ธาตุจากชื่อกิจการใช้เกณฑ์เลขกลุ่มอักษร→ดาวประจำเลข→ธาตุประจำวัน";
  }
  return { days, caveat };
}
