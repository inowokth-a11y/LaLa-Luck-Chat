/**
 * ตามหาแมวหาย — วางแผนลำดับการค้น (เฟส 1 · 8 ก.ย. 2569 ผู้ใช้เคาะ "เริ่มตามความเหมาะสม")
 *
 * 🔴 หลักคิด: ไม่มีศาสตร์ใดทายตำแหน่งแมวหายได้จริง — สิ่งที่คำนวณได้คือ "ลำดับการค้นที่คุ้มค่าที่สุด"
 * ผลลัพธ์เป็นแผนค้นเรียงลำดับ ไม่ใช่คำทำนายตำแหน่ง · ห้ามบอกให้เลิกค้นทิศใด (ทุกช่องมีน้ำหนัก > 0)
 *
 * 3 ชั้น (ประกาศชั้นหลักฐานทุกจุด):
 * - ชั้น B สถิติจริง (กำหนด "ระยะ"): Huang et al. 2018, Animals 8(1):5, n=1,210 — verify กับฉบับเต็ม
 *   (PMC5789300) 8 ก.ย. 2569: แมวในบ้านล้วนพบมัธยฐาน 39 ม. (75% ใน 137 ม.) · ออกนอกบ้านได้ 300 ม.
 *   (75% ใน 1,609 ม.) · นอกบ้านล้วน 183 ม. · พบมีชีวิต 34%/50%/61% ใน 7/30/365 วัน · 83% พบนอกอาคาร
 *   (สวนบ้านคนอื่น 20% · รอหน้าบ้านตัวเอง 19% · ใต้พุ่มไม้ 16% · ใต้บ้าน/ระเบียง 10%) · ค้นเองละเอียด +
 *   ค้นกลางคืนด้วยไฟฉายเป็นวิธีที่ช่วยที่สุด · แมวขี้สงสัยพบในบ้านเพื่อนบ้าน 17% vs 6%
 *   ⚠ น้ำหนักวงระยะด้านล่างเป็น "การแปลงการกระจายจากสถิติ" (ออกแบบเอง ประกาศใน caveat)
 * - ชั้น U ภูมิประเทศจากผู้ใช้ (กำหนด "ทิศ"): ทางที่แมวออก · ที่กำบัง · ถนน/เสียง/หมา · เคยเห็นแมวไป ·
 *   ทิศบ้านเก่า — เหตุผลเชิงพฤติกรรม ไม่ใช่โหราศาสตร์
 * - ชั้น T ธาตุแมว → ทิศธาตุ (DIRECTION_TO_ELEMENT กลับด้าน): ⚠ ออกแบบเสริมเอง น้ำหนักต่ำ เป็น "ภาษาตำรา"
 *   ของอาจารย์ลาลา + ทิศแนะนำวางทรายแมว/เสื้อเจ้าของล่อกลับ — ห้ามชนะชั้น U
 * - ฤกษ์ออกค้น: ยามดีอุบากอง (engine เดิม) ∩ ช่วงแมวเคลื่อนไหวจริง (โพล้เพล้/กลางคืน)
 *
 * - มุมตำรา 梅花易数 (9 ก.ย. 2569 — รอบ implement หลังวิจัย): ตั้งกัวจาก "วัน-เวลาที่หาย" → ทิศ/ลักษณะที่/
 *   ลางการได้คืน (`meihua.ts`) — **แสดงคู่แผน ไม่เข้าสูตรคะแนน (น้ำหนัก 0)** จนกว่า calibration จะพิสูจน์ ·
 *   ไม่รู้เวลาหาย = ชั้นนี้ปิดตัวเอง ไม่เดายาม
 * ❌ ยังไม่รวม: ยามสามตา (ผลเป็นแกน + คำทำนายชี้ขาด — รอบวิจัย 8 ก.ย. 2569 สรุป "ไม่แนะนำเป็นชั้นคะแนน")
 */

