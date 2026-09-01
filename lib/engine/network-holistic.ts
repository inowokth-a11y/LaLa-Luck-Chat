// โหมด "ทำนายแบบองค์รวม" (Logic 20 ยกเครื่อง — ผู้ใช้สั่ง 22 ส.ค. 2569)
//
// แนวคิด: เพิ่มหลายส่วนพร้อมกัน (ตนเอง · บ้าน · ทะเบียนรถ · โทรศัพท์ · เพื่อนร่วมงาน ฯลฯ)
// → คะแนน 5 ด้านของแต่ละส่วน (numberAspects — สูตรเสริมที่มี caveat บังคับอยู่แล้ว)
// → ความสอดคล้องรายด้านทั้งข่าย → จุดแข็ง / ข้อควรระวัง / คำแนะนำ (เทมเพลต ฿0 ห้ามเรียก AI)
//
// "เลขตัวตน" = พลังงานส่วนบุคคล 00-99 สูตรรวม (Birth+Name+Time+Day, ส่วนที่ไม่มี=0 — มติ 31 ส.ค. 2569)
// ตาม CLAUDE.md §4 ข้อ 1 (Track A มาจาก BirthPower เพียงอย่างเดียว) ไม่ใช่สูตรการ์ด A เต็ม
// (Birth+Day+Time+Name) เพราะที่นี่ต้องการ "เลขจากวันเกิดล้วน" ไม่พึ่งชื่อ/เวลา
//
// ⚠️ คะแนน 5 ด้าน/ความสอดคล้อง เป็นสูตรเสริมออกแบบเอง (ไม่มีในตำรา) — caveat ต้องแสดงเสมอ

import {
  numberAspects,
  NUMBER_ASPECTS_CAVEAT,
  ASPECT_KEYS,
  ASPECT_LABEL_TH,
  type AspectKey,
  type NumberAspectsResult,
} from "./number-aspects";
import { digitSum, reduceTo99, thaiDayOfWeek } from "./card-id";
import {
  calculateElementSeed,
  THAI_LABEL_5,
  type Element5,
  type ElementSeedResult,
  type WuXingResult,
} from "./element";
import { ELEMENT_TO_COLORS } from "./fengshui";
import { checkDayKalaYoke, checkCombinedAuspiciousTime } from "./kalayoke";
import { kalaYokeCsForDate, TIMING_CAVEAT } from "./timing";

// ---------------------------------------------------------------------------
// ขีดจำกัดข่าย (ผู้ใช้เคาะ 22 ส.ค. 2569): ฟรี 2 สิ่งรอบตัว · สูงสุด 10 · เกิน 2 = 20 เครดิต/ครั้ง
// (เรทอยู่ที่ lib/credits/pricing.ts key "holistic_network" · เกตที่ /api/holistic)
// ---------------------------------------------------------------------------

export const FREE_NETWORK_PARTS = 2;
export const MAX_NETWORK_PARTS = 10;

// ---------------------------------------------------------------------------
// เลขตัวตน (พลังงานส่วนบุคคล 00-99) — เปลี่ยนนิยาม 31 ส.ค. 2569 (ผู้ใช้เคาะหลังมีผู้ทดลอง
// ยืนยันว่าสูตรรวมตรงกว่า): Birth+Name+Time+Day ส่วนที่ไม่มี = 0 — โหมดที่มีแค่วันเกิด
// ได้ Birth+Day (เดิมเป็น BirthPower ล้วนตาม §4 ข้อ 1 ซึ่งถูกมตินี้แทนที่)
// ---------------------------------------------------------------------------

export { personalEnergyNumber } from "./card-id";

