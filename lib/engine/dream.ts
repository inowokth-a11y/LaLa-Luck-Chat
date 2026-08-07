// พอร์ตจาก legacy-python-engines/dream_interpretation_engine.py (Logic 4, CLAUDE.md §6)
// Safety Gate อยู่หน้าสุดเสมอ (ตรงกับ Platform D) — ห้ามข้าม (CLAUDE.md §6)
//
// หมายเหตุ:
//  - ฟังก์ชัน IO เดิม (log_dream_occurrence / enrich_via_ai1_demo / _load/_save) กลายเป็น
//    Supabase ops ในโปรดักชัน — ที่นี่ port เฉพาะตรรกะ pure โดย recurring รับ log เป็น argument
//  - matching ยังเป็น substring (ตรงกับ Python เพื่อ parity) — การย้ายไป Postgres FTS
//    (search_vector/pg_trgm, schema พร้อมใน migration 011) เป็นงาน DB-integration แยก (CLAUDE.md §8)

import { DAY_ELEMENT, THAI_LABEL_4, safetyGate, type Element4 } from "./element";
import { findSymbolMatchesSegmented, findThemeMatchesSegmented } from "./dream-match";
import { getWellnessPair } from "./wellness";
import { parseSymbolNumbers } from "./dream-energy";
import dreamDbData from "../../data/dream_master_db.json";
import dreamPsychData from "../../data/dream_psychology_50.json";

export interface DreamSymbol {
  category: string;
  dream_object: string;
  chinese_char: string;
  kangxi_strokes: number | null;
  element: string;
  meaning_keyword: string;
  /** ความหมายจากรูปทรง/ลักษณะของสัญลักษณ์ (มากับฐาน v3 — เฉพาะหมวดสัตว์บก 30 รายการ) */
  shape_meaning?: string;
  /**
   * 🔴 ฐาน v3 มีคอลัมน์นี้ ("เด่น 08-80 · วิ่ง 0 8") แต่ **ระบบจงใจไม่แสดงผลให้ผู้ใช้เห็น**
   * เพราะเป็นภาษาใบ้หวยตรงๆ ซึ่งขัดกับ guardrail ที่ปฏิเสธคำถามเรื่องหวยอยู่แล้ว —
   * ถ้าดักไม่ให้ถามแต่กลับยื่นเลขให้เอง = ขัดกันเอง · เก็บไว้ในข้อมูลเพื่อความครบถ้วนเท่านั้น
   * (ผู้ใช้ต้องตัดสินก่อนถ้าจะเปิดใช้ — ดู CLAUDE.md)
   */
  lucky_number?: string;
}
export interface DreamTheme {
  dream_theme: string;
  psychological_meaning: string;
  subconscious_trigger: string;
  advice_psych: string;
  element_connection: string;
  element_remedy: string;
  personalized_note?: string;
}

const DREAM_DB = dreamDbData as DreamSymbol[];

/**
 * สัญลักษณ์ที่ "ตำราแก้เคล็ด" (Unified_Kaekled_DB) มีข้อมูลครบ แต่ฐานสัญลักษณ์หลักไม่มีเลย
 * — พบตอนเปิดไฟล์ตำราแก้เคล็ดครั้งแรก (เฟส 2, 7 ส.ค. 2569): ฐานความฝันไม่มี "งู" เดี่ยวๆ
 *   (มีแต่พญานาค/มังกร) และไม่มี "ไฟไหม้" ทั้งที่เป็นสองเรื่องที่คนไทยฝันและค้นหามากที่สุด
 *
 * ตัวเลข/ความหมายทุกช่องคัดตรงจากตำราแก้เคล็ด ไม่ได้แต่งขึ้น · อักษรจีนเติมจากจำนวนขีดที่
 * ตรงกันพอดี (蛇 = 11 ขีด · 火 = 4 ขีด ตรงกับที่ตำราระบุ) จึงเป็นการยืนยันข้ามกัน ไม่ใช่การเดา
 *
 * ⚠️ ใช้เฉพาะเส้น production (useSegmentation = true) — เส้นเทียบ Python คงฐานเดิมเป๊ะ
 */