import { DIRECTION_TO_ELEMENT, ELEMENT_TO_COLORS } from "./fengshui";
import { THAI_LABEL_5, type Element5 } from "./element";
import { bestTimeToday } from "./auspicious";
import { catElementFromCoat } from "./cat-tamra";
import { meihuaLostReading, MEIHUA_CAVEAT, type MeihuaReading } from "./meihua";

export const DIRS8 = [
  "เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้",
  "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ",
] as const;
export type Dir8 = (typeof DIRS8)[number];

export const RINGS = [
  { key: "r0", labelTh: "0-50 ม. (รอบบ้านทันที)" },
  { key: "r1", labelTh: "50-150 ม. (บ้านติดกัน/ซอยเดียวกัน)" },
  { key: "r2", labelTh: "150-500 ม. (ละแวก/ซอยข้างเคียง)" },
  { key: "r3", labelTh: "เกิน 500 ม." },
] as const;
export type RingKey = (typeof RINGS)[number]["key"];

export const CAT_TYPES = {
  indoor: { th: "แมวเลี้ยงในบ้านล้วน (ไม่เคยออกไปข้างนอกเอง)" },
  outdoor_access: { th: "แมวออกนอกบ้านได้เป็นประจำ" },
  outdoor_only: { th: "แมวอยู่นอกบ้านเป็นหลัก" },
} as const;
export type CatType = keyof typeof CAT_TYPES;

export const TEMPERAMENTS = {
  timid: { th: "ขี้กลัว/ขี้อาย ชอบซ่อน" },
  curious: { th: "กล้า อยากรู้อยากเห็น ชอบไปบ้านคนอื่น" },
  unknown: { th: "ไม่แน่ใจ/กลางๆ" },
} as const;
export type Temperament = keyof typeof TEMPERAMENTS;

export interface LostCatInput {
  catType: string;
  temperament?: string | null;
  daysMissing: number;
  /** ทางที่แมวออกไป (ประตู/หน้าต่าง/รูรั้ว) */
  exitDir?: string | null;
  /** ทิศที่มีที่กำบัง (พุ่มไม้ รกร้าง ใต้ถุน โรงรถ กองของ) */
  coverDirs?: readonly string[] | null;
  /** ทิศที่มีถนนใหญ่/เสียงดัง/หมา */
  noiseDirs?: readonly string[] | null;
  /** ทิศที่เคยเห็นแมวไป / มีแมวจร / มีคนให้อาหารแมว */
  seenDirs?: readonly string[] | null;
  /** ทิศบ้านเก่า (ถ้าเพิ่งย้ายบ้าน) */
  oldHomeDir?: string | null;
  /** สีขนแมว (key ของ CAT_COATS) — ชั้นธาตุน้ำหนักต่ำ */
  coat?: string | null;
  /** วันไทยของวันนี้ (ฤกษ์ออกค้น) — ไม่ส่ง = ไม่แสดงยาม */
  todayDayTh?: string | null;
  /** วันที่แมวหาย "YYYY-MM-DD" (มุมตำรา 梅花易数 — ต้องมีคู่กับ lostTime) */
  lostDate?: string | null;
  /** เวลาที่แมวหาย "HH:MM" (เวลาไทย) — ไม่รู้ = ไม่แสดงมุมตำรา */
  lostTime?: string | null;
}

const isDir = (d: unknown): d is Dir8 => typeof d === "string" && (DIRS8 as readonly string[]).includes(d);
const dirList = (xs?: readonly string[] | null): Dir8[] => (xs ?? []).filter(isDir);

// ---------------------------------------------------------------------------
// ชั้น B — วงระยะจากสถิติ (⚠ การแปลงการกระจาย ไม่ใช่ตัวเลขดิบ — ประกาศใน caveat)
// ---------------------------------------------------------------------------

