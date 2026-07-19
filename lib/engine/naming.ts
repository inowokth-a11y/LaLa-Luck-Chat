// พอร์ตจาก legacy-python-engines/naming_branding_engine.py (Logic 19, CLAUDE.md §6)
// คำนวณธาตุของชื่อ + aggregate + score + reverse-generate + logo prompt (ข้อความ ไม่มี image-gen)
//
// ⚠️ GROUP_TO_ELEMENT (9 กลุ่มอักษร → 5 ธาตุ) ออกแบบเอง ยังไม่ verify กับตำรา (CLAUDE.md §5)

import { wuXingScore, type Element5, type WuXingResult } from "./element";

const CHAR_GROUPS: Record<number, string> = {
  1: "กดถทภฤAJS", 2: "ขชบปงBKT", 3: "ฆตฑฒCLU", 4: "คธรญษDMV",
  5: "ฉณฌนมหฎฮฬENW", 6: "จลวอFOX", 7: "ซศสGPY", 8: "ยผฝพฟHQZ", 9: "ฏฐIR",
};

// สร้าง CHAR_TO_GROUP โดยไล่กลุ่ม 1→9 (ตัวหลังทับตัวหน้าถ้าซ้ำ) เหมือน dict comprehension ของ Python
const CHAR_TO_GROUP: Record<string, number> = {};
for (const g of Object.keys(CHAR_GROUPS).map(Number).sort((a, b) => a - b)) {
  for (const ch of CHAR_GROUPS[g]) CHAR_TO_GROUP[ch] = g;
}

const GROUP_TO_ELEMENT: Record<number, Element5> = {
  1: "Wood", 2: "Wood", 3: "Fire", 4: "Fire", 5: "Earth",
  6: "Earth", 7: "Metal", 8: "Metal", 9: "Water",
};

const LOGO_STYLE_BY_ELEMENT: Record<string, { shape: string; color: string; mood: string }> = {
  Wood: { shape: "โค้งอินทรีย์ กิ่งก้าน", color: "เขียว", mood: "เติบโต สดใหม่" },
  Fire: { shape: "เหลี่ยมแหลม พุ่งขึ้น", color: "แดงส้ม", mood: "กระตือรือร้น พลังงานสูง" },
  Earth: { shape: "สี่เหลี่ยมมั่นคง ฐานกว้าง", color: "น้ำตาลทอง", mood: "มั่นคง น่าเชื่อถือ" },
  Metal: { shape: "วงกลมมินิมอล เส้นคม", color: "เงิน/ขาว", mood: "แม่นยำ ทันสมัย" },
  Water: { shape: "คลื่นลื่นไหล ไร้เหลี่ยม", color: "น้ำเงิน", mood: "ยืดหยุ่น ลึกซึ้ง" },
};

/** most-common แบบ Python Counter: นับมากสุด, เสมอ → ตัวที่เจอก่อน (insertion order) */
function mostCommon<T>(items: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  let best: T | undefined;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

export function nameElement(name: string): Element5 | null {
  const groups: number[] = [];
  for (const ch of name.toUpperCase()) {
    if (ch in CHAR_TO_GROUP) groups.push(CHAR_TO_GROUP[ch]);
  }
  if (groups.length === 0) return null;
  const dominantGroup = mostCommon(groups)!;
  return GROUP_TO_ELEMENT[dominantGroup];
}

export function aggregateElement(founderElement: Element5, memberElements?: Element5[] | null): Element5 {
  if (!memberElements || memberElements.length === 0) return founderElement;
  const weighted: Element5[] = [
    ...Array(6).fill(founderElement),
    ...Array(4).fill(memberElements).flat(),
  ];
  return mostCommon(weighted)!;
}

export interface ScoreCandidateResult extends WuXingResult {
  name: string;
  name_element: Element5;
  target_element: Element5;
}
export interface ScoreCandidateError {
  name: string;
  element: null;
  error: string;
}

export function scoreCandidateName(
  name: string,
  targetElement: Element5,
  missingElements?: Element5[] | null
): ScoreCandidateResult | ScoreCandidateError {
  const el = nameElement(name);
  if (el === null) {
    return { name, element: null, error: "ไม่พบตัวอักษรที่จับคู่ธาตุได้" };
  }
  const result = wuXingScore(targetElement, el, missingElements ?? []);
  return { name, name_element: el, target_element: targetElement, ...result };
}

export function reverseGenerateCandidates(targetElement: Element5, syllablePool: string[]): string[] {
  const matchingGroups = Object.entries(GROUP_TO_ELEMENT)
    .filter(([, el]) => el === targetElement)
    .map(([g]) => Number(g));
  const matchingChars = new Set<string>();
  for (const g of matchingGroups) {
    for (const ch of CHAR_GROUPS[g]) matchingChars.add(ch);
  }
  return syllablePool.filter((syl) => syl && matchingChars.has(syl[0].toUpperCase()));
}

export function logoPromptText(element: string, brandName: string): string {
  const style = LOGO_STYLE_BY_ELEMENT[element];
  return (
    `minimalist flat vector logo mark for '${brandName}', ` +
    `${style.shape}, primary color ${style.color}, ` +
    `mood: ${style.mood}, clean geometric icon, no text, ` +
    `scalable simple icon suitable for app logo, white background`
  );
}