const KAEKLED_SUPPLEMENT: DreamSymbol[] = [
  {
    category: "สัตว์ร้าย",
    dream_object: "งู / พญานาค",
    chinese_char: "蛇",
    kangxi_strokes: 11,
    element: "ไฟ", // ตำราระบุ "ไฟ / ดิน" — ใช้ธาตุแรกเป็นหลักตามที่ตำราใช้หาธาตุเชื่อม
    meaning_keyword: "เนื้อคู่, พลังทางเพศ, ศัตรู, การเปลี่ยนแปลง",
  },
  {
    category: "ภัยพิบัติ",
    dream_object: "ไฟไหม้",
    chinese_char: "火",
    kangxi_strokes: 4,
    element: "ไฟ",
    meaning_keyword: "ความโกรธ, การเปลี่ยนแปลงฉับพลัน, การเผาผลาญสิ่งเก่า, ข่าวร้อน",
  },
];

/** ฐานที่ production ใช้จริง (ฐานหลัก + สัญลักษณ์จากตำราแก้เคล็ดที่ฐานหลักไม่มี) */
export const PRODUCTION_DREAM_DB: DreamSymbol[] = [...DREAM_DB, ...KAEKLED_SUPPLEMENT];
const DREAM_PSYCH = dreamPsychData as DreamTheme[];

const RECURRING_THRESHOLD_PER_MONTH = 3;
const RECURRING_CONSECUTIVE_MONTHS = 2;

const ELEMENT_WORD_TO_KEY: Record<string, string> = { ไฟ: "Fire", ดิน: "Earth", ลม: "Wood", น้ำ: "Water" };

