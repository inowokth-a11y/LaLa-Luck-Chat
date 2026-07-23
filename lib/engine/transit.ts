// พอร์ตจาก legacy-python-engines/transit_engine.py (Logic 9/10/11, CLAUDE.md §6)
// Logic 9 รายเดือน (อาทิตย์จร→ภพ), Logic 10 รายปี (พฤหัส/เสาร์จร→มุมลัคนา→เกรด A-F),
// Logic 11 วันเกิด (ทักษาจร หมุนตามอายุ%8)
//
// ⚠️ พฤหัส/เสาร์ใช้ mean motion (ไม่ใช่ perturbation) — แม่นระดับราศี ไม่แม่นระดับองศา (CLAUDE.md §5)
// ⚠️ Age_Element (Logic 11) จงใจไม่ implement เพราะสเปกเดิมไม่นิยามชัด

import { ZODIAC_ORDER, julianDay, solarEclipticLongitude, getZodiacSign } from "./lagna";

const pymod = (a: number, n: number) => ((a % n) + n) % n;

// ทักษา (mirror จาก daily engine — engine ต้นฉบับ import มาจาก daily_prediction_engine)
const TAKSA_FIXED_ORDER = [1, 2, 3, 4, 7, 5, 8, 6];
const PLANET_NAME_TH: Record<number, string> = {
  1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ", 5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู",
};
const DAY_TO_PLANET: Record<string, number> = {
  อาทิตย์: 1, จันทร์: 2, อังคาร: 3, พุธ: 4, พฤหัสบดี: 5, ศุกร์: 6, เสาร์: 7,
};

export const HOUSE_NAMES = [
  "ตนุ", "กดุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ",
  "ปัตนิ", "มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "วินาศ",
];

export const HOUSE_THEME: Record<string, string> = {
  ตนุ: "ตัวตน สุขภาพโดยรวม การแสดงออก",
  กดุมภะ: "การเงิน รายได้ การค้าขาย",
  สหัชชะ: "พี่น้อง เพื่อนสนิท การเดินทางใกล้ การสื่อสาร",
  พันธุ: "ครอบครัว บ้าน ที่ดิน รากฐานชีวิต",
  ปุตตะ: "ความคิดสร้างสรรค์ บุตรหลาน การเสี่ยงโชค ความบันเทิง",
  อริ: "อุปสรรค ศัตรู โรคภัย ความขัดแย้ง",
  ปัตนิ: "คู่ครอง หุ้นส่วน คู่สัญญา ธุรกิจร่วม",
  มรณะ: "การเปลี่ยนแปลงใหญ่ การสูญเสีย มรดก จุดจบ-จุดเริ่มใหม่",
  ศุภะ: "โชคลาภ การเดินทางไกล ความสงบสุข",
  กัมมะ: "การงาน อาชีพ ตำแหน่งหน้าที่",
  ลาภะ: "ผลกำไร สิ่งที่ได้มาโดยไม่คาดหมาย ความสำเร็จ",
  วินาศ: "ความสูญเสีย รายจ่ายแฝง การพักผ่อน/ปิดวงจร",
};

export const HOUSE_VALENCE: Record<string, number> = {
  ตนุ: 1, กดุมภะ: 0, สหัชชะ: 0, พันธุ: 1, ปุตตะ: 1, อริ: -1,
  ปัตนิ: 0, มรณะ: -1, ศุภะ: 1, กัมมะ: 1, ลาภะ: 1, วินาศ: -1,
};

export function getHouseOfSign(lagnaSign: string, targetSign: string): string {
  const lagnaIdx = ZODIAC_ORDER.indexOf(lagnaSign);
  const targetIdx = ZODIAC_ORDER.indexOf(targetSign);
  const houseOffset = pymod(targetIdx - lagnaIdx, 12);
  return HOUSE_NAMES[houseOffset];
}

interface DateOnly {
  year: number;
  month: number;
  day: number;
}

export interface MonthlyResult {
  lagna_sign: string;
  sun_sign_this_month: string;
  house: string;
  month_theme: string;
  valence: number;
}

export function monthlyPrediction(lagnaSign: string, onDate: DateOnly): MonthlyResult {
  const ms = Date.UTC(onDate.year, onDate.month - 1, onDate.day, 12, 0, 0);
  const jd = julianDay(ms);
  const sunLon = solarEclipticLongitude(jd);
  // ส่ง jd → ได้ราศีนิรายนะ (ไทย) ไม่ใช่สายนะ (ตะวันตก) — ดู getZodiacSign()
  const [sunSign] = getZodiacSign(sunLon, jd);
  const house = getHouseOfSign(lagnaSign, sunSign);
  return {
    lagna_sign: lagnaSign,
    sun_sign_this_month: sunSign,
    house,
    month_theme: HOUSE_THEME[house],
    valence: HOUSE_VALENCE[house],
  };
}

function meanPlanetLongitude(jd: number, L0: number, nPerDay: number): number {
  const days = jd - 2451545.0;
  return pymod(L0 + nPerDay * days, 360);
}

