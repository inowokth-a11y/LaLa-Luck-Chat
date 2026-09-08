/**
 * 梅花易数 (เมยฮวาอี้ซู่) — ตั้งกัวจาก "เวลา" แล้วอ่านทิศ/สถานที่/ลางของหาย (失物占)
 * รอบ implement 9 ก.ย. 2569 (ผู้ใช้เคาะ "เริ่ม") ต่อจากรอบวิจัย 8 ก.ย. 2569 —
 * ทุกกฎ verify กับต้นฉบับ 梅花易數 卷一/卷二 (wikisource) ดู docs/วิจัย_แมวหาย_เมยฮวาอี้ซู่_ยามสามตา_ก.ย.2569.md
 *
 * สูตรตั้งกัว (卷一 年月日時起卦 คำต่อคำ):
 *   ปี = เลข地支 (子1…亥12) · เดือน = เดือนจันทรคติจีน · วัน = วันจันทรคติ (初一=1) · ชั่วโมง = 时辰 (子1…亥12)
 *   กัวบน = (ปี+เดือน+วัน) mod 8 · กัวล่าง = (ปี+เดือน+วัน+ชม.) mod 8 · เส้นเคลื่อน = รวมทั้งสี่ mod 6 (เศษ 0 → 8/6)
 *   ลำดับ 1-8 = 乾 兌 離 震 巽 坎 艮 坤 · กัวที่มีเส้นเคลื่อน = 用 (ของหาย) อีกกัว = 體 (ผู้ถาม)
 *   變卦 = พลิกเส้นเคลื่อน · 「以變卦為失物之所在」 ทิศ/สถานที่อ่านจากกัวที่แปรแล้วของฝั่ง 用
 *
 * 🔴 กติกาที่ล็อก (ชั้นเสริมของโมดูลแมวหาย):
 * - เป็น "มุมตำรา" คู่กับแผนสถิติ **ไม่เข้าสูตรคะแนนจัดลำดับ** (น้ำหนัก 0 ในเฟสนี้ — calibration loop
 *   จะวัดว่าทิศตำราถูกบ่อยกว่าสุ่มไหมก่อนให้น้ำหนัก) · ห้ามเฉลี่ยรวมกับชั้นสถิติ (กติกา §4 ข้อ 5)
 * - ผล 用克體 ต้นฉบับว่า 不可尋 (หาไม่ได้) → **ห้ามพูด** แปลงเป็น "ค้นยากขึ้น ขยายวง/ใช้เครือข่าย" เท่านั้น
 *   (กติกาแมวหาย: ห้ามฟันธง ห้ามบอกเลิกค้น — เทสต์ regex ล็อกทุก string)
 * - ธรรมเนียมที่เลือก (สำนักต่างกัน — ประกาศใน MEIHUA_CAVEAT): เลขปีตาม **ลี่ชุน** (ตรงธาตุปีของระบบ) ·
 *   ยาม 子 ไม่ข้ามวัน (23:00-23:59 นับวันปฏิทินเดิม — สอดคล้อง "ก่อนรุ่งเช้านับตามวันปฏิทิน" ของทักษา) ·
 *   เดือนอธิกมาสใช้เลขเดือนที่มันซ้ำ · วันจันทรคติจากวันปฏิทินไทยของผู้ใช้
 */

import { chineseLunarDate, yearBranchIndex, EARTHLY_BRANCHES, BRANCH_ANIMAL_TH } from "./chinese-lunar";
import { lichunDayOfFebruary, THAI_LABEL_5, type Element5 } from "./element";

// ---------------------------------------------------------------------------
// 8 กัว (八卦) — ลำดับ 梅花: 乾1 兌2 離3 震4 巽5 坎6 艮7 坤8 · เส้นล่าง→บน (1=หยาง)
// ---------------------------------------------------------------------------

export interface Trigram {
  index: number; // 1-8
  hanzi: string;
  th: string;
  /** สัญลักษณ์ธรรมชาติ */
  natureTh: string;
  lines: [number, number, number]; // ล่าง→บน
  element: Element5;
  /** ทิศ後天 (ตรงกับ DIRS8 ของ lost-cat) */
  dirTh: string;
  /** 地理/處所 ต้นฉบับ (八卦萬物屬類) */
  terrainZh: string;
  /** ถอดเป็นภาษาค้นแมว */
  terrainTh: string;
}

