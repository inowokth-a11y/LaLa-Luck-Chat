// คะแนนเลข 5 ด้าน (0-10) — การเงิน/ความรัก/สุขภาพ/โชค/อำนาจ (ผู้ใช้สั่ง 3 ส.ค. 2569:
// คำตอบเรื่องทะเบียน/บ้านเลขที่สั้นเกินไป อยากได้คะแนนรายด้าน + คำแนะนำ)
//
// ⚠️ เป็น "สูตรเสริมที่ออกแบบเอง" (ไม่มีในตำราต้นทาง — แบบเดียวกับสูตรเบอร์โทร §5 และคะแนนรวม
//    compatibility) ประกอบจาก 3 ชั้นที่ deterministic ทั้งหมด ไม่มี AI แต่งตัวเลข (§16):
//    1. อุปนิสัยรายหลัก 0-9 ตามความหมายเลขศาสตร์กระแสหลัก (ตาราง DIGIT_ASPECTS ข้างล่าง)
//    2. เลขท้ายคู่ถ่วงน้ำหนักเพิ่ม (ธรรมเนียมเลขศาสตร์ไทยถือว่าท้ายสุดแรงสุด)
//    3. ธาตุของเลข (ตาราง §5.4 ผ่าน golden test) เทียบธาตุผู้ใช้ด้วย wuXingScore (ผ่าน golden test)
//    → ต้องแสดง NUMBER_ASPECTS_CAVEAT ทุกครั้งที่ถึงผู้ใช้
//
// ห้ามคำคลินิก/คำฟันธง — "สุขภาพกายใจ" ในที่นี้คือมิติพลังงานตามความเชื่อ ไม่ใช่คำวินิจฉัย

import { artifactElement, lookup2digit } from "./numerology";
import { namePower } from "./card-id";
import { wuXingScore, THAI_LABEL_5, type Element5 } from "./element";

export const ASPECT_KEYS = ["finance", "love", "health", "luck", "power"] as const;
export type AspectKey = (typeof ASPECT_KEYS)[number];

export const ASPECT_LABEL_TH: Record<AspectKey, string> = {
  finance: "การเงิน",
  love: "ความรักและความสัมพันธ์",
  health: "สุขภาพกายและใจ",
  luck: "โชคและเสริมดวง",
  power: "อำนาจบารมี",
};

export const NUMBER_ASPECTS_CAVEAT =
  "คะแนนรายด้านเป็นสูตรเสริมที่ประกอบจากความหมายเลขและความสัมพันธ์ของธาตุ " +
  "ใช้เป็นแนวทางประกอบการพิจารณา ไม่ใช่คำตัดสิน และไม่ใช่คำแนะนำทางการแพทย์หรือการเงิน";

/**
 * อุปนิสัยรายหลัก [การเงิน, ความรัก, สุขภาพ, โชค, อำนาจ] — อิงความหมายเลขศาสตร์กระแสหลัก:
 * 1 ผู้นำ/อำนาจ · 2 เสน่ห์/อ่อนโยน · 3 นักสู้/เด็ดเดี่ยว · 4 เจรจา/ค้าขาย · 5 ปัญญา/มั่นคง ·
 * 6 การเงิน/ศิลปะ/เสน่ห์ · 7 อดทน/อุปสรรค · 8 ทรัพย์/อิทธิพล · 9 คุ้มครอง/โชค · 0 ความว่าง
 */
const DIGIT_ASPECTS: Record<number, [number, number, number, number, number]> = {
  0: [0, 0, 0, 0, 0],
  1: [0, -0.5, 0, 0.5, 1],
  2: [0, 1, 0.5, 0, -0.5],
  3: [0, -0.5, -0.5, 0, 1],
  4: [1, 0, 0, 0.5, 0],
  5: [0.5, 0, 0.5, 0.5, 0.5],
  6: [1, 1, 0, 0.5, 0],
  7: [-0.5, 0, -1, -0.5, 0.5],
  8: [1, -0.5, 0, 0.5, 1],
  9: [0.5, 0.5, 1, 1, 0.5],
};