// ---------------------------------------------------------------------------
// บุคคลในข่ายจากวันเกิด (ผู้ใช้เคาะ 22 ส.ค. 2569) — คนใช้สูตรคนตัวจริง ไม่ใช่เลข:
// ธาตุจาก calculateElementSeed (DAY_ELEMENT verify แล้ว + ลี่ชุน) · คะแนน 5 ด้านจาก
// "เลขตัวตน" ของเขา (BirthPower→00-99 — วิธีเดียวกับส่วนตนเองเป๊ะ ไม่มีสูตรใหม่)
// ---------------------------------------------------------------------------

const ZODIAC_ANIMALS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
];
const zodiacAnimalFromYear = (yearAd: number) => ZODIAC_ANIMALS[(((yearAd - 2020) % 12) + 12) % 12];

/** ตรวจรูปแบบ+ช่วงปีของวันที่ (กัน พ.ศ./ปีเสีย — บทเรียน data-quality §5.1) */
function parseISODate(dateISO: string): { y: number; m: number; d: number } | null {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!mt) return null;
  const [y, m, d] = [Number(mt[1]), Number(mt[2]), Number(mt[3])];
  const nowY = new Date().getUTCFullYear();
  if (y < 1900 || y > nowY + 1 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** ธาตุ+seed ของบุคคลจากวันเกิด — null เมื่อวันที่ไม่ถูกต้อง (พ.ศ./นอกช่วง) */
export function personSeedFromBirthDate(birthDate: string): ElementSeedResult | null {
  const p = parseISODate(birthDate);
  if (!p || p.y > new Date().getUTCFullYear()) return null;
  return calculateElementSeed({
    day_of_week: thaiDayOfWeek(birthDate),
    birth_month: p.m,
    birth_year_ad: p.y,
    birth_day: p.d,
    zodiac_year_animal: zodiacAnimalFromYear(p.y),
  });
}

// ---------------------------------------------------------------------------
// จังหวะเริ่มต้นของวัตถุ/สถานที่ (วันออกรถ/ขึ้นบ้าน/เปิดกิจการ) — กาลโยคย้อนหลัง
// สูตรจริงทั้งหมด: checkDayKalaYoke (verify กับวิกิพีเดีย) + ขอบเขตปี จ.ศ. 16 เม.ย. ·
// ให้เวลา = เพิ่มชั้นยาม (checkCombinedAuspiciousTime — ตัวรวมที่มีเทสต์แล้ว)
// 🔴 ผลร้ายย้อนหลังต้องเฟรมนุ่ม + จบด้วยทางแก้เสมอ (หลักตำราเอง: "ไม่ได้วินาศทั้งวัน" §3.6)
// ---------------------------------------------------------------------------

export type OmenTone = "good" | "bad" | "mixed" | "neutral";

export interface StartOmen {
  dateISO: string;
  dayTh: string;
  /** จ.ศ. ที่ใช้ตัดสิน (เก็บไว้ตามรอย — ขอบเขต 16 เม.ย.) */
  cs: number;
  good: string[]; // ธงชัย/อธิบดี ที่ตรง
  bad: string[]; // อุบาทว์/โลกาวินาศ ที่ตรง
  tone: OmenTone;
  note: string;
  /** คำตัดสินรวมเมื่อทราบเวลา (ยามกาลโยค+อุบากอง) — null เมื่อไม่ได้ให้เวลา */
  timeVerdict: string | null;
}

export function startDateOmen(dateISO: string, timeHHMM?: string | null): StartOmen | null {
  const p = parseISODate(dateISO);
  if (!p) return null;
  const dayTh = thaiDayOfWeek(dateISO);
  const cs = kalaYokeCsForDate(p.y, p.m, p.d);
  const hits = checkDayKalaYoke(dayTh, cs).kala_yoke_hits;
  const good = hits.filter((h) => h.valence === "ดี").map((h) => h.type);
  const bad = hits.filter((h) => h.valence === "ร้าย").map((h) => h.type);
  const tone: OmenTone = good.length && bad.length ? "mixed" : good.length ? "good" : bad.length ? "bad" : "neutral";

  let timeVerdict: string | null = null;
  const tm = timeHHMM ? /^(\d{2}):(\d{2})$/.exec(timeHHMM) : null;
  if (tm) {
    const combined = checkCombinedAuspiciousTime(dayTh, { hour: Number(tm[1]), minute: Number(tm[2]) }, cs);
    timeVerdict = combined.combined_verdict;
  }

  const note =
    tone === "good"
      ? `เริ่มต้นวัน${good.join("/")}ของปีนั้น — ฤกษ์ดีสำหรับสิ่งของ/สถานที่ตามกาลโยค`
      : tone === "bad"
        ? `ตรงวัน${bad.join("/")}ของปีนั้น — ตำราชี้เองว่าวันร้ายไม่ได้ร้ายทั้งวัน (ขึ้นกับยาม) เสริมสมดุลด้วยธาตุ/สีช่วยได้ ไม่ต้องกังวลเกินเหตุ`
        : tone === "mixed"
          ? `วันนั้นมีทั้งฤกษ์ดี (${good.join("/")}) และร้าย (${bad.join("/")}) — ตำราให้ตัดสินที่ยาม${tm ? "" : " ซึ่งต้องทราบเวลา"}`
          : "ไม่ตรงทั้งวันดีและวันร้ายของกาลโยคปีนั้น — ถือเป็นกลาง";

  return { dateISO, dayTh, cs, good, bad, tone, note, timeVerdict };
}

/** caveat กาลโยคบังคับเมื่อมีการตรวจจังหวะเริ่มต้น (นักโหราศาสตร์ใหญ่บางท่านเลิกใช้ — §3.6) */
export const START_OMEN_CAVEAT = TIMING_CAVEAT;

// ---------------------------------------------------------------------------
// แยกเลข/อักษรจากช่องเลขอ้างอิง (รองรับ "จง 6266" · เบอร์ 0 นำหน้า · บ้านเลขที่)
// ---------------------------------------------------------------------------

export interface ParsedRef {
  /** สตริงหลักตัวเลขล้วน (คงเลข 0 นำหน้า) */
  digits: string;
  /** อักษรไทยบนป้าย (ถ้ามี เช่น "จง") — ส่งเข้า numberAspects เป็น plateLetters */
  letters: string | null;
}

export function parseRefInput(input: string): ParsedRef | null {
  const digits = input.replace(/\D/g, "");
  if (!digits || digits.length > 10) return null;
  const letters = (input.match(/[ก-ฮ]+/g) ?? []).join("");
  return { digits, letters: letters || null };
}

/** คะแนน 5 ด้านของส่วนหนึ่ง — ห่อ numberAspects (จุดเรียกเดียว หน้าห้ามคำนวณเอง) */
export function partAspects(
  ref: ParsedRef,
  userDominant?: Element5,
  userMissing: Element5[] = []
): NumberAspectsResult {
  return numberAspects(ref.digits, userDominant, userMissing, ref.letters ?? undefined);
}

// ---------------------------------------------------------------------------
// ความสอดคล้องรายด้านทั้งข่าย
// ---------------------------------------------------------------------------

export interface HolisticPart {
  /** ชื่อที่ผู้ใช้เห็น เช่น "ตัวคุณ (เลขตัวตน 32)" / "บ้านหลังใหม่" */
  label: string;
  icon: string;
  aspects: NumberAspectsResult;
  /** เคมีธาตุกับผู้ใช้ — null สำหรับส่วน "ตนเอง" (ไม่เทียบกับตัวเอง) */
  chemistry: WuXingResult | null;
  element: Element5 | null;
  /** จังหวะเริ่มต้น (กาลโยคของวันออกรถ/ขึ้นบ้าน ฯลฯ) — เฉพาะวัตถุที่ให้วันที่มา */
  omen?: StartOmen | null;
  /** ธาตุที่บุคคลนี้ขาด (เฉพาะส่วนที่เป็นคน — จาก ElementSeed ของเขา) */
  personMissing?: string[] | null;
  /** คะแนนคู่ 36 Ashtakoota (เฉพาะบุคคล — รอบ 3 แผน Jyotish · ชั้นเสริม อ่านแยกจากคะแนน 5 ด้าน) */
  koota?: import("./ashtakoota").AshtakootaResult | null;
}

export type CoherenceTone = "strong" | "caution" | "neutral";

export interface AspectCoherence {
  key: AspectKey;
  labelTh: string;
  avg: number;
  min: number;
  max: number;
  strongest: { label: string; score: number };
  weakest: { label: string; score: number };
  tone: CoherenceTone;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** สรุปความสอดคล้องรายด้าน — strong: ทุกส่วน ≥6.5 · caution: มีส่วนใด ≤4 */
export function analyzeCoherence(parts: readonly HolisticPart[]): AspectCoherence[] {
  if (!parts.length) return [];
  return ASPECT_KEYS.map((key) => {
    const labelTh = ASPECT_LABEL_TH[key];
    const scores = parts.map((p) => ({ label: p.label, score: p.aspects.คะแนน[labelTh] ?? 0 }));
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const min = sorted[sorted.length - 1].score;
    const max = sorted[0].score;
    const avg = round1(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    return {
      key,
      labelTh,
      avg,
      min,
      max,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      tone: min >= 6.5 ? "strong" : min <= 4 ? "caution" : ("neutral" as CoherenceTone),
    };
  });
}

// ---------------------------------------------------------------------------
// จุดแข็ง / ข้อควรระวัง / คำแนะนำ — เทมเพลตจากข้อมูลจริงล้วน
// ---------------------------------------------------------------------------

/** วงจรให้กำเนิด (相生) — ใช้หา "ธาตุสะพาน" ตอนพิฆาต: ธาตุที่ตัวพิฆาตให้กำเนิด จะไปบำรุงฝ่ายถูกพิฆาตพอดี */
const GEN_NEXT: Record<Element5, Element5> = {
  Wood: "Fire",
  Fire: "Earth",
  Earth: "Metal",
  Metal: "Water",
  Water: "Wood",
};

/** วงจรพิฆาต (相剋): ผู้พิฆาต → ผู้ถูกพิฆาต */
const CONTROLS: Record<Element5, Element5> = {
  Wood: "Earth",
  Earth: "Water",
  Water: "Fire",
  Fire: "Metal",
  Metal: "Wood",
};

/** ธาตุสะพานเมื่อสองธาตุพิฆาตกัน (通關) — คืน null ถ้าคู่นี้ไม่ได้พิฆาตกัน */
export function bridgeElement(a: Element5, b: Element5): Element5 | null {
  if (CONTROLS[a] === b) return GEN_NEXT[a];
  if (CONTROLS[b] === a) return GEN_NEXT[b];
  return null;
}

export const HOLISTIC_CAVEAT =
  "ความสอดคล้องรวมและคำแนะนำเป็นเครื่องมือช่วยอ่านที่ออกแบบขึ้นเอง ไม่มีในตำรา — ใช้ประกอบการพิจารณา ไม่ใช่คำฟันธง";

export interface HolisticAdvice {
  strengths: string[];
  cautions: string[];
  tips: string[];
  caveats: string[];
}

export function holisticAdvice(
  parts: readonly HolisticPart[],
  coherence: readonly AspectCoherence[],
  userDominant: Element5 | null
): HolisticAdvice {
  const strengths: string[] = [];
  const cautions: string[] = [];
  const tips: string[] = [];

  // --- จุดแข็ง: ด้านที่ทุกส่วนหนุนกัน ---
  for (const c of coherence) {
    if (c.tone === "strong") {
      strengths.push(
        `ด้าน${c.labelTh}สอดคล้องกันทั้งข่าย (ต่ำสุด ${c.min}/10) — เด่นสุดที่ ${c.strongest.label} (${c.strongest.score})`
      );
    }
  }
  // เคมีธาตุที่เกื้อหนุน (+2) — รวม Productive Clash
  for (const p of parts) {
    if (!p.chemistry || !p.element) continue;
    if (p.chemistry.productive_clash) {
      strengths.push(
        `${p.icon} ${p.label} เป็นธาตุ${THAI_LABEL_5[p.element]}ที่คุณขาด — พลิกเป็น "ยา" เกื้อหนุนคุณ (+${p.chemistry.final_score})`
      );
    } else if (p.chemistry.final_score >= 2) {
      strengths.push(`${p.icon} ${p.label} ธาตุ${THAI_LABEL_5[p.element]}บำรุงธาตุคุณโดยตรง (+${p.chemistry.final_score})`);
    }
  }

  // --- ข้อควรระวัง: ด้านที่มีส่วนใดต่ำ + เคมีพิฆาต ---
  for (const c of coherence) {
    if (c.tone === "caution") {
      const lean =
        c.max >= 6.5 ? ` — ด้านนี้พึ่ง ${c.strongest.label} (${c.strongest.score}) ช่วยพยุงได้` : "";
      cautions.push(`${c.weakest.label} ได้ด้าน${c.labelTh}เพียง ${c.min}/10 ฉุดภาพรวมของข่าย${lean}`);
    }
  }
  for (const p of parts) {
    if (!p.chemistry || !p.element || !userDominant) continue;
    if (p.chemistry.final_score <= -2 && !p.chemistry.productive_clash) {
      const bridge = bridgeElement(userDominant, p.element);
      const remedy = bridge
        ? ` — เสริมธาตุ${THAI_LABEL_5[bridge]}เป็นสะพาน (เช่น สี${ELEMENT_TO_COLORS[bridge].slice(0, 2).join("/")})`
        : "";
      cautions.push(`${p.icon} ${p.label} ธาตุ${THAI_LABEL_5[p.element]}พิฆาตกับธาตุคุณ (${p.chemistry.final_score})${remedy}`);
    }
  }

  // --- คำแนะนำอื่น ---
  const withOverall = parts.map((p) => ({ p, overall: p.aspects.ภาพรวม }));
  if (withOverall.length >= 2) {
    const best = [...withOverall].sort((a, b) => b.overall - a.overall)[0];
    tips.push(`ส่วนที่ภาพรวมแข็งแรงสุดในข่ายคือ ${best.p.icon} ${best.p.label} (${best.overall}/10) — ใช้เป็นหลักยึดของเรื่องสำคัญ`);
  }
  const neutral = coherence.filter((c) => c.tone === "neutral");
  if (neutral.length && cautions.length === 0) {
    tips.push("ไม่มีด้านใดฉุดข่ายลงชัดเจน — จุดที่คะแนนกลางๆ พัฒนาได้ด้วยการเลือกใช้ส่วนที่เด่นด้านนั้นให้บ่อยขึ้น");
  }

  // --- จังหวะเริ่มต้น (กาลโยคย้อนหลัง) — ดีเข้าจุดแข็ง · ร้ายเข้าระวังแบบเฟรมนุ่ม+ทางแก้ ---
  let hasOmen = false;
  for (const p of parts) {
    if (!p.omen) continue;
    hasOmen = true;
    if (p.omen.tone === "good") {
      strengths.push(`🏁 ${p.icon} ${p.label} เริ่มต้นวัน${p.omen.good.join("/")} — ฤกษ์เริ่มต้นหนุนตามกาลโยค`);
    } else if (p.omen.tone === "bad") {
      cautions.push(`🏁 ${p.icon} ${p.label} เริ่มต้นตรงวัน${p.omen.bad.join("/")}ของปีนั้น — ${p.omen.note}`);
    }
  }

  const caveats = [NUMBER_ASPECTS_CAVEAT, HOLISTIC_CAVEAT];
  if (hasOmen) caveats.push(START_OMEN_CAVEAT);
  return { strengths, cautions, tips, caveats };
}