const RING_BASE: Record<CatType, [number, number, number, number]> = {
  // มัธยฐาน 39 ม. · 75% ≤ 137 ม. → วงใกล้หนักสุด
  indoor: [0.55, 0.25, 0.15, 0.05],
  // มัธยฐาน 183 ม.
  outdoor_only: [0.2, 0.3, 0.35, 0.15],
  // มัธยฐาน 300 ม. · 75% ≤ 1,609 ม.
  outdoor_access: [0.15, 0.25, 0.35, 0.25],
};

export function ringWeights(catType: CatType, temperament: Temperament, daysMissing: number): number[] {
  const w = [...RING_BASE[catType]];
  // ขี้กลัว → ซ่อนใกล้ที่สุด นิ่งหลายวัน (ย้ายน้ำหนักจากวงไกลเข้าวงใกล้)
  if (temperament === "timid") {
    const shift = 0.1;
    w[0] += shift; w[2] -= shift * 0.5; w[3] -= shift * 0.5;
  }
  // ขี้สงสัย → บ้านเพื่อนบ้าน (วง 50-150) เพิ่มเล็กน้อย
  if (temperament === "curious") { w[1] += 0.05; w[0] -= 0.05; }
  // หายนานเกิน 7 วัน → วงกว้างขึ้นเล็กน้อย
  if (daysMissing > 7) { w[0] -= 0.05; w[2] += 0.03; w[3] += 0.02; }
  const floor = 0.03;
  const fixed = w.map((x) => Math.max(x, floor));
  const sum = fixed.reduce((a, b) => a + b, 0);
  return fixed.map((x) => x / sum);
}

// ---------------------------------------------------------------------------
// ชั้น U + T — ทิศ
// ---------------------------------------------------------------------------

export interface DirScore {
  dir: Dir8;
  weight: number;
  reasonsTh: string[];
}

export const ELEMENT_DIR_NOTE =
  "ทิศธาตุของแมว (จากสีขน) เป็นชั้นเสริมที่ระบบออกแบบเอง ไม่ใช่ตำราแมวหาย — ให้น้ำหนักต่ำ " +
  "ใช้เป็นภาษาเล่าเรื่องและทิศแนะนำวางของล่อกลับเท่านั้น";

export function directionScores(input: LostCatInput): { scores: DirScore[]; catElement: Element5 | null } {
  const base: Record<Dir8, { w: number; r: string[] }> = Object.fromEntries(
    DIRS8.map((d) => [d, { w: 1, r: [] as string[] }])
  ) as Record<Dir8, { w: number; r: string[] }>;

  const exit = isDir(input.exitDir) ? input.exitDir : null;
  if (exit) { base[exit].w += 3; base[exit].r.push("ทางที่แมวออกไป (จุดเริ่มต้นที่แน่นอนที่สุด)"); }
  for (const d of dirList(input.coverDirs)) { base[d].w += 1.5; base[d].r.push("มีที่กำบังให้ซ่อน (สถิติ: ใต้พุ่มไม้ 16% · ใต้บ้าน/ระเบียง 10%)"); }
  for (const d of dirList(input.seenDirs)) { base[d].w += 1.5; base[d].r.push("เคยเห็นแมวไป/มีแมวจร/มีคนให้อาหาร"); }
  for (const d of dirList(input.noiseDirs)) { base[d].w -= 1; base[d].r.push("ถนน/เสียงดัง/หมา — แมวมักเลี่ยง (ลดน้ำหนัก ไม่ตัดทิ้ง)"); }
  const oldHome = isDir(input.oldHomeDir) ? input.oldHomeDir : null;
  if (oldHome) { base[oldHome].w += 1; base[oldHome].r.push("ทิศบ้านเก่า — แมวที่เพิ่งย้ายมีโอกาสมุ่งกลับ (วงไกล)"); }

  // ชั้น T — ธาตุแมว → ทิศธาตุ (น้ำหนักต่ำ ⚠ ออกแบบเสริม)
  const el = input.coat ? catElementFromCoat(input.coat)?.element ?? null : null;
  if (el) {
    for (const d of DIRS8) {
      if (DIRECTION_TO_ELEMENT[d] === el) { base[d].w += 0.5; base[d].r.push(`ทิศธาตุ${THAI_LABEL_5[el]}ตามสีขนแมว (ชั้นเสริม น้ำหนักต่ำ)`); }
    }
  }

  const floor = 0.2;
  const raw = DIRS8.map((d) => Math.max(base[d].w, floor));
  const sum = raw.reduce((a, b) => a + b, 0);
  const scores = DIRS8.map((d, i) => ({ dir: d, weight: raw[i] / sum, reasonsTh: base[d].r }))
    .sort((a, b) => b.weight - a.weight);
  return { scores, catElement: el };
}

