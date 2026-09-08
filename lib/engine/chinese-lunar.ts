/**
 * ปฏิทินจันทรคติจีน (農曆) — คำนวณด้วยดาราศาสตร์ตรงๆ (定朔法) ไม่มีตาราง lookup
 * (รอบ implement 梅花易数 · 9 ก.ย. 2569 ผู้ใช้เคาะ "เริ่ม" — ดู docs/วิจัย_แมวหาย_เมยฮวาอี้ซู่_ยามสามตา_ก.ย.2569.md §1.4)
 *
 * กฎที่ใช้ (มาตรฐานปฏิทินจีนสมัยใหม่ ตั้งแต่ปฏิทินสือเซี่ยน ค.ศ. 1645):
 * 1. เดือนเริ่มที่วัน "จันทร์ดับ" (朔 — จันทร์กับอาทิตย์ลองจิจูดเท่ากัน) นับวันตามเขตเวลาจีน UTC+8
 * 2. เดือนที่มี "เหมายัน" (冬至 อาทิตย์ 270°) = เดือน 11 เสมอ · ช่วงระหว่างเดือน 11 สองครั้งเรียก "สุ่ย" (歲)
 * 3. ถ้าสุ่ยมี 13 เดือน → เดือนแรกที่ **ไม่มีจงชี่** (中氣 = อาทิตย์ทุก 30° เริ่มที่ 270°) เป็นเดือนอธิกมาส (閏月)
 *    ใช้เลขเดือนเดียวกับเดือนก่อนหน้า
 * 4. ปีจีน (ปีนักษัตร/ตรุษจีน) เริ่มที่เดือน 1 ของสุ่ยนั้น
 *
 * เครื่องมือดาราศาสตร์: solarEclipticLongitude (verify แล้ว §5.1 ลี่ชุน) + moonEclipticLongitude (Meeus ย่อ ~ลิปดา)
 * ⚠️ ความแม่น: จันทร์ดับที่ตกใกล้เที่ยงคืนจีน (±~15 นาที) อาจคลาดวันได้ 1 วัน (น้อยกว่า ~1% ของเดือน) —
 *    verify กับวันตรุษจีน ค.ศ. 2000-2035 (36 ปี) + ปีอธิกมาสที่ทราบ (เทสต์ล็อก)
 *
 * ทุกฟังก์ชัน pure ฿0 · ไม่มี dependency ใหม่
 */

import { julianDay, solarEclipticLongitude } from "./lagna";
import { moonEclipticLongitude } from "./daily";

const CHINA_TZ_HOURS = 8;
const SYNODIC_MONTH = 29.530588853;
/** จันทร์ดับอ้างอิง: 6 ม.ค. 2000 18:14 UTC (Meeus) */
const NEW_MOON_EPOCH_JD = 2451550.26;

const pymod = (a: number, n: number) => ((a % n) + n) % n;
/** ส่วนต่างมุมแบบมีเครื่องหมายในช่วง (-180, 180] */
const signedDiff = (a: number, b: number) => pymod(a - b + 180, 360) - 180;

