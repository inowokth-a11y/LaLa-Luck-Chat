// ลัคนาด้วยสูตรดาราศาสตร์มาตรฐาน (ทางเลือก "ค" ที่ผู้ใช้เลือก 19 ก.ค. 2569)
//
// 🔴 ทำไมต้องเขียนใหม่ — วิธีอันโตนาทีเดิมใน lagna.ts พิสูจน์แล้วว่าให้ผลผิด:
//    ตาราง ANTO_NATEE จากตำราจตุพลวัตร (ตารางที่ 5) รวมกันได้ 2,028 นาที
//    แต่ลัคนาต้องวนครบ 12 ราศีใน 1 วัน = 1,440 นาที → เกินไป 41%
//    ผลคือวนได้แค่ ~8.5 ราศี/วัน และราศี กรกฎ/สิงห์/กันย์ หายไปจากรอบวัน
//    (โค้ดเดิมพอร์ตมาถูกต้องทุกตัวเลข — ตัวตำราเองที่ผลรวมไม่ลงตัว)
//
// วิธีนี้ใช้สูตรมาตรฐานสากลซึ่งตรวจสอบข้ามกับโปรแกรมโหราศาสตร์อื่นได้:
//    1. หา Local Sidereal Time (LST) จากเวลา UT + ลองจิจูด
//    2. หาความเอียงแกนโลก (obliquity) ณ เวลานั้น
//    3. คำนวณลัคนาสายนะ (tropical) จาก LST + ละติจูด + obliquity
//    4. ลบอายนางศะ → ได้ลัคนานิรายนะ (sidereal) ซึ่งเป็นระบบที่โหราศาสตร์ไทยใช้
//
// ⚠️ ข้อ 4 เป็นจุดที่ต่างจากโค้ดเดิมอย่างมีนัยสำคัญ — `getZodiacSign()` ใน lagna.ts
//    ไม่เคยลบอายนางศะเลย คือเอาค่าสายนะมาเรียกเป็นราศีไทยตรงๆ ซึ่งคลาดไป ~24°
//    (เกือบเต็มราศี) ดู §หมายเหตุอายนางศะ ท้ายไฟล์

const DEG = Math.PI / 180;
const rad = (d: number) => d * DEG;
const deg = (r: number) => r / DEG;
const pymod = (a: number, n: number) => ((a % n) + n) % n;

export const ZODIAC_ORDER = [
  "เมษ", "พฤษภ", "มิถุน", "กรกฎ", "สิงห์", "กันย์",
  "ตุลย์", "พิจิก", "ธนู", "มังกร", "กุมภ์", "มีน",
] as const;
export type ZodiacSign = (typeof ZODIAC_ORDER)[number];

/**
 * Greenwich Mean Sidereal Time (องศา) — Meeus, Astronomical Algorithms บทที่ 12
 * ใช้สูตรเต็มรูป (ไม่ตัดพจน์) เพราะพจน์ท้ายมีผลระดับวินาทีเชิงมุมเมื่อห่างจาก J2000 มาก
 */
export function greenwichMeanSiderealTime(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  return pymod(gmst, 360);
}

/** Local Sidereal Time (องศา) — ลองจิจูดตะวันออกเป็นบวก */
export function localSiderealTime(jd: number, lonDegEast: number): number {
  return pymod(greenwichMeanSiderealTime(jd) + lonDegEast, 360);
}

/** ความเอียงแกนโลกเฉลี่ย (องศา) — Meeus 22.2 */
export function meanObliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return (
    23.439291111 -
    0.0130041667 * T -
    1.6666667e-7 * T * T +
    5.027778e-7 * T * T * T
  );
}

/**
 * อายนางศะแบบลาหิรี (Lahiri / Chitrapaksha) — ส่วนต่างระหว่างระบบสายนะกับนิรายนะ
 *
 * ⚠️ ค่านี้เป็น**สูตรประมาณเชิงเส้น** (ค่าที่ J2000 + อัตราการเคลื่อนของจุดวสันตวิษุวัต)
 *    คลาดจากค่าทางการของ Swiss Ephemeris ไม่เกิน ~0.01° ในช่วง ค.ศ. 1900-2100
 *    ซึ่งเล็กกว่าความกว้างของราศี (30°) มาก จึงไม่กระทบการตัดสินราศี
 *    ยกเว้นกรณีเกิดใกล้รอยต่อราศีระดับไม่กี่ลิปดา
 */
