/**
 * Preference Overlap — "ความชอบของคุณ ↔ แนวโน้มดวง" (โหมดเนื้อคู่ · 24 ส.ค. 2569 ผู้ใช้เคาะ)
 *
 * หลักการ: ความชอบเป็น "ข้อมูลของผู้ใช้" ไม่ใช่คำทำนาย — ระบบเทียบให้เห็นว่าทับซ้อนกับแนวโน้ม
 * ที่ดวงคำนวณแค่ไหน + เคมีธาตุของ "ทางที่ชอบ" (wuXingScore จริง) · ไม่มีการตัดสินว่าใครถูก
 * · แท็กเป็น preset enum เท่านั้น (ค่านอก enum ถูกเพิกเฉย — กติกา injection-safe เดิม)
 *
 * การจับคู่แท็ก↔ธาตุ/ดาว: อิงตาราง ค.1 นรลักษณ์ (ธาตุ→รูปร่าง/หน้า) + ลักษณะดาวในภพ 7
 * (PLANET_IN_7TH/ARENA ชุดที่วิจัยแล้ว) — เป็นการตีความเชิงจัดหมวด มี caveat กำกับ (ชั้นเสริม)
 */

import { wuXingScore, THAI_LABEL_5, type Element5 } from "./element";
import type { Graha } from "./jyotish";

export interface PrefTag {
  th: string;
  /** ธาตุ ค.1 ที่แท็กนี้ตรงกับ (สำหรับ body/face) */
  element?: Element5;
  /** ดาวที่ให้ลักษณะนี้เมื่ออยู่ฝั่งคู่ (สำหรับ persona/เสน่ห์) */
  grahas?: Graha[];
  /** วลีภาพ (อังกฤษ) — ป้อน prompt คอลลาจเมื่อผู้ใช้เลือกแท็กนี้ */
  promptEn: string;
}

export const BODY_PREF: Record<string, PrefTag> = {
  tall_lean: { th: "สูงโปร่ง เพรียว สุขภาพดี", element: "Wood", promptEn: "tall lean healthy graceful figure" },
  strong_fit: { th: "สมส่วน แข็งแรง", element: "Metal", promptEn: "well-proportioned athletic build" },
  soft_curvy: { th: "มีน้ำมีนวล", element: "Water", promptEn: "soft gently curvy figure" },
  solid_grounded: { th: "แน่นแข็งแรง มั่นคง", element: "Earth", promptEn: "solid sturdy dependable build" },
  broad_slim: { th: "ไหล่กว้าง เอวเล็ก", element: "Fire", promptEn: "broad shoulders with a slim waist" },
};

export const FACE_PREF: Record<string, PrefTag> = {
  long_defined: { th: "หน้ายาว โครงชัด กรามมีเหลี่ยม จมูกได้รูป", element: "Wood", promptEn: "long defined face with clear angular jawline and shapely nose" },
  oval_bright: { th: "รูปไข่ หน้าผากกว้าง", element: "Fire", promptEn: "oval face with broad high forehead" },
  round_gentle: { th: "กลม อ่อนโยน", element: "Water", promptEn: "soft round gentle face" },
  square_full: { th: "เหลี่ยมเต็ม โครงแน่น", element: "Earth", promptEn: "strong square full face" },
  balanced_refined: { th: "สมดุล คมละมุน", element: "Metal", promptEn: "balanced refined softly angular face" },
};

export const PERSONA_PREF: Record<string, PrefTag> = {
  calm_mature: { th: "ใจเย็น เป็นผู้ใหญ่ ทัศนคติดี", grahas: ["jupiter", "saturn"], promptEn: "calm composed mature aura" },
  deep_charming: { th: "ดวงตา/เสน่ห์ลึกล้ำ", grahas: ["rahu", "venus"], element: "Water", promptEn: "deep captivating expressive eyes" },
  confident_poised: { th: "มั่นใจ วางตัวดี", grahas: ["sun", "jupiter"], promptEn: "confident poised presence" },
  modern_simple: { th: "ทันสมัยแต่เรียบง่าย", grahas: ["mercury", "rahu"], promptEn: "modern minimal effortless style" },
  warm_caring: { th: "อบอุ่น ดูแลเก่ง", grahas: ["moon"], element: "Water", promptEn: "warm nurturing gentle expression" },
};

export const PREFERENCE_CAVEAT =
  "ความชอบเป็นข้อมูลของคุณ ไม่ใช่คำทำนาย — ระบบเทียบให้เห็นว่าทับซ้อนกับแนวโน้มดวงแค่ไหน " +
  "และทางที่คุณชอบมีเคมีธาตุกับดวงคุณเท่าไร (ไม่มีใครถูกหรือผิด) · การจับคู่แท็ก↔ธาตุ/ดาว " +
  "ตีความจากตาราง ค.1 และลักษณะดาว (ชั้นเสริม)";