/** คำอธิบายเมื่อด้านนั้นเด่น (≥7) / ควรระวัง (≤3.5) — เทมเพลต ฿0 ห้าม AI แต่งเพิ่มเอง */
const ASPECT_NOTES: Record<AspectKey, { strong: string; weak: string }> = {
  finance: {
    strong: "เด่นด้านการเงินการค้า เกื้อหนุนเรื่องรายได้และการเจรจาต่อรอง",
    weak: "ไม่เด่นด้านการเงิน — ควรมีวินัยการใช้จ่ายเป็นพิเศษ หรือเสริมด้วยเลข/สีประจำธาตุที่เกื้อหนุน",
  },
  love: {
    strong: "ส่งเสริมเสน่ห์และความสัมพันธ์ ราบรื่นเรื่องคนรอบตัว",
    weak: "พลังด้านความสัมพันธ์เบา — ควรใส่ใจการสื่อสารกับคนใกล้ตัวมากขึ้น",
  },
  health: {
    strong: "พลังงานด้านความแข็งแรงและจิตใจมั่นคงดี",
    weak: "พลังด้านนี้เบา — หมั่นพักผ่อนและดูแลสมดุลชีวิตให้สม่ำเสมอ",
  },
  luck: {
    strong: "มีแรงหนุนด้านโชคและจังหวะชีวิต เหมาะกับการเริ่มสิ่งใหม่",
    weak: "แรงหนุนด้านโชคน้อย — อาศัยความรอบคอบและการวางแผนมากกว่าการเสี่ยง",
  },
  power: {
    strong: "เสริมบารมีและความน่าเชื่อถือ เหมาะกับบทบาทผู้นำ",
    weak: "พลังด้านบารมีเบา — สร้างความน่าเชื่อถือผ่านผลงานสม่ำเสมอจะมั่นคงกว่า",
  },
};