/** JD ของเที่ยงคืน UTC ของวันปฏิทิน (y,m,d) */
function jdOfDate(y: number, m: number, d: number): number {
  // julianDay ของ lagna.ts รับ "naive datetime" เป็น ms ในกรอบ UTC
  return julianDay(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/** แปลง JD (UTC) → "เลขวันปฏิทินจีน" (จำนวนเต็ม — วันเดียวกันในเขต UTC+8 ได้เลขเดียวกัน) */
function chinaDayNumber(jdUtc: number): number {
  return Math.floor(jdUtc + CHINA_TZ_HOURS / 24 + 0.5);
}
/** เลขวันปฏิทินของวัน (y,m,d) — ใช้แกนเดียวกับ chinaDayNumber (เที่ยงคืนท้องถิ่น +0.5 → ปัดลง) */
function dayNumberOfDate(y: number, m: number, d: number): number {
  return Math.floor(jdOfDate(y, m, d) + 0.5);
}
function dateOfDayNumber(n: number): { year: number; month: number; day: number } {
  // Meeus: JD → calendar (Gregorian)
  const jd = n; // n = JD ณ เที่ยงวัน (เพราะ +0.5 แล้วปัดลง)
  const Z = Math.floor(jd + 0.5);
  const alpha = Math.floor((Z - 1867216.25) / 36524.25);
  const A = Z + 1 + alpha - Math.floor(alpha / 4);
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day };
}

/** จันทร์ดับ (JD UTC) ครั้งที่ k นับจาก epoch — refine ด้วย Newton บนมุมยืดจันทร์-อาทิตย์ */
export function newMoonJd(k: number): number {
  let jd = NEW_MOON_EPOCH_JD + k * SYNODIC_MONTH;
  for (let i = 0; i < 8; i++) {
    const elong = signedDiff(moonEclipticLongitude(jd), solarEclipticLongitude(jd));
    // มุมยืดเพิ่ม ~12.19°/วัน
    const rate = 12.1907;
    const corr = elong / rate;
    jd -= corr;
    if (Math.abs(corr) < 1e-6) break;
  }
  return jd;
}

/** JD (UTC) ที่ดวงอาทิตย์ถึงลองจิจูด L° ครั้งที่ใกล้ approxJd ที่สุด */
export function solarTermJd(targetLongitude: number, approxJd: number): number {
  let jd = approxJd;
  for (let i = 0; i < 12; i++) {
    const diff = signedDiff(solarEclipticLongitude(jd), targetLongitude);
    const corr = diff / 0.98565; // องศา/วัน โดยประมาณ
    jd -= corr;
    if (Math.abs(corr) < 1e-6) break;
  }
  return jd;
}

/** วันเหมายัน (冬至) ของปี ค.ศ. y เป็นเลขวันจีน */
function winterSolsticeDayNumber(y: number): number {
  return chinaDayNumber(solarTermJd(270, jdOfDate(y, 12, 21)));
}

/** จันทร์ดับล่าสุดที่ "ไม่หลัง" วัน dayNumber (เลขวันจีน) → คืน index k */
function newMoonIndexOnOrBefore(dayNumber: number): number {
  let k = Math.floor((dayNumber - 0.5 - NEW_MOON_EPOCH_JD) / SYNODIC_MONTH) + 1;
  while (chinaDayNumber(newMoonJd(k)) > dayNumber) k--;
  while (chinaDayNumber(newMoonJd(k + 1)) <= dayNumber) k++;
  return k;
}

export interface LunarMonth {
  /** เลขเดือน 1-12 */
  month: number;
  isLeap: boolean;
  /** เลขวันจีนของวันแรกเดือน */
  startDay: number;
  /** จำนวนวันในเดือน (29 หรือ 30) */
  length: number;
}

/**
 * เดือนทั้งหมดใน "สุ่ย" ที่เริ่มจากเดือน 11 ซึ่งมีเหมายันของปี ค.ศ. y (เดือน 11 ของปี y → ถึงก่อนเดือน 11 ปี y+1)
 * เดือน 11, 12 อยู่ในปีจีน y · เดือน 1-10 อยู่ในปีจีน y+1
 */
export function lunarMonthsOfSui(y: number): LunarMonth[] {
  const ws0 = winterSolsticeDayNumber(y);
  const ws1 = winterSolsticeDayNumber(y + 1);
  const k0 = newMoonIndexOnOrBefore(ws0);
  const k1 = newMoonIndexOnOrBefore(ws1);
  const starts: number[] = [];
  for (let k = k0; k <= k1; k++) starts.push(chinaDayNumber(newMoonJd(k)));
  const count = starts.length - 1; // เดือนในสุ่ย (12 หรือ 13)

  // จงชี่ทั้ง 12 ในสุ่ย: 270 (เหมายันนี้), 300, 330, 0, ..., 240 — เป็นเลขวันจีน
  const zhongqi: number[] = [];
  for (let i = 0; i < 12; i++) {
    const L = pymod(270 + 30 * i, 360);
    zhongqi.push(chinaDayNumber(solarTermJd(L, jdOfDate(y, 12, 21) + i * 30.44)));
  }
  const hasZhongqi = (start: number, end: number) => zhongqi.some((z) => z >= start && z < end);

  const months: LunarMonth[] = [];
  let num = 11;
  let leapUsed = false;
  for (let i = 0; i < count; i++) {
    const start = starts[i];
    const end = starts[i + 1];
    let isLeap = false;
    if (count === 13 && !leapUsed && i > 0 && !hasZhongqi(start, end)) {
      isLeap = true;
      leapUsed = true;
    }
    if (isLeap) {
      // เดือนอธิกมาสใช้เลขเดือนก่อนหน้า
      months.push({ month: months[months.length - 1].month, isLeap: true, startDay: start, length: end - start });
    } else {
      months.push({ month: num, isLeap: false, startDay: start, length: end - start });
      num = num === 12 ? 1 : num + 1;
    }
  }
  return months;
}

export interface ChineseLunarDate {
  /** ปีจีน (ปีที่ตรุษจีนของปีนั้นเริ่ม) */
  lunarYear: number;
  month: number;
  isLeap: boolean;
  /** วันจันทรคติ 1-30 (初一 = 1) */
  day: number;
}

/**
 * แปลงวันปฏิทินสากล → วันจันทรคติจีน
 * ⚠️ วันที่ป้อนถือเป็น "วันปฏิทินท้องถิ่น" ของผู้ใช้ (ไทย UTC+7) แต่ขอบเดือนคำนวณตามธรรมเนียมจีน UTC+8 —
 *    ต่างกัน 1 ชม. มีผลเฉพาะจันทร์ดับที่ตก 23:00-24:00 ไทย (หายาก · ประกาศใน caveat ของผู้เรียก)
 */
export function chineseLunarDate(year: number, month: number, day: number): ChineseLunarDate {
  const n = dayNumberOfDate(year, month, day);
  // สุ่ยที่ครอบวันนี้: เริ่มที่เหมายันปี year-1 หรือ year (ถ้าวันนี้อยู่หลังเดือน 11 ของปี year)
  let suiYear = year - 1;
  let months = lunarMonthsOfSui(suiYear);
  if (n >= lunarMonthsOfSui(year)[0].startDay) {
    suiYear = year;
    months = lunarMonthsOfSui(suiYear);
  } else if (n < months[0].startDay) {
    suiYear = year - 2;
    months = lunarMonthsOfSui(suiYear);
  }
  let m = months[0];
  for (const lm of months) if (lm.startDay <= n) m = lm;
  const lunarYear = m.month >= 11 ? suiYear : suiYear + 1;
  return { lunarYear, month: m.month, isLeap: m.isLeap, day: n - m.startDay + 1 };
}

/** วันตรุษจีน (เดือน 1 วัน 1) ของปี ค.ศ. y */
export function chineseNewYear(y: number): { year: number; month: number; day: number } {
  const months = lunarMonthsOfSui(y - 1);
  const first = months.find((m) => m.month === 1 && !m.isLeap)!;
  return dateOfDayNumber(first.startDay);
}

/** เดือนอธิกมาสของปีจีน y (null = ไม่มี) — สำหรับ verify */
export function leapMonthOfYear(y: number): number | null {
  // ปีจีน y = เดือน 1-10 ของสุ่ย(y-1) + เดือน 11-12 ของสุ่ย(y)
  const a = lunarMonthsOfSui(y - 1).filter((m) => m.month <= 10 && m.isLeap);
  if (a.length) return a[0].month;
  const b = lunarMonthsOfSui(y).filter((m) => m.month >= 11 && m.isLeap);
  return b.length ? b[0].month : null;
}

/** 地支 ของปี (ตามขอบเขตลี่ชุน — ธรรมเนียมเดียวกับธาตุปีของระบบ §5.1) : 子=1 … 亥=12 */
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const BRANCH_ANIMAL_TH = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"] as const;
export function yearBranchIndex(effectiveYearAd: number): number {
  // 1984 = 甲子 → 子
  return pymod(effectiveYearAd - 1984, 12);
}