export function lahiriAyanamsa(jd: number): number {
  const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
  return 23.853 + 0.013969 * yearsFromJ2000;
}

export type ZodiacSystem = "sidereal" | "tropical";

export interface AscendantResult {
  /** ลองจิจูดลัคนา 0-360 องศา ในระบบที่เลือก */
  longitude: number;
  sign: ZodiacSign;
  /** องศาภายในราศี 0-30 */
  degreeInSign: number;
  /** ลองจิจูดลัคนาแบบสายนะ (ก่อนลบอายนางศะ) — เก็บไว้ตรวจสอบ */
  tropicalLongitude: number;
  ayanamsaUsed: number;
  localSiderealTimeDeg: number;
  obliquityDeg: number;
  system: ZodiacSystem;
}

/**
 * ลัคนา (Ascendant) — จุดบนสุริยวิถีที่กำลังขึ้นขอบฟ้าตะวันออก
 *
 * สูตรมาตรฐาน:
 *   Asc = atan2( cos(RAMC),  −( sin(RAMC)·cos ε + tan φ · sin ε ) )
 * โดย RAMC = Local Sidereal Time (องศา), φ = ละติจูด, ε = obliquity
 *
 * @param jd       Julian Day (UT)
 * @param latDeg   ละติจูด (เหนือเป็นบวก)
 * @param lonDeg   ลองจิจูด (ตะวันออกเป็นบวก)
 * @param system   'sidereal' = ราศีไทย/อินเดีย (ค่าเริ่มต้น) · 'tropical' = ราศีสากล
 */
export function calculateAscendant(
  jd: number,
  latDeg: number,
  lonDeg: number,
  system: ZodiacSystem = "sidereal"
): AscendantResult {
  const lst = localSiderealTime(jd, lonDeg);
  const eps = meanObliquity(jd);

  const ramc = rad(lst);
  const e = rad(eps);
  const phi = rad(latDeg);

  // atan2 จัดการควอดรันต์ให้เอง — ไม่ต้องบวก 180 แก้เองแบบสูตร arctan ธรรมดา
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(e) + Math.tan(phi) * Math.sin(e));
  const tropical = pymod(deg(Math.atan2(y, x)), 360);

  const ayanamsa = system === "sidereal" ? lahiriAyanamsa(jd) : 0;
  const longitude = pymod(tropical - ayanamsa, 360);

  const idx = Math.floor(longitude / 30);
  return {
    longitude,
    sign: ZODIAC_ORDER[idx],
    degreeInSign: pymod(longitude, 30),
    tropicalLongitude: tropical,
    ayanamsaUsed: ayanamsa,
    localSiderealTimeDeg: lst,
    obliquityDeg: eps,
    system,
  };
}

// ---------------------------------------------------------------------------
// §หมายเหตุอายนางศะ (ayanamsa) — อ่านก่อนเปรียบเทียบผลกับโค้ดเดิม
// ---------------------------------------------------------------------------
// โหราศาสตร์ไทยสืบสายจากอินเดีย ใช้ระบบ **นิรายนะ (sidereal)** คือผูกราศีกับกลุ่มดาวจริง
// ส่วนโหราศาสตร์ตะวันตกใช้ **สายนะ (tropical)** ผูกกับจุดวสันตวิษุวัต
// สองระบบนี้เคยตรงกันเมื่อ ~ค.ศ. 285 แล้วค่อยๆ ห่างออกปีละ ~50 ลิปดา
// ปัจจุบัน (2569) ห่างกันประมาณ 24 องศา = เกือบเต็มราศี
//
// 🔴 `getZodiacSign()` ใน lib/engine/lagna.ts ไม่ได้ลบอายนางศะ → ค่า "ราศีอาทิตย์"
//    ที่ระบบใช้อยู่ตอนนี้เป็นราศีแบบสากล ไม่ใช่ราศีไทย
//    ไฟล์นี้จึงคืนทั้ง `longitude` (นิรายนะ) และ `tropicalLongitude` ไว้ให้เทียบได้
//    **ยังไม่ได้แก้ lagna.ts** เพราะการเปลี่ยนระบบราศีกระทบทุก Logic ที่ใช้ราศี
//    (8, 9, 10, 11) ต้องให้เจ้าของระบบตัดสินก่อน (CLAUDE.md §4)