// ---------------------------------------------------------------------------
// รวมเป็นแผนค้น
// ---------------------------------------------------------------------------

export interface SearchCell {
  dir: Dir8;
  ring: RingKey;
  ringTh: string;
  score: number;
  whyTh: string[];
  placesTh: string[];
}

export interface LostCatPlan {
  cells: SearchCell[];
  topDirs: DirScore[];
  ringWeights: { key: RingKey; labelTh: string; weight: number }[];
  windows: { labelTh: string; timeTh: string; sourceTh: string }[];
  ubakong: { time_range: string; yam_name: string; meaning: string } | null;
  lureTh: string | null;
  hopeTh: string;
  checklistTh: string[];
  caveats: string[];
  /** มุมตำรา 梅花易数 — null เมื่อไม่มีวัน-เวลาที่หาย · ไม่กระทบ cells/topDirs */
  meihua: MeihuaReading | null;
  /** ทิศตำราตรงกับทิศอันดับต้นของแผนสถิติ/ภูมิประเทศไหม (ข้อมูลประกอบ ไม่ใช่การเฉลี่ย) */
  meihuaAgreesTop3: boolean | null;
}

export const LOST_CAT_CAVEAT =
  "นี่คือ 'ลำดับการค้น' ที่คุ้มค่าที่สุดจากสถิติ+ภูมิประเทศ ไม่ใช่การยืนยันตำแหน่งแมว — โปรดค้นทุกทิศ " +
  "และทำตามรายการปฏิบัติควบคู่ · ไม่มีศาสตร์ใดระบุที่อยู่แมวได้แน่นอน";

export const LOST_CAT_STATS_NOTE =
  "สถิติจากงานวิจัยแมวหาย 1,210 ตัวในต่างประเทศ (Huang et al. 2018) — ยังไม่มีข้อมูลบริบทไทย " +
  "ระบบจึงขอให้กด 'เจอแล้ว' บอกทิศ/ระยะ เพื่อปรับน้ำหนักจากของจริง · น้ำหนักวงระยะเป็นการแปลงจาก" +
  "การกระจายในงานวิจัย (ออกแบบเอง)";

const PLACES_BY_RING: Record<RingKey, string[]> = {
  r0: ["ใต้บ้าน/ใต้ระเบียง/ใต้ถุน (10%)", "ใต้พุ่มไม้-กอง ของหน้าบ้าน (16%)", "รอบตัวบ้านเงียบๆ — แมวหลายตัวกลับมารอหน้าบ้านเอง (19%)"],
  r1: ["สวนบ้านคนอื่นที่ติดกัน (20%)", "โรงรถ/ใต้รถ/กองของบ้านข้างเคียง", "ในบ้านเพื่อนบ้าน (แมวขี้สงสัยพบตรงนี้ 17%)"],
  r2: ["ที่รกร้าง/พุ่มไม้ในละแวก", "ซอยข้างเคียงที่มีแมวจรหรือคนให้อาหาร", "ใต้ถุนอาคาร/โรงจอดรถส่วนกลาง"],
  r3: ["เส้นทางไปบ้านเก่า (ถ้าเพิ่งย้าย)", "ประกาศ/กลุ่มหมู่บ้าน/กล้องวงจรปิด — ค้นด้วยเครือข่ายแทนเดินเอง"],
};