export function jupiterLongitude(jd: number): number {
  return meanPlanetLongitude(jd, 34.35, 360.0 / 4332.59);
}
export function saturnLongitude(jd: number): number {
  return meanPlanetLongitude(jd, 50.08, 360.0 / 10759.22);
}

function wholeSignRelation(lagnaSign: string, planetSign: string): string {
  const lagnaIdx = ZODIAC_ORDER.indexOf(lagnaSign);
  const planetIdx = ZODIAC_ORDER.indexOf(planetSign);
  const dist = pymod(planetIdx - lagnaIdx, 12);
  if (dist === 0) return "ทับลัคนา";
  if (dist === 4 || dist === 8) return "ตรีโกณลัคนา";
  if (dist === 6) return "เล็งลัคนา";
  return "ไม่มีมุมพิเศษ";
}

export interface YearlyResult {
  lagna_sign: string;
  jupiter_sign: string;
  jupiter_relation: string;
  saturn_sign: string;
  saturn_relation: string;
  year_grade: string;
  year_label: string;
  caveat: string;
}

export function yearlyPrediction(lagnaSign: string, onDate: DateOnly): YearlyResult {
  const ms = Date.UTC(onDate.year, onDate.month - 1, onDate.day, 12, 0, 0);
  const jd = julianDay(ms);

  // ส่ง jd → ราศีนิรายนะ (ไทย)
  const [jupSign] = getZodiacSign(jupiterLongitude(jd), jd);
  const [satSign] = getZodiacSign(saturnLongitude(jd), jd);

  const jupRelation = wholeSignRelation(lagnaSign, jupSign);
  const satRelation = wholeSignRelation(lagnaSign, satSign);

  let grade = "B";
  let label = "ปีปกติ";
  if (satRelation === "เล็งลัคนา") {
    grade = "D";
    label = "ปีชง / ปีเงา — ควรระมัดระวังเป็นพิเศษ";
  } else if (jupRelation === "ทับลัคนา" || jupRelation === "ตรีโกณลัคนา") {
    grade = "A";
    label = "ปีทอง — โอกาสเปิดกว้าง";
  } else if (satRelation === "ทับลัคนา") {
    grade = "C";
    label = "ปีหนัก — ต้องใช้ความอดทนและวินัย";
  }

  return {
    lagna_sign: lagnaSign,
    jupiter_sign: jupSign,
    jupiter_relation: jupRelation,
    saturn_sign: satSign,
    saturn_relation: satRelation,
    year_grade: grade,
    year_label: label,
    caveat:
      "ตำแหน่งพฤหัส/เสาร์ใช้ค่าเฉลี่ยวงโคจร (mean motion) ไม่ใช่ตำแหน่งจริงที่ปรับรบกวนแล้ว — แม่นระดับราศี ไม่แม่นระดับองศา",
  };
}

const TAKSA_HOUSE_NAMES = ["บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี"];

export interface BirthdayResult {
  age: number;
  natal_planet: string;
  this_year_barivarn_planet: string;
  taksa_jr: Record<string, string>;
  sri_planet_this_year: string;
  kalakini_planet_this_year: string;
  note_age_element: string;
}

export function birthdayPrediction(
  birthDate: DateOnly,
  currentDate: DateOnly,
  birthDayOfWeek: string
): BirthdayResult | { error: string } {
  const birthPlanet = DAY_TO_PLANET[birthDayOfWeek];
  if (birthPlanet === undefined) {
    return { error: "unknown birth_day_of_week (Wednesday-night/Rahu births need explicit planet=8)" };
  }

  let age = currentDate.year - birthDate.year;
  // (month, day) tuple comparison เหมือน Python
  if (
    currentDate.month < birthDate.month ||
    (currentDate.month === birthDate.month && currentDate.day < birthDate.day)
  ) {
    age -= 1;
  }

  const natalIdx = TAKSA_FIXED_ORDER.indexOf(birthPlanet);
  const rotation = pymod(age, 8);
  const thisYearBarivarnIdx = (natalIdx + rotation) % 8;

  const taksaJrMap: Record<string, string> = {};
  TAKSA_HOUSE_NAMES.forEach((houseName, offset) => {
    const planet = TAKSA_FIXED_ORDER[(thisYearBarivarnIdx + offset) % 8];
    taksaJrMap[houseName] = PLANET_NAME_TH[planet];
  });

  return {
    age,
    natal_planet: PLANET_NAME_TH[birthPlanet],
    this_year_barivarn_planet: PLANET_NAME_TH[TAKSA_FIXED_ORDER[thisYearBarivarnIdx]],
    taksa_jr: taksaJrMap,
    sri_planet_this_year: taksaJrMap["ศรี"],
    kalakini_planet_this_year: taksaJrMap["กาลกิณี"],
    note_age_element:
      "Output 'Age_Element' จากสเปกเดิมไม่ชัดเจนว่าหมายถึงอะไรแน่ (ธาตุวันเกิด/ธาตุของบริวารจรปีนี้/อื่นๆ) — ยังไม่ implement เพราะไม่อยากเดาสูตรเอง รอตรวจสอบความหมายที่แน่ชัดก่อน",
  };
}