export function variants(text: string): string[] {
  return text
    .split(/[/,]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function findSymbolMatches(dreamText: string): DreamSymbol[] {
  const matches: DreamSymbol[] = [];
  for (const row of DREAM_DB) {
    for (const variant of variants(row.dream_object)) {
      if (variant && dreamText.includes(variant)) {
        matches.push(row);
        break;
      }
    }
  }
  return matches;
}

export function findThemeMatches(dreamText: string): DreamTheme[] {
  const matches: DreamTheme[] = [];
  for (const row of DREAM_PSYCH) {
    for (const variant of variants(row.dream_theme)) {
      if (variant && (dreamText.includes(variant) || variant.includes(dreamText))) {
        matches.push(row);
        break;
      }
    }
  }
  return matches;
}

export function parseElementFromConnection(elementConnection: string): string | null {
  for (const [word, key] of Object.entries(ELEMENT_WORD_TO_KEY)) {
    if (elementConnection.startsWith(word)) return key;
  }
  return null;
}

export function contextSynthesis(dayOfWeekTh: string, matchedElements: string[]): string {
  const dayEl = DAY_ELEMENT[dayOfWeekTh];
  if (!dayEl || matchedElements.length === 0) return "";
  const dayElTh = THAI_LABEL_4[dayEl as Element4] ?? dayEl;
  const unique = new Set(matchedElements);
  if (unique.has(dayElTh)) {
    return `สัญลักษณ์ที่ฝันมีธาตุตรงกับธาตุประจำวัน${dayOfWeekTh} (${dayElTh}) — พลังงานนี้กำลังเข้มข้นเป็นพิเศษในช่วงนี้`;
  }
  return `วันที่ฝัน (${dayOfWeekTh}, ธาตุ${dayElTh}) เป็นคนละธาตุกับสัญลักษณ์ที่ฝันเห็น — อาจสื่อถึงความรู้สึกที่ขัดกับจังหวะชีวิตตอนนี้อยู่บ้าง`;
}

// ---- Dream Recurring (รับ log เป็น argument — โปรดักชัน query จาก dream_occurrence_log ใน Supabase) ----
export interface DreamLogEntry {
  user_id: string;
  theme: string;
  year_month: string; // "YYYY-MM"
  count: number;
}

export interface RecurringCheck {
  theme: string;
  qualifying_months: string[];
  is_recurring: boolean;
}

export function checkDreamRecurring(log: DreamLogEntry[], userId: string, theme: string): RecurringCheck {
  const entries = log
    .filter((e) => e.user_id === userId && e.theme === theme)
    .sort((a, b) => (a.year_month < b.year_month ? -1 : a.year_month > b.year_month ? 1 : 0));
  const qualifyingMonths = entries.filter((e) => e.count >= RECURRING_THRESHOLD_PER_MONTH).map((e) => e.year_month);

  let isRecurring = false;
  if (qualifyingMonths.length >= RECURRING_CONSECUTIVE_MONTHS) {
    const sorted = [...qualifyingMonths].sort();
    const lastTwo = sorted.slice(-2);
    const [y1, m1] = lastTwo[0].split("-").map((x) => parseInt(x, 10));
    const [y2, m2] = lastTwo[1].split("-").map((x) => parseInt(x, 10));
    isRecurring = y2 * 12 + m2 - (y1 * 12 + m1) === 1;
  }

  return { theme, qualifying_months: qualifyingMonths, is_recurring: isRecurring };
}

export function getRecurringThemeSuggestion(log: DreamLogEntry[], userId: string, theme: string): Record<string, unknown> {
  const check = checkDreamRecurring(log, userId, theme);
  if (!check.is_recurring) {
    return { triggered: false, ...check };
  }

  const themeRow = DREAM_PSYCH.find((t) => t.dream_theme.includes(theme) || theme.includes(t.dream_theme));
  if (!themeRow) {
    return { triggered: true, error: "พบว่าธีมนี้ซ้ำ แต่ไม่พบข้อมูล element_connection ของธีมนี้", ...check };
  }

  const element = parseElementFromConnection(themeRow.element_connection ?? "");
  if (!element) {
    return { triggered: true, error: "แปลง element_connection ไม่สำเร็จ", ...check };
  }

  return {
    triggered: true,
    // theme มาจาก ...check (ค่าเดียวกัน) — ไม่ระบุซ้ำเพื่อเลี่ยง key ซ้ำ
    message: `ช่วงนี้ธีม '${theme}' visit คุณบ่อยเป็นพิเศษ (≥${RECURRING_THRESHOLD_PER_MONTH} ครั้ง/เดือน ติดกัน ${RECURRING_CONSECUTIVE_MONTHS} เดือน) ลองกิจกรรมนี้ดูไหมคะ`,
    suggested_wellness: getWellnessPair(element),
    ...check,
  };
}

export function getAi1SystemPrompt(): string {
  const fewShot = DREAM_DB.slice(0, 8)
    .map((r) => `- "${r.dream_object}" -> element: ${r.element} (เหตุผลเชิงความหมาย: ${r.meaning_keyword})`)
    .join("\n");
  return `คุณคือ AI ตัวแรกในระบบทำนายฝัน 2 ชั้น หน้าที่ของคุณคือ "ค้นคว้าและตัดสินธาตุ" ให้กับ
สัญลักษณ์ความฝันที่ไม่มีอยู่ในฐานข้อมูล 487 รายการ

⚠️ กฎสำคัญที่สุด: ห้ามคำนวณธาตุจากการนับขีดตัวอักษรจีนเด็ดขาด — ตรวจสอบเชิงสถิติแล้วว่า
ฐานข้อมูลจริง 487 แถวไม่ได้ใช้วิธีนั้น (ทดสอบสูตรนับขีดทั้ง 2 สำนักได้แค่ ~20% ตรงกัน
ซึ่งเท่ากับสุ่มเดา) ฐานข้อมูลจริงตัดสินธาตุจาก "ความหมายเชิงสัญลักษณ์" ของคำ

ตัวอย่างจากฐานข้อมูลจริง (ใช้เป็นแนวทางการให้เหตุผล):
${fewShot}

ขั้นตอนของคุณ:
1. web_search หาความหมาย/บริบทวัฒนธรรมของคำที่ฝันเห็น (ทั้งจากมุมมองไทยและจีนถ้ามี)
2. ตัดสินธาตุ (ไม้/ไฟ/ดิน/ทอง/น้ำ) จากความหมายเชิงสัญลักษณ์ ไม่ใช่การคำนวณ
3. ถ้ามีคำแปลจีนธรรมชาติ ให้ระบุ chinese_char + kangxi_strokes ไว้เป็นข้อมูลอ้างอิง
   (ไม่ใช่ที่มาของธาตุ) — ถ้าไม่มีคำแปลจีนที่เป็นธรรมชาติ ปล่อยว่างได้ ไม่ต้องเดา
4. เขียน meaning_keyword สั้นๆ (สไตล์เดียวกับตัวอย่าง)
5. ส่งออกเป็น JSON schema เดียวกับฐานข้อมูลเดิม: category, dream_object,
   chinese_char, kangxi_strokes, element, meaning_keyword

ผลลัพธ์ของคุณจะถูกส่งต่อให้ "AI ตัวหลัก" ไปสร้างคำทำนายให้ผู้ใช้ และจะถูกบันทึกไว้เป็น
"pending discovery" รอมนุษย์ตรวจสอบก่อนรวมเข้าฐานข้อมูลจริง`;
}

export interface InterpretDreamResult {
  dream_text: string;
  intercepted?: boolean;
  matched_keywords?: string[];
  crisis_resource_message?: string;
  symbol_matches?: Array<{
    object: string;
    element: string;
    meaning: string;
    kangxi_strokes: number | null;
    chinese_char: string;
    /** เลขที่ตำราผูกกับสัญลักษณ์ — parse เป็นตัวเลขล้วนแล้ว (ไม่ส่งศัพท์ใบ้หวยออกจาก engine) */
    numbers?: { คู่: string[]; หลักเดี่ยว: string[] } | null;
    shape_meaning?: string;
  }>;
  theme_matches?: Array<{ theme: string; psychological_meaning: string; subconscious_trigger: string; advice: string; element_connection: string; remedy: string }>;
  context_synthesis?: string;
  found_anything?: boolean;
  fallback_note?: string;
  note?: string;
}

/**
 * @param useSegmentation จับคู่โดยรู้ขอบเขตคำไทย (แก้ปัญหา over-match เช่น "ข้าม" ใน "เข้ามา")
 *   - `false` (ค่าเริ่มต้น) = substring แบบเดิม **คงไว้เพื่อให้ golden test เทียบกับ Python ได้**
 *   - `true` = โหมดที่ production ใช้ (ดูเหตุผลและหลักฐานใน lib/engine/dream-match.ts)
 *   ถ้า runtime ตัดคำไทยไม่ได้ จะ fallback กลับเป็น substring อัตโนมัติ
 */
export function interpretDream(
  dreamText: string,
  dayOfWeekTh?: string | null,
  wantDeepReading = false,
  useSegmentation = false
): InterpretDreamResult {
  // Safety gate FIRST — ห้ามมีข้อยกเว้น
  const gate = safetyGate(dreamText);
  if (gate) {
    return { dream_text: dreamText, intercepted: true, matched_keywords: gate.matched_keywords, crisis_resource_message: gate.crisis_resource_message };
  }

  const symbolMatches =
    (useSegmentation ? findSymbolMatchesSegmented(dreamText, PRODUCTION_DREAM_DB) : null) ?? findSymbolMatches(dreamText);
  const themeMatches =
    (useSegmentation ? findThemeMatchesSegmented(dreamText, DREAM_PSYCH) : null) ?? findThemeMatches(dreamText);

  const elementsFound: string[] = symbolMatches.map((m) => m.element);
  for (const m of themeMatches) {
    if (m.element_connection) {
      elementsFound.push(m.element_connection.split("(")[0].split("—")[0].trim());
    }
  }

  const result: InterpretDreamResult = {
    dream_text: dreamText,
    symbol_matches: symbolMatches.map((m) => ({
      object: m.dream_object, element: m.element, meaning: m.meaning_keyword,
      kangxi_strokes: m.kangxi_strokes, chinese_char: m.chinese_char,
      numbers: parseSymbolNumbers(m.lucky_number),
      ...(m.shape_meaning ? { shape_meaning: m.shape_meaning } : {}),
    })),
    theme_matches: themeMatches.map((m) => ({
      theme: m.dream_theme, psychological_meaning: m.psychological_meaning,
      subconscious_trigger: m.subconscious_trigger, advice: m.advice_psych,
      element_connection: m.element_connection, remedy: m.element_remedy,
    })),
    context_synthesis: dayOfWeekTh ? contextSynthesis(dayOfWeekTh, elementsFound) : "",
    found_anything: symbolMatches.length > 0 || themeMatches.length > 0,
  };

  if (!result.found_anything) {
    result.fallback_note =
      "ไม่พบสัญลักษณ์นี้ในฐานข้อมูล 487 สัญลักษณ์หรือ 50 ธีมจิตวิทยา — " +
      "ส่งต่อให้ AI-1 (ค้นเว็บ + ตัดสินธาตุเชิงความหมาย) ตาม get_ai1_system_prompt() " +
      "ผลลัพธ์จาก AI-1 จะถูกบันทึกใน dream_pending_discoveries.json รอตรวจสอบ " +
      "ก่อนรวมเข้าฐานข้อมูลจริง — ฟังก์ชันนี้เองไม่เรียก AI-1 อัตโนมัติ (ต้องเป็นการเรียก " +
      "API จริงในระบบ production) แต่ caller สามารถเรียก enrich_via_ai1_demo() " +
      "ด้วยผลลัพธ์จาก AI-1 เพื่อบันทึกและใช้ต่อได้ทันที";
  }

  if (!wantDeepReading) {
    result.note = "แสดงผลระดับหลักการเท่านั้น (ตามกฎ 'ไม่ฟันธง' ของ Logic 4) — พิมพ์ 'คำทำนายลึก' เพื่อขอสรุปเจาะจง";
  }

  return result;
}