export const TRIGRAMS: Trigram[] = [
  { index: 1, hanzi: "乾", th: "เฉียน", natureTh: "ฟ้า", lines: [1, 1, 1], element: "Metal", dirTh: "ตะวันตกเฉียงเหนือ", terrainZh: "京都、大郡、形勝之地、高亢之所", terrainTh: "ที่สูง ดาดฟ้า ตึกใหญ่ อาคารราชการ/สำนักงาน" },
  { index: 2, hanzi: "兌", th: "ตุ้ย", natureTh: "บึง", lines: [1, 1, 0], element: "Metal", dirTh: "ตะวันตก", terrainZh: "澤、水際、缺池、廢井、山崩破裂之地", terrainTh: "ที่ลุ่ม ริมน้ำ บ่อร้าง ที่พังทลาย ซอกแตกของกำแพง/พื้น" },
  { index: 3, hanzi: "離", th: "หลี", natureTh: "ไฟ", lines: [1, 0, 1], element: "Fire", dirTh: "ใต้", terrainZh: "幹亢之地、窖灶、爐冶之所", terrainTh: "ที่แห้งร้อน ครัว หลังเตา ห้องเครื่อง ใกล้แหล่งความร้อน" },
  { index: 4, hanzi: "震", th: "เจิ้น", natureTh: "ฟ้าร้อง", lines: [1, 0, 0], element: "Wood", dirTh: "ตะวันออก", terrainZh: "樹木、鬧市、大途、竹林、草木茂盛之所", terrainTh: "ต้นไม้ใหญ่ ถนนใหญ่ ตลาด ที่พลุกพล่าน ดงไผ่/พุ่มไม้หนา" },
  { index: 5, hanzi: "巽", th: "ซุ่น", natureTh: "ลม", lines: [0, 1, 1], element: "Wood", dirTh: "ตะวันออกเฉียงใต้", terrainZh: "草木茂秀之所、花果菜園", terrainTh: "สวน แปลงผัก ต้นไม้ดอกไม้ ที่ลมโกรก" },
  { index: 6, hanzi: "坎", th: "ข่าน", natureTh: "น้ำ", lines: [0, 1, 0], element: "Water", dirTh: "เหนือ", terrainZh: "江湖、溪澗、泉井、卑濕之地", terrainTh: "ร่องน้ำ ท่อระบายน้ำ ที่ชื้นแฉะ ใต้ถุนเปียก" },
  { index: 7, hanzi: "艮", th: "เกิ้น", natureTh: "ภูเขา", lines: [0, 0, 1], element: "Earth", dirTh: "ตะวันออกเฉียงเหนือ", terrainZh: "山徑路、近山城、丘陵、墳墓", terrainTh: "ทางเดินแคบ เนิน กำแพง มุมตึก กองหิน/กองของที่นิ่ง" },
  { index: 8, hanzi: "坤", th: "คุน", natureTh: "ดิน", lines: [0, 0, 0], element: "Earth", dirTh: "ตะวันตกเฉียงใต้", terrainZh: "田野、鄉裏、平地", terrainTh: "ทุ่ง ลานดิน ที่ราบโล่ง บ้านคนใจดีในละแวก" },
];

const trigramByLines = (l: [number, number, number]): Trigram =>
  TRIGRAMS.find((t) => t.lines[0] === l[0] && t.lines[1] === l[1] && t.lines[2] === l[2])!;

/** ชื่อ 64 กัว (King Wen) — แถว = กัวบน · คอลัมน์ = กัวล่าง (ลำดับ 乾兌離震巽坎艮坤) */
const HEXAGRAM_NAMES: string[][] = [
  ["乾為天", "天澤履", "天火同人", "天雷無妄", "天風姤", "天水訟", "天山遯", "天地否"],
  ["澤天夬", "兌為澤", "澤火革", "澤雷隨", "澤風大過", "澤水困", "澤山咸", "澤地萃"],
  ["火天大有", "火澤睽", "離為火", "火雷噬嗑", "火風鼎", "火水未濟", "火山旅", "火地晉"],
  ["雷天大壯", "雷澤歸妹", "雷火豐", "震為雷", "雷風恆", "雷水解", "雷山小過", "雷地豫"],
  ["風天小畜", "風澤中孚", "風火家人", "風雷益", "巽為風", "風水渙", "風山漸", "風地觀"],
  ["水天需", "水澤節", "水火既濟", "水雷屯", "水風井", "坎為水", "水山蹇", "水地比"],
  ["山天大畜", "山澤損", "山火賁", "山雷頤", "山風蠱", "山水蒙", "艮為山", "山地剝"],
  ["地天泰", "地澤臨", "地火明夷", "地雷復", "地風升", "地水師", "地山謙", "坤為地"],
];
export const hexagramName = (upper: Trigram, lower: Trigram): string => HEXAGRAM_NAMES[upper.index - 1][lower.index - 1];

