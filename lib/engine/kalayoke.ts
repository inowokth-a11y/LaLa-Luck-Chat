// พอร์ตจาก legacy-python-engines/kala_yoke_engine.py (Logic 3 ส่วนขยาย, CLAUDE.md §6, §3.6)
// ✅ สูตร verify แล้ว 100% กับตัวอย่างวิกิพีเดีย (จ.ศ. 1369)
//
// ⚠️ caveat สำคัญ: อาจารย์ใหญ่หลายท่านเลิกใช้กาลโยคเป็นเกณฑ์หลัก — ใช้ประกอบเท่านั้น (CLAUDE.md §3.6)

import { checkAuspiciousTime, type TimeObj, type AuspiciousFound, type AuspiciousNotFound } from "./auspicious";

const DAY_NAMES = ["", "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]; // index 1-7
const ZODIAC_NAMES = ["เมษ", "พฤษภ", "มิถุน", "กรกฎ", "สิงห์", "กันย์", "ตุลย์", "พิจิก", "ธนู", "มังกร", "กุมภ์", "มีน"]; // 0-11

export function toChulasakarat(opts: { ce_year?: number; be_year?: number }): number {
  if (opts.ce_year !== undefined) return opts.ce_year - 638;
  if (opts.be_year !== undefined) return opts.be_year - 1181;
  throw new Error("ต้องระบุ ce_year หรือ be_year อย่างใดอย่างหนึ่ง");
}

function modWithZeroRule(value: number, divisor: number, isZodiac = false): number {
  const r = ((value % divisor) + divisor) % divisor;
  if (r === 0 && !isZodiac) return divisor;
  return r;
}

export interface KalaYokeBase {
  day: number;
  yam: number;
  reuk: number;
  zodiac: number;
  dithi: number;
  day_name: string;
  zodiac_name: string;
}

function computeBases(kernel: number): Omit<KalaYokeBase, "day_name" | "zodiac_name"> {
  return {
    day: modWithZeroRule(kernel, 7),
    yam: modWithZeroRule(kernel, 8),
    reuk: modWithZeroRule(kernel, 27),
    zodiac: modWithZeroRule(kernel, 12, true),
    dithi: modWithZeroRule(kernel, 30),
  };
}

export interface KalaYokeResult {
  chulasakarat_year: number;
  thongchai: KalaYokeBase;
  athibodee: KalaYokeBase;
  ubat: KalaYokeBase;
  lokawinat: KalaYokeBase;
}

export function calculateKalaYoke(cs: number): KalaYokeResult {
  const thongchaiKernel = cs * 10 + 3;
  const athibodeeKernel = ((cs % 498) + 498) % 498;
  const ubatKernel = cs * 10 + 2;
  const lokawinatKernel = cs + 1120;

  const build = (kernel: number): KalaYokeBase => {
    const b = computeBases(kernel);
    return { ...b, day_name: DAY_NAMES[b.day], zodiac_name: ZODIAC_NAMES[b.zodiac] };
  };

  return {
    chulasakarat_year: cs,
    thongchai: build(thongchaiKernel),
    athibodee: build(athibodeeKernel),
    ubat: build(ubatKernel),
    lokawinat: build(lokawinatKernel),
  };
}

const KALA_TYPES: Array<[keyof Omit<KalaYokeResult, "chulasakarat_year">, string, string]> = [
  ["thongchai", "ธงชัย", "ดี"],
  ["athibodee", "อธิบดี", "ดี"],
  ["ubat", "อุบาทว์", "ร้าย"],
  ["lokawinat", "โลกาวินาศ", "ร้าย"],
];

export interface DayKalaYokeResult {
  day: string;
  chulasakarat_year: number;
  kala_yoke_hits: Array<{ type: string; valence: string }>;
}

export function checkDayKalaYoke(dayOfWeekTh: string, cs: number): DayKalaYokeResult {
  const ky = calculateKalaYoke(cs);
  const hits: Array<{ type: string; valence: string }> = [];
  for (const [key, label, valence] of KALA_TYPES) {
    if (ky[key].day_name === dayOfWeekTh) hits.push({ type: label, valence });
  }
  return { day: dayOfWeekTh, chulasakarat_year: cs, kala_yoke_hits: hits };
}

const timeStr = (t: TimeObj) =>
  `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}:${String(t.second ?? 0).padStart(2, "0")}`;

const CAVEAT_BASE =
  "นี่คือการรวม Kala Yoke (ระดับปี, ตัดสินด้วยยามกาลโยคเมื่อวันมีทั้งดีและร้าย " +
  "ไม่ใช่แค่นับจำนวน) + Ubakong (ระดับชั่วโมง, เฉพาะกลางวัน) — ยังไม่รวมฤกษ์บน/" +
  "ราศี/ดิถีที่ละเอียดกว่านี้ และยังไม่รวมดวงส่วนบุคคล (Logic 8) " +
  "⚠️ สำคัญ: นักโหราศาสตร์ไทยระดับอาจารย์ใหญ่หลายท่านเลิกใช้กาลโยคเป็นหลักแล้ว " +
  "เพราะยังไม่มีข้อพิสูจน์ความแม่นยำเพียงพอ — ควรใช้ประกอบการตัดสินใจเท่านั้น " +
  "ไม่ใช่เกณฑ์เดียวสำหรับงานสำคัญจริงจัง";

export interface CombinedResult {
  day_of_week: string;
  time: string;
  year_level: { verdict: string; day_types: string[]; tiebreak_yam_hits: Array<{ type: string; valence: string }> };
  hour_level: { verdict: string; details: AuspiciousFound | AuspiciousNotFound };
  combined_verdict: string;
  caveat: string;
}

export function checkCombinedAuspiciousTime(dayOfWeekTh: string, timeObj: TimeObj, cs: number): CombinedResult {
  const ky = calculateKalaYoke(cs);
  const dayResult = checkDayKalaYoke(dayOfWeekTh, cs);
  const dayTypes = dayResult.kala_yoke_hits.map((h) => h.type);

  const hour = timeObj.hour + timeObj.minute / 60;
  let currentYam: number;
  if (hour >= 6 && hour < 18) {
    currentYam = Math.floor((hour - 6) / 1.5) + 1;
  } else {
    const h2 = hour >= 18 ? hour - 18 : hour + 6;
    currentYam = Math.floor(h2 / 1.5) + 1;
  }

  const yamHits: Array<{ type: string; valence: string }> = [];
  for (const [key, label, valence] of KALA_TYPES) {
    if (ky[key].yam === currentYam) yamHits.push({ type: label, valence });
  }

  const dayValences = dayResult.kala_yoke_hits.map((h) => h.valence);
  const yamValences = yamHits.map((h) => h.valence);

  let dayVerdict: string;
  if (dayValences.includes("ดี") && !dayValences.includes("ร้าย")) {
    dayVerdict = "ดี";
  } else if (dayValences.includes("ร้าย") && !dayValences.includes("ดี")) {
    dayVerdict = "ร้าย";
  } else if (dayValences.length > 0) {
    if (yamValences.includes("ดี") && !yamValences.includes("ร้าย")) {
      dayVerdict = "ดี (ยามช่วยตัดสิน)";
    } else if (yamValences.includes("ร้าย") && !yamValences.includes("ดี")) {
      dayVerdict = "ร้าย (ยามช่วยตัดสิน)";
    } else {
      dayVerdict = "ไม่ชัดเจน — ต้องดูฤกษ์/ราศี/ดิถีเพิ่ม (เกินขอบเขตระบบนี้)";
    }
  } else {
    dayVerdict = "ปกติ";
  }

  const hourResult = checkAuspiciousTime(dayOfWeekTh, timeObj);
  const hourVerdict = hourResult.found ? hourResult.verdict : "ไม่มีข้อมูล(กลางคืน)";

  let combined: string;
  if (dayVerdict.includes("ดี") && hourVerdict === "ร้าย") {
    combined = "ระวัง — วันเป็นมงคลแต่ช่วงเวลานี้ไม่ดี ผลดีของวันอาจถูกลดทอน";
  } else if (dayVerdict.includes("ร้าย") && hourVerdict === "ดี") {
    combined = "พอใช้ได้ — วันไม่เป็นมงคลนัก แต่ช่วงเวลานี้ช่วยพยุงไว้ได้บ้าง";
  } else if (dayVerdict.includes("ดี") && hourVerdict === "ดี") {
    combined = "ดีมาก — ทั้งวันและช่วงเวลานี้เป็นมงคลพร้อมกัน";
  } else if (dayVerdict.includes("ร้าย") && hourVerdict === "ร้าย") {
    combined = "ควรเลี่ยง — ทั้งวันและช่วงเวลานี้ไม่เป็นมงคลทั้งคู่";
  } else {
    combined = "ปกติ — ไม่มีสัญญาณพิเศษทั้งด้านดีและร้ายชัดเจน";
  }

  return {
    day_of_week: dayOfWeekTh,
    time: timeStr(timeObj),
    year_level: { verdict: dayVerdict, day_types: dayTypes, tiebreak_yam_hits: yamHits },
    hour_level: { verdict: hourVerdict, details: hourResult },
    combined_verdict: combined,
    caveat: CAVEAT_BASE,
  };
}

// check_full_auspicious_time: ชั้นดวงส่วนบุคคลใช้ moon_sign ณ ปัจจุบัน (non-deterministic)
// จึง golden-test ได้เฉพาะ path ที่ไม่มี lagna (คืน "ข้าม") — path ที่มี lagna รอ integration test
export interface FullResult extends CombinedResult {
  personal_level: { verdict: string; score?: number; details?: unknown };
  full_verdict: string;
}

export function checkFullAuspiciousTimeNoLagna(dayOfWeekTh: string, timeObj: TimeObj, cs: number): FullResult {
  const base = checkCombinedAuspiciousTime(dayOfWeekTh, timeObj, cs) as FullResult;
  base.personal_level = { verdict: "ข้าม — ไม่ได้ระบุลัคนา" };
  base.full_verdict = base.combined_verdict + " (ยังไม่รวมดวงส่วนบุคคล)";
  return base;
}