export interface PrefOverlapItem {
  tagTh: string;
  /** ชั้นของดวงที่ชี้ตรงกับแท็กนี้ — ว่าง = เป็น "จุดต่าง" */
  matchedByTh: string[];
  /** เคมีธาตุของทางที่ชอบ (เมื่อแท็กผูกธาตุ) — จาก wuXingScore จริง */
  chemistryTh: string | null;
}

export interface PreferenceOverlap {
  items: PrefOverlapItem[];
  matched: number;
  total: number;
  summaryTh: string;
  /** วลีภาพจากแท็กที่เลือก (ป้อน prompt คอลลาจ — enum เท่านั้น) */
  promptEn: string[];
  caveats: string[];
}

export interface ChartTraitSources {
  /** ธาตุของคู่จากดวง (ราศีปัตนิ/อันดับ 1) */
  partnerElement: Element5;
  /** ดาวเจ้าเรือนภพ 7 (ระบบคลาสสิก) — null เมื่อไม่มีชั้นลัคนา */
  seventhLord?: Graha | null;
  /** ดาวในภพ 7 */
  planetsIn7th?: Graha[];
  /** Darakaraka */
  darakaraka?: Graha | null;
  userDominant: Element5;
  userMissing: Element5[];
}

const GRAHA_TH_SHORT: Record<Graha, string> = {
  sun: "อาทิตย์", moon: "จันทร์", mars: "อังคาร", mercury: "พุธ", jupiter: "พฤหัส",
  venus: "ศุกร์", saturn: "เสาร์", rahu: "ราหู", ketu: "เกตุ",
};

function chemistryNote(el: Element5, src: ChartTraitSources): string {
  const sc = wuXingScore(src.userDominant, el, src.userMissing);
  return `ทางที่ชอบ = ธาตุ${THAI_LABEL_5[el]} เคมีกับดวงคุณ ${sc.final_score >= 0 ? "+" : ""}${sc.final_score} (${sc.relation_th})`;
}

function matchTag(tag: PrefTag, src: ChartTraitSources): PrefOverlapItem {
  const matchedByTh: string[] = [];
  if (tag.element && tag.element === src.partnerElement) {
    matchedByTh.push(`นรลักษณ์ธาตุคู่ (${THAI_LABEL_5[tag.element]}) ตาราง ค.1`);
  }
  if (tag.grahas) {
    for (const g of tag.grahas) {
      if (src.seventhLord === g) matchedByTh.push(`ดาวเจ้าเรือนภพ 7 (${GRAHA_TH_SHORT[g]})`);
      if (src.planetsIn7th?.includes(g)) matchedByTh.push(`ดาวในภพ 7 (${GRAHA_TH_SHORT[g]})`);
      if (src.darakaraka === g) matchedByTh.push(`Darakaraka (${GRAHA_TH_SHORT[g]})`);
    }
  }
  return {
    tagTh: tag.th,
    matchedByTh,
    chemistryTh: tag.element ? chemistryNote(tag.element, src) : null,
  };
}

/** เทียบความชอบ (enum keys — ค่านอก enum ถูกเพิกเฉย) กับชั้นที่ดวงคำนวณ */
export function preferenceOverlap(
  prefs: { body?: string | null; face?: string | null; persona?: readonly string[] | null },
  src: ChartTraitSources
): PreferenceOverlap | null {
  const items: PrefOverlapItem[] = [];
  const promptEn: string[] = [];
  const pick = (table: Record<string, PrefTag>, key: string | null | undefined) => {
    if (!key || !(key in table)) return null;
    return table[key];
  };
  const body = pick(BODY_PREF, prefs.body);
  const face = pick(FACE_PREF, prefs.face);
  const personas = (prefs.persona ?? []).map((k) => pick(PERSONA_PREF, k)).filter((x): x is PrefTag => x !== null).slice(0, 2);
  for (const tag of [body, face, ...personas]) {
    if (!tag) continue;
    items.push(matchTag(tag, src));
    promptEn.push(tag.promptEn);
  }
  if (items.length === 0) return null;
  const matched = items.filter((i) => i.matchedByTh.length > 0).length;
  const diff = items.filter((i) => i.matchedByTh.length === 0);
  const summaryTh =
    `ความชอบของคุณตรงกับแนวโน้มดวง ${matched}/${items.length} ข้อ` +
    (diff.length
      ? ` · จุดต่าง: ${diff.map((d) => d.tagTh).join(" / ")} — ไม่ใช่ความขัดแย้ง (ความชอบคือสิทธิ์ของคุณ ดวงคือแนวโน้ม)`
      : " — สองมุมพูดเรื่องเดียวกัน");
  return { items, matched, total: items.length, summaryTh, promptEn, caveats: [PREFERENCE_CAVEAT] };
}