// ---------------------------------------------------------------------------
// ธาตุ 體/用 (วงจรให้กำเนิด/พิฆาต — ระบบเดียวกับ wuXingScore แต่ไม่ให้คะแนน แค่จำแนกความสัมพันธ์)
// ---------------------------------------------------------------------------

const GEN: Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];
const generates = (a: Element5, b: Element5) => GEN[(GEN.indexOf(a) + 1) % 5] === b;
const controls = (a: Element5, b: Element5) => GEN[(GEN.indexOf(a) + 2) % 5] === b;

export type TiYongRelation = "ti_controls_yong" | "yong_generates_ti" | "same" | "ti_generates_yong" | "yong_controls_ti";

/** 失物占 (卷二 體用總訣) — ถ้อยคำกรองแล้วตามกติกาแมวหาย (ห้าม "หาไม่ได้"/ห้ามบอกเลิกค้น) */
export const OMEN_TH: Record<TiYongRelation, { zh: string; labelTh: string; adviceTh: string }> = {
  ti_controls_yong: { zh: "體克用 — 可尋遲得", labelTh: "ตำราว่าหาได้ แต่ช้า", adviceTh: "ค้นซ้ำจุดเดิมหลายวัน อย่าเพิ่งเปลี่ยนทิศเร็วเกินไป — แมวที่ซ่อนจะขยับเมื่อหิว" },
  yong_generates_ti: { zh: "用生體 — 物易尋", labelTh: "ตำราว่าหาง่าย", adviceTh: "เริ่มจากวงใกล้บ้านทันที โอกาสเจอเร็วอยู่ที่การค้นละเอียดรอบตัวบ้าน" },
  same: { zh: "比和 — 物不失", labelTh: "ตำราว่าของไม่ไปไกล", adviceTh: "อาจอยู่ใกล้กว่าที่คิดหรือมีคนเก็บไว้ดูแล — ถามเพื่อนบ้านและกลุ่มหมู่บ้านควบคู่กับค้นรอบบ้าน" },
  ti_generates_yong: { zh: "體生用 — 物難見", labelTh: "ตำราว่าค้นยากขึ้น", adviceTh: "ขยายเครือข่าย: ประกาศพร้อมรูป ขอดูกล้องวงจรปิด และค้นช่วงกลางคืนด้วยไฟฉาย" },
  yong_controls_ti: { zh: "用克體 — (ต้นฉบับใช้คำแรง ระบบไม่ใช้)", labelTh: "ตำราว่าค้นยาก — อย่าเพิ่งท้อ", adviceTh: "ขยายวงและใช้เครือข่ายช่วย (ประกาศ/กล้อง/เพื่อนบ้าน) แล้วกลับมาค้นซ้ำจุดเดิมเมื่อแมวหิว — สถิติยังให้โอกาสถึง 61% ภายใน 1 ปี" },
};

export interface MeihuaReading {
  /** ตัวเลขที่ใช้ตั้งกัว (โปร่งใส ตรวจมือได้) */
  numbers: { year: number; month: number; day: number; hour: number; yearBranch: string; animalTh: string; lunarMonth: number; lunarLeap: boolean; lunarDay: number; shichen: string };
  upper: Trigram;
  lower: Trigram;
  movingLine: number; // 1-6
  hexagram: string;
  ti: Trigram;
  yong: Trigram;
  /** กัวที่แปรแล้วของฝั่ง 用 (變卦) — ทิศ/สถานที่อ่านจากตัวนี้ */
  changed: Trigram;
  changedHexagram: string;
  relation: TiYongRelation;
  /** ทิศตามตำรา (ตรง DIRS8) */
  dirTh: string;
  /** ทิศรอง = ทิศของ 用卦 เดิม (บางสำนักดูประกอบ) */
  secondaryDirTh: string;
  terrainTh: string;
  omen: { labelTh: string; adviceTh: string; zh: string };
  summaryTh: string;
}

export const MEIHUA_CAVEAT =
  "มุมตำราเมยฮวาอี้ซู่ (梅花易数) ตั้งกัวจากเวลาที่แมวหาย เป็นชั้นเสริมจากตำราจีนโบราณ — ไม่มีหลักฐานสถิติ " +
  "และไม่ได้เข้าสูตรจัดลำดับ (ระบบจะวัดจากเคส 'เจอแล้ว' ก่อนให้น้ำหนัก) · ธรรมเนียมที่ใช้: เลขปีตามลี่ชุน · " +
  "ยาม 子 ไม่ข้ามวัน · เดือน/วันจันทรคติจีนคำนวณจากดาราศาสตร์ · ผลนี้ไม่ใช่ตำแหน่งแมว โปรดค้นทุกทิศ";