const clamp10 = (n: number) => Math.max(0, Math.min(10, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface NumberAspectsResult {
  เลข: string;
  ธาตุของเลข: string;
  /** ผลรวมทุกหลัก → การ์ดความหมายจากตาราง 00-99 (สไตล์คำทำนายเดิมของผู้ใช้ — 6 ส.ค. 2569) */
  ผลรวมเลข: number;
  การ์ดผลรวม: string | null;
  /** ตัวอักษรบนป้าย (ถ้ามี เช่น "จง") — พลังอักษรจากหลักกลุ่มอักษร + การ์ดรวมทั้งป้าย */
  อักษรบนป้าย?: string;
  พลังอักษร?: number;
  การ์ดรวมทั้งป้าย?: string | null;
  ความหมายเลขท้าย: string | null;
  คะแนน: Record<string, number>; // key = ป้ายไทย 5 ด้าน
  ภาพรวม: number;
  จุดเด่น: string[];
  ข้อควรระวัง: string[];
  ความเข้ากับธาตุคุณ: string | null;
}

/**
 * คะแนนเลข 5 ด้าน (0-10) — deterministic ล้วน
 * @param num เลขที่ถาม (เอาเฉพาะหลักตัวเลข เช่น ทะเบียน "จง 6266" ส่ง 6266 มา)
 * @param userDominant/userMissing ธาตุผู้ใช้ (มี = คิดความเข้ากันของธาตุด้วย · ไม่มี = คะแนนจากตัวเลขล้วน)
 */
export function numberAspects(
  num: number | string, // string = คงเลข 0 นำหน้าได้ (เบอร์โทร 08x — Number() จะตัด 0 ทิ้ง)
  userDominant?: Element5,
  userMissing: Element5[] = [],
  /** ตัวอักษรบนป้ายทะเบียน (เช่น "จง") — คิดพลังอักษรด้วยหลักกลุ่มอักษรเดียวกับ NamePower */
  plateLetters?: string
): NumberAspectsResult {
  const digitsStr =
    typeof num === "string" ? num.replace(/\D/g, "") : String(Math.abs(Math.round(num)));
  const digits = digitsStr.split("").map(Number);

  // ชั้น 1: ค่าเฉลี่ยอุปนิสัยรายหลัก (×3 → สวิง ±3 รอบฐาน 5)
  // ชั้น 2: เลขท้ายคู่ถ่วงน้ำหนักเพิ่มอีกครึ่งแรง (ท้ายสุดแรงสุดตามธรรมเนียม)
  const scores: number[] = ASPECT_KEYS.map((_, i) => {
    const avg = digits.reduce((s, d) => s + DIGIT_ASPECTS[d][i], 0) / digits.length;
    const tail = digits.slice(-2);
    const tailAvg = tail.reduce((s, d) => s + DIGIT_ASPECTS[d][i], 0) / tail.length;
    return 5 + avg * 3 + tailAvg * 1.5;
  });

  // ชั้น 3: ธาตุของเลขเทียบธาตุผู้ใช้ — ยก/กดทั้งภาพ (−1.5 ถึง +1.5)
  const elRaw = artifactElement(Number(digitsStr)); // 0 นำหน้าไม่กระทบธาตุ (คิดจากผลรวมหลัก)
  const el = (["Fire", "Earth", "Metal", "Water", "Wood"].includes(elRaw) ? elRaw : null) as Element5 | null;
  let elementNote: string | null = null;
  if (el && userDominant) {
    const rel = wuXingScore(userDominant, el, userMissing);
    for (let i = 0; i < scores.length; i++) scores[i] += rel.final_score * 0.75;
    elementNote = `ธาตุของเลขคือ${THAI_LABEL_5[el]} ${rel.relation_th ?? ""} (${rel.final_score > 0 ? "+" : ""}${rel.final_score})`.trim();
  }

  const cleaned = scores.map((s) => round1(clamp10(s)));
  const overall = round1(cleaned.reduce((a, b) => a + b, 0) / cleaned.length);

  const strengths: string[] = [];
  const cautions: string[] = [];
  ASPECT_KEYS.forEach((k, i) => {
    if (cleaned[i] >= 7) strengths.push(`${ASPECT_LABEL_TH[k]} (${cleaned[i]}): ${ASPECT_NOTES[k].strong}`);
    else if (cleaned[i] <= 3.5) cautions.push(`${ASPECT_LABEL_TH[k]} (${cleaned[i]}): ${ASPECT_NOTES[k].weak}`);
  });

  const last2 = digits.length >= 2 ? Number(digitsStr.slice(-2)) : Number(digitsStr);
  const meaning = lookup2digit(last2);

  // การ์ดจากผลรวมทุกหลัก (สูงสุด 10 หลัก×9 = 90 อยู่ในตาราง 00-99 เสมอ)
  const sumAll = digits.reduce((a, b) => a + b, 0);
  const sumCard = lookup2digit(sumAll);
  // พลังอักษรบนป้าย (จง = จ6+ง2 = 8) → การ์ดรวมทั้งป้าย (อักษร+ผลรวมเลข)
  const letters = (plateLetters ?? "").trim();
  const letterPower = letters ? namePower(letters) : 0;
  const totalCard = letters && letterPower > 0 ? lookup2digit(Math.min(letterPower + sumAll, 99)) : null;

  const คะแนน: Record<string, number> = {};
  ASPECT_KEYS.forEach((k, i) => (คะแนน[ASPECT_LABEL_TH[k]] = cleaned[i]));

  return {
    เลข: digitsStr,
    ธาตุของเลข: el ? THAI_LABEL_5[el] : elRaw,
    ผลรวมเลข: sumAll,
    การ์ดผลรวม: sumCard.found ? `${sumCard.energy_name} — ${sumCard.essence}` : null,
    ...(letters && letterPower > 0
      ? {
          อักษรบนป้าย: letters,
          พลังอักษร: letterPower,
          การ์ดรวมทั้งป้าย: totalCard?.found ? `${totalCard.energy_name} — ${totalCard.essence}` : null,
        }
      : {}),
    ความหมายเลขท้าย: meaning.found ? `${meaning.energy_name} — ${meaning.essence}` : null,
    คะแนน,
    ภาพรวม: overall,
    จุดเด่น: strengths,
    ข้อควรระวัง: cautions,
    ความเข้ากับธาตุคุณ: elementNote,
  };
}
