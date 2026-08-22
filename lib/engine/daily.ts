// พอร์ตจาก legacy-python-engines/daily_prediction_engine.py (Logic 8, CLAUDE.md §6)
// L1(30%):L3(70%) — มุมระหว่างจันทร์จร กับ ลัคนากำเนิด + กาลกิณี (ทักษาปกรณ์)
//
// ⚠️ กาลกิณีของราหู (เกิดวันศุกร์) ตรวจไม่ได้ (ราหูไม่มีเรือนคงที่, CLAUDE.md §5)

import { lahiriAyanamsa } from "./ascendant";
import { ZODIAC_ORDER, julianDay } from "./lagna";

const pymod = (a: number, n: number) => ((a % n) + n) % n;
const rad = (d: number) => (d * Math.PI) / 180;

export const MOON_SIGN_THAI = ZODIAC_ORDER;

// ลำดับทักษาคงที่ (ไม่ใช่ลำดับวัน) — 1=อาทิตย์ 2=จันทร์ 3=อังคาร 4=พุธ 7=เสาร์ 5=พฤหัส 8=ราหู 6=ศุกร์
const TAKSA_FIXED_ORDER = [1, 2, 3, 4, 7, 5, 8, 6];

const PLANET_NAME_TH: Record<number, string> = {
  1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ",
  5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู",
};

const DAY_TO_PLANET: Record<string, number> = {
  อาทิตย์: 1, จันทร์: 2, อังคาร: 3, พุธ: 4, พฤหัสบดี: 5, ศุกร์: 6, เสาร์: 7,
};

const PLANET_RULED_SIGNS: Record<number, string[]> = {
  1: ["สิงห์"], 2: ["กรกฎ"], 3: ["เมษ", "พิจิก"], 4: ["มิถุน", "กันย์"],
  5: ["ธนู", "มีน"], 6: ["พฤษภ", "ตุลย์"], 7: ["มังกร", "กุมภ์"],
  8: [], // ราหูไม่มีเรือนคงที่
};

export function getKalakiniPlanet(dayOfWeekOrPlanet: string | number): number | null {
  let birthPlanet: number | undefined;
  if (typeof dayOfWeekOrPlanet === "string") {
    birthPlanet = DAY_TO_PLANET[dayOfWeekOrPlanet];
    if (birthPlanet === undefined) return null;
  } else {
    birthPlanet = dayOfWeekOrPlanet;
  }
  const idx = TAKSA_FIXED_ORDER.indexOf(birthPlanet);
  return TAKSA_FIXED_ORDER[(idx + 7) % 8];
}

/**
 * เรือนของดาวกาลกิณีตามวันเกิด (TS-only wrapper — ไม่แตะสูตร golden parity ใดๆ)
 * ใช้โดย /timing ตรวจ "จันทร์จรเข้าเรือนกาลกิณี" รายวัน · signs=[] = ราหู (เกิดวันศุกร์
 * ตรวจไม่ได้ตามข้อจำกัดเดิม §5) · null = วันเกิดไม่รู้จัก
 */
export function kalakiniRuledSigns(birthDayOfWeek: string): { planetTh: string; signs: string[] } | null {
  const planet = getKalakiniPlanet(birthDayOfWeek);
  if (planet === null) return null;
  return { planetTh: PLANET_NAME_TH[planet], signs: PLANET_RULED_SIGNS[planet] ?? [] };
}

export function moonEclipticLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;

  const Lp = pymod(218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2, 360);
  const D = pymod(297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2, 360);
  const M = pymod(357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2, 360);
  const Mp = pymod(134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2, 360);
  const F = pymod(93.272095 + 483202.0175233 * T - 0.0036539 * T ** 2, 360);

  const Dr = rad(D), Mr = rad(M), Mpr = rad(Mp), Fr = rad(F);

  const dL =
    6.288774 * Math.sin(Mpr) +
    1.274027 * Math.sin(2 * Dr - Mpr) +
    0.658314 * Math.sin(2 * Dr) +
    0.213618 * Math.sin(2 * Mpr) -
    0.185116 * Math.sin(Mr) -
    0.114332 * Math.sin(2 * Fr) +
    0.058793 * Math.sin(2 * Dr - 2 * Mpr) +
    0.057066 * Math.sin(2 * Dr - Mr - Mpr) +
    0.053322 * Math.sin(2 * Dr + Mpr) +
    0.045758 * Math.sin(2 * Dr - Mr) -
    0.040923 * Math.sin(Mr - Mpr) -
    0.03472 * Math.sin(Dr) -
    0.030383 * Math.sin(Mr + Mpr) +
    0.015327 * Math.sin(2 * Dr - 2 * Fr) -
    0.012528 * Math.sin(Mpr + 2 * Fr);

  return pymod(Lp + dL, 360);
}