const CHECKLIST: string[] = [
  "เดินค้นเองอย่างละเอียดรอบบ้านก่อน — ก้มดูใต้บ้าน ใต้ระเบียง ใต้รถ กองของ (สถิติ: ค้นเองได้ผลที่สุด)",
  "ค้นช่วงกลางคืนเงียบๆ พร้อมไฟฉาย (ตาแมวสะท้อนแสง) — ผู้ตอบแบบสำรวจยกว่าเป็นวิธีที่ช่วยที่สุด",
  "ขอเพื่อนบ้านค้น 'ในบ้านของเขา' โรงรถ ใต้ถุน — แมวขี้สงสัยไปติดในบ้านคนอื่นบ่อย",
  "วางทรายแมวที่ใช้แล้ว/เสื้อที่มีกลิ่นเจ้าของ ไว้หน้าบ้านและทิศที่แนะนำ (กลิ่นนำทางกลับ)",
  "อย่าเรียกชื่อเสียงดังไล่ตาม — แมวตกใจจะซ่อนลึกขึ้น ให้นั่งนิ่ง เรียกเบาๆ เขย่าถุงขนม",
  "ประกาศพร้อมรูปในกลุ่มหมู่บ้าน/โซเชียล + ขอดูกล้องวงจรปิดเพื่อนบ้าน (ยืนยันทิศจริง)",
  "ค้นซ้ำทุกวันในจุดเดิม — แมวที่ซ่อนจะขยับเมื่อหิว (สถิติ: 34% พบใน 7 วัน · 50% ใน 30 วัน)",
];

const ACTIVITY_WINDOWS: [number, number, string][] = [
  [5, 7, "โพล้เพล้เช้า 05:00-07:00 — แมวออกหากิน/ขยับจากที่ซ่อน"],
  [18, 22, "หัวค่ำ 18:00-22:00 — ช่วงแมวเคลื่อนไหวมากที่สุด (ค้นพร้อมไฟฉาย)"],
  [23, 26, "ดึกสงัด 23:00-02:00 — เงียบ ได้ยินเสียงร้องตอบ"],
];

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h + (m || 0) / 60;
}