export const SHICHEN = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 时辰 จากชั่วโมงท้องถิ่น (23:00-00:59 = 子 … 21:00-22:59 = 亥) → index 0-11 */
export function shichenIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

/** ตั้งกัวจากตัวเลขโดยตรง (สำหรับเทสต์กับตัวอย่างตำรา) */
export function castFromNumbers(year: number, month: number, day: number, hour: number): Pick<MeihuaReading, "upper" | "lower" | "movingLine" | "hexagram" | "ti" | "yong" | "changed" | "changedHexagram" | "relation"> {
  const mod = (n: number, m: number) => { const r = n % m; return r === 0 ? m : r; };
  const upper = TRIGRAMS[mod(year + month + day, 8) - 1];
  const lower = TRIGRAMS[mod(year + month + day + hour, 8) - 1];
  const movingLine = mod(year + month + day + hour, 6);
  const movingInLower = movingLine <= 3;
  const yong = movingInLower ? lower : upper;
  const ti = movingInLower ? upper : lower;
  const lines = [...yong.lines] as [number, number, number];
  const li = movingInLower ? movingLine - 1 : movingLine - 4;
  lines[li] = lines[li] ? 0 : 1;
  const changed = trigramByLines(lines);
  const changedHexagram = movingInLower ? hexagramName(upper, changed) : hexagramName(changed, lower);
  let relation: TiYongRelation;
  if (ti.element === yong.element) relation = "same";
  else if (controls(ti.element, yong.element)) relation = "ti_controls_yong";
  else if (generates(yong.element, ti.element)) relation = "yong_generates_ti";
  else if (generates(ti.element, yong.element)) relation = "ti_generates_yong";
  else relation = "yong_controls_ti";
  return { upper, lower, movingLine, hexagram: hexagramName(upper, lower), ti, yong, changed, changedHexagram, relation };
}

/**
 * อ่านกัวของหายจาก "วัน-เวลาที่แมวหาย" (เวลาท้องถิ่นไทย)
 * @param date "YYYY-MM-DD" · @param time "HH:MM" — ไม่รู้เวลา = null (ชั้นนี้ปิดตัวเอง ไม่เดายาม)
 */
export function meihuaLostReading(date: string, time: string): MeihuaReading | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!dm || !tm) return null;
  const y = Number(dm[1]), m = Number(dm[2]), d = Number(dm[3]);
  const hour = Number(tm[1]);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31 || hour < 0 || hour > 23) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;

  // ปีตามลี่ชุน (ธรรมเนียมเดียวกับธาตุปี §5.1)
  let effYear = y;
  if (m < 2 || (m === 2 && d < lichunDayOfFebruary(y))) effYear = y - 1;
  const bi = yearBranchIndex(effYear);
  const lunar = chineseLunarDate(y, m, d);
  const si = shichenIndex(hour);

  const nums = { year: bi + 1, month: lunar.month, day: lunar.day, hour: si + 1 };
  const cast = castFromNumbers(nums.year, nums.month, nums.day, nums.hour);
  const omen = OMEN_TH[cast.relation];
  const dirTh = cast.changed.dirTh;
  const secondaryDirTh = cast.yong.dirTh;

  const summaryTh =
    `ตั้งกัวจากเวลาที่หาย: ปี${BRANCH_ANIMAL_TH[bi]} (${nums.year}) + เดือน${lunar.isLeap ? "อธิกมาส" : ""}จีน ${lunar.month} + วันจันทรคติ ${lunar.day} + ยาม${SHICHEN[si]} (${nums.hour}) ` +
    `→ กัว ${cast.hexagram} เส้นเคลื่อนที่ ${cast.movingLine} → แปรเป็น ${cast.changedHexagram} · ` +
    `ตำราชี้ทิศ${dirTh} (${cast.changed.hanzi} ${cast.changed.natureTh}) ลักษณะที่: ${cast.changed.terrainTh} · ${omen.labelTh}`;

  return {
    numbers: { ...nums, yearBranch: EARTHLY_BRANCHES[bi], animalTh: BRANCH_ANIMAL_TH[bi], lunarMonth: lunar.month, lunarLeap: lunar.isLeap, lunarDay: lunar.day, shichen: SHICHEN[si] },
    ...cast,
    dirTh,
    secondaryDirTh,
    terrainTh: cast.changed.terrainTh,
    omen: { labelTh: omen.labelTh, adviceTh: omen.adviceTh, zh: omen.zh },
    summaryTh,
  };
}

export const THAI_ELEMENT_OF_TRIGRAM = (t: Trigram) => THAI_LABEL_5[t.element];
