// พอร์ตจาก legacy-python-engines/artifact_numerology_engine.py (Logic 2, CLAUDE.md §6)
// เลข 2 หลัก → การ์ด 00-99, เลข 3 หลัก → ตาราง 14 แถว (fallback รายหลัก), เบอร์โทร → เสริมเอง
//
// ⚠️ สูตรเบอร์โทร + 3-digit fallback ออกแบบเสริมเอง ไม่ verify จากต้นฉบับ (CLAUDE.md §5)
// การ์ด 00-99 ทำหน้าที่ archetype เท่านั้น ไม่ใช่ตัวกำหนดธาตุ (CLAUDE.md §4.3) — element มาจาก §5.4

import cardsData from "../../data/master_energy_00_99.json";
import threeDigitData from "../../data/master_energy_3_digits.json";

interface Card {
  id: string;
  name: string;
  essence: string;
  figure: string;
  img: string;
}
interface ThreeDigitRow {
  energy_id: number;
  energy_name: string;
  meaning: string;
  context_keywords?: string;
  note?: string;
}

const CARD_BY_ID: Record<string, Card> = Object.fromEntries(
  (cardsData as Card[]).map((c) => [c.id, c])
);
const THREE_DIGIT_BY_ID: Record<string, ThreeDigitRow> = Object.fromEntries(
  (threeDigitData as ThreeDigitRow[]).map((r) => [String(r.energy_id), r])
);

const DIGIT_ELEMENT_4: Record<number, string> = {
  1: "Fire", 2: "Earth", 3: "Wood", 4: "Water", 5: "Earth",
  6: "Water", 7: "Wood", 8: "Earth", 9: "Fire", 0: "Earth",
};

const pad = (n: number, width: number) => String(n).padStart(width, "0");
const sumDigits = (s: string) =>
  s.split("").reduce((a, c) => a + (c >= "0" && c <= "9" ? parseInt(c, 10) : 0), 0);

export function digitSumReduce(n: number, stopAt = 9): number {
  let x = Math.abs(n);
  while (x > stopAt) {
    x = sumDigits(String(x));
  }
  return x;
}

export function artifactElement(num: number): string {
  return DIGIT_ELEMENT_4[digitSumReduce(num)];
}

export interface Lookup2Digit {
  input: string;
  found: boolean;
  energy_name: string | null;
  essence: string | null;
  element: string;
}

export function lookup2digit(num: number): Lookup2Digit {
  const key = pad(num, 2);
  const card = CARD_BY_ID[key];
  return {
    input: key,
    found: card !== undefined,
    energy_name: card ? card.name : null,
    essence: card ? card.essence : null,
    element: artifactElement(num),
  };
}

export interface ThreeDigitFallback {
  input: string;
  found_in_table: false;
  digit_elements: { หลักร้อย: string; หลักสิบ: string; หลักหน่วย: string };
  overall_element: string;
  note: string;
}
export interface ThreeDigitHit {
  input: string;
  found_in_table: true;
  energy_name: string;
  meaning: string;
  context_keywords: string | null;
  note: string | null;
  overall_element: string;
}

export function analyze3digitFallback(num: number): ThreeDigitFallback {
  const digits = pad(num, 3).split("").map((d) => parseInt(d, 10));
  const elements = digits.map((d) => DIGIT_ELEMENT_4[d]);
  return {
    input: pad(num, 3),
    found_in_table: false,
    digit_elements: { หลักร้อย: elements[0], หลักสิบ: elements[1], หลักหน่วย: elements[2] },
    overall_element: artifactElement(num),
    note: "ไม่พบในฐาน 14 ตัวอย่าง — วิเคราะห์รายหลักแทน (fallback ที่เราออกแบบเอง ไม่ใช่สูตรต้นฉบับ)",
  };
}

export function lookup3digit(num: number): ThreeDigitHit | ThreeDigitFallback {
  const key = String(num);
  const row = THREE_DIGIT_BY_ID[key];
  if (row) {
    return {
      input: key,
      found_in_table: true,
      energy_name: row.energy_name,
      meaning: row.meaning,
      context_keywords: row.context_keywords ?? null,
      note: row.note ?? null,
      overall_element: artifactElement(num),
    };
  }
  return analyze3digitFallback(num);
}

export interface PhoneAnalysis {
  phone: string;
  last3digits_analysis: ThreeDigitHit | ThreeDigitFallback;
  whole_number_element: string;
  caveat: string;
}

export function analyzePhoneNumber(phone: string): PhoneAnalysis | { error: string } {
  const digitsOnly = phone.split("").filter((c) => c >= "0" && c <= "9").join("");
  if (digitsOnly.length < 3) {
    return { error: "เบอร์สั้นเกินไป ต้องมีอย่างน้อย 3 หลัก" };
  }
  const last3 = parseInt(digitsOnly.slice(-3), 10);
  const totalSum = sumDigits(digitsOnly);
  const overallReduced = digitSumReduce(totalSum);
  return {
    phone,
    last3digits_analysis: lookup3digit(last3),
    whole_number_element: DIGIT_ELEMENT_4[overallReduced],
    caveat: "วิธีนี้เป็นแนวทางเสริมที่ออกแบบเอง ไม่ใช่สูตรที่ verify จากเอกสารต้นฉบับ KRUTH",
  };
}