export function getMoonSign(dtUtc: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }): string {
  const ms = Date.UTC(dtUtc.year, dtUtc.month - 1, dtUtc.day, dtUtc.hour ?? 0, dtUtc.minute ?? 0, dtUtc.second ?? 0);
  const jd = julianDay(ms);
  // ลบอายนางศะ → ราศีนิรายนะ (ไทย) ให้สอดคล้องกับลัคนาและราศีอาทิตย์
  const lon = pymod(moonEclipticLongitude(jd) - lahiriAyanamsa(jd), 360);
  const idx = Math.floor(lon / 30);
  return MOON_SIGN_THAI[idx];
}

const ASPECT_RULES: Record<number, { name: string; score: number }> = {
  0: { name: "ทับ (Conjunct)", score: 1 },
  4: { name: "ตรีโกณ (Trine)", score: 3 },
  8: { name: "ตรีโกณ (Trine)", score: 3 },
  6: { name: "เล็ง (Opposition)", score: -2 },
};

export interface KalakiniResult {
  triggered: boolean | null;
  planet?: string;
  ruled_signs?: string[];
  note?: string;
}

export interface DailyPredictionResult {
  lagna_sign: string;
  moon_sign_today: string;
  sign_distance: number;
  aspect: string;
  kalakini: KalakiniResult | null;
  daily_luck_score: number;
}

export function dailyPrediction(
  lagnaSign: string,
  moonSign: string,
  birthDayOfWeek?: string | null
): DailyPredictionResult {
  const lagnaIdx = ZODIAC_ORDER.indexOf(lagnaSign);
  const moonIdx = ZODIAC_ORDER.indexOf(moonSign);
  const distance = pymod(moonIdx - lagnaIdx, 12);

  const aspect = ASPECT_RULES[distance];
  const baseline = 5;
  let aspectName: string;
  let aspectScore: number;
  if (aspect) {
    aspectName = aspect.name;
    aspectScore = aspect.score;
  } else {
    aspectName = "กลาง (ไม่มีมุมพิเศษ)";
    aspectScore = 0;
  }

  let totalScore = baseline + aspectScore;

  let kalakiniResult: KalakiniResult | null = null;
  if (birthDayOfWeek) {
    const kalakiniPlanet = getKalakiniPlanet(birthDayOfWeek);
    if (kalakiniPlanet !== null) {
      const ruledSigns = PLANET_RULED_SIGNS[kalakiniPlanet] ?? [];
      if (ruledSigns.length === 0) {
        kalakiniResult = {
          triggered: null,
          planet: PLANET_NAME_TH[kalakiniPlanet],
          note: "ราหูไม่มีเรือนคงที่ตามหลักดั้งเดิม — ตรวจสอบไม่ได้",
        };
      } else {
        const hit = ruledSigns.includes(moonSign);
        kalakiniResult = {
          triggered: hit,
          planet: PLANET_NAME_TH[kalakiniPlanet],
          ruled_signs: ruledSigns,
        };
        if (hit) totalScore -= 3;
      }
    } else {
      kalakiniResult = { triggered: null, note: "ไม่ทราบวันเกิด — ข้ามการตรวจกาลกิณี" };
    }
  }

  const dailyLuckScore = Math.max(0, Math.min(10, totalScore));

  return {
    lagna_sign: lagnaSign,
    moon_sign_today: moonSign,
    sign_distance: distance,
    aspect: aspectName,
    kalakini: kalakiniResult,
    daily_luck_score: dailyLuckScore,
  };
}