/** วางแผนค้นแมวหาย — pure ฿0 */
export function lostCatPlan(input: LostCatInput): LostCatPlan {
  const catType = (input.catType in CAT_TYPES ? input.catType : "indoor") as CatType;
  const temperament = (input.temperament && input.temperament in TEMPERAMENTS ? input.temperament : "unknown") as Temperament;
  const days = Number.isFinite(input.daysMissing) ? Math.max(0, Math.floor(input.daysMissing)) : 0;

  const rw = ringWeights(catType, temperament, days);
  const { scores, catElement } = directionScores(input);
  const oldHome = isDir(input.oldHomeDir) ? input.oldHomeDir : null;

  const cells: SearchCell[] = [];
  for (const ds of scores) {
    RINGS.forEach((ring, i) => {
      let s = ds.weight * rw[i];
      // ทิศบ้านเก่า: ดันวงไกลเป็นพิเศษ (สถิติ: บ้านใหม่ → มุ่งกลับบ้านเก่า)
      if (oldHome && ds.dir === oldHome && i >= 2) s *= 1.5;
      cells.push({
        dir: ds.dir,
        ring: ring.key,
        ringTh: ring.labelTh,
        score: s,
        whyTh: [
          ...ds.reasonsTh,
          `วงระยะนี้มีน้ำหนัก ${(rw[i] * 100).toFixed(0)}% สำหรับ${CAT_TYPES[catType].th.split(" (")[0]}${temperament === "timid" ? " ที่ขี้กลัว (ซ่อนใกล้)" : ""}`,
        ],
        placesTh: PLACES_BY_RING[ring.key],
      });
    });
  }
  const total = cells.reduce((a, c) => a + c.score, 0);
  for (const c of cells) c.score = c.score / total;
  cells.sort((a, b) => b.score - a.score);

  // ฤกษ์ออกค้น
  let ub: LostCatPlan["ubakong"] = null;
  const windows: LostCatPlan["windows"] = ACTIVITY_WINDOWS.map(([, , label]) => ({
    labelTh: label.split(" — ")[0],
    timeTh: label,
    sourceTh: "พฤติกรรมแมว (งานวิจัย/ผู้เชี่ยวชาญตามหาสัตว์เลี้ยง)",
  }));
  if (input.todayDayTh) {
    try {
      const b = bestTimeToday(input.todayDayTh).best;
      ub = { time_range: b.time_range, yam_name: b.yam_name, meaning: b.meaning };
      const [s, e] = b.time_range.split("-").map(parseHHMM);
      const overlaps = ACTIVITY_WINDOWS.some(([ws, we]) => s < we && e > ws);
      windows.push({
        labelTh: `ยามดีอุบากอง (${b.yam_name})`,
        timeTh: `${b.time_range} — ${b.meaning}${overlaps ? " · ทับซ้อนช่วงแมวเคลื่อนไหวพอดี" : " · เป็นยามกลางวัน ค้นตามที่กำบัง"}`,
        sourceTh: "ตำรายามอุบากอง (ชั้นตำรา — จังหวะออกค้น)",
      });
    } catch {
      ub = null;
    }
  }

  const lureTh = catElement
    ? `ภาษาตำรา: แมวธาตุ${THAI_LABEL_5[catElement]} — วางทรายแมว/เสื้อเจ้าของไว้ทางทิศ${DIRS8.filter((d) => DIRECTION_TO_ELEMENT[d] === catElement).join("/")} และใช้ผ้าโทน${ELEMENT_TO_COLORS[catElement].slice(0, 2).join("/")}รองของล่อ (ชั้นเสริม ไม่ใช่ตำแหน่งแมว)`
    : null;

  const hopeTh =
    catType === "indoor"
      ? `แมวเลี้ยงในบ้านที่หายไม่เกิน 7 วัน ส่วนใหญ่ยังอยู่ในรัศมี ~140 ม. และมักซ่อนนิ่ง — สถิติ: พบมีชีวิต 34% ใน 7 วัน · 50% ใน 30 วัน · 19% กลับมารอหน้าบ้านเอง${days > 7 ? " · หายนานแล้วยังมีโอกาส (61% ภายใน 1 ปี) — ค้นซ้ำจุดเดิม + ขยายเครือข่าย" : ""}`
      : `แมวที่ออกนอกบ้านได้ไปไกลกว่า (มัธยฐาน ~300 ม.) แต่ 75% ยังพบภายใน 500 ม. — สถิติ: พบมีชีวิต 34% ใน 7 วัน · 50% ใน 30 วัน · 19% กลับมารอหน้าบ้านเอง`;

  // มุมตำรา 梅花易数 — คำนวณเมื่อมีวัน+เวลาที่หายเท่านั้น · พังไม่ล้มแผน · ไม่แตะ cells
  let meihua: MeihuaReading | null = null;
  if (input.lostDate && input.lostTime) {
    try {
      meihua = meihuaLostReading(input.lostDate, input.lostTime);
    } catch {
      meihua = null;
    }
  }
  const topDirs = scores.slice(0, 3);
  const meihuaAgreesTop3 = meihua ? topDirs.some((d) => d.dir === meihua!.dirTh) : null;

  return {
    cells,
    topDirs,
    ringWeights: RINGS.map((r, i) => ({ key: r.key, labelTh: r.labelTh, weight: rw[i] })),
    windows,
    ubakong: ub,
    lureTh,
    hopeTh,
    checklistTh: CHECKLIST,
    caveats: [LOST_CAT_CAVEAT, LOST_CAT_STATS_NOTE, ...(catElement ? [ELEMENT_DIR_NOTE] : []), ...(meihua ? [MEIHUA_CAVEAT] : [])],
    meihua,
    meihuaAgreesTop3,
  };
}
