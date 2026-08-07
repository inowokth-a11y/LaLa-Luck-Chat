// การจับคู่สัญลักษณ์ความฝันแบบรู้ขอบเขตคำไทย — แทน substring matching ที่ over-match
//
// ⚠️ **แผนเดิมใน CLAUDE.md คือย้ายไป Postgres FTS — ทดสอบแล้วว่าใช้ไม่ได้** เก็บหลักฐานไว้ที่นี่
//    เพื่อไม่ให้ใครไปลองซ้ำ (ทดสอบกับ Supabase production จริง ก.ค. 2569):
//
//    1) `to_tsvector('simple', 'ฝันว่างูเลื้อยเข้ามาในบ้าน')` → `'ฝันว่างูเลื้อยเข้ามาในบ้าน':1`
//       ได้ token เดียวทั้งประโยค เพราะภาษาไทยไม่มีช่องว่างและ config 'simple' ไม่ตัดคำไทย
//       → `search_vector @@ plainto_tsquery(...)` คืน **0 แถว** ใช้งานไม่ได้เลย
//    2) `pg_trgm` ก็ไม่รอด — `word_similarity()` จัดอันดับ "ฝันซ้อนฝัน" มาเป็นที่ 1 (0.300)
//       สำหรับฝันเรื่องงู เพราะ trigram ของภาษาไทยที่ไม่ตัดคำเป็นสัญญาณรบกวนล้วนๆ
//
//    คอลัมน์ `search_vector` + GIN index ใน migration 011 จึง **ยังไม่ถูกใช้งาน** — ไม่ลบทิ้ง
//    เพราะถ้าวันหนึ่งติดตั้ง extension ตัดคำไทย (เช่น ICU tokenizer) ก็กลับมาใช้ได้
//
// ✅ ทางที่ใช้จริง: `Intl.Segmenter` ซึ่งใช้พจนานุกรมตัดคำไทยของ ICU ที่ติดมากับ Node อยู่แล้ว
//    ไม่ต้องลง dependency เพิ่ม และตัดได้ถูกต้อง:
//      "ฝันว่างูเลื้อยเข้ามาในบ้าน" → ฝัน|ว่า|งู|เลื้อย|เข้า|มา|ใน|บ้าน   (ไม่มี "ข้าม")
//      "ฝันว่ากระโดดข้ามรั้ว"       → ฝัน|ว่า|กระโดด|ข้าม|รั้ว            (มี "ข้าม" ของจริง)

import { variants, type DreamSymbol, type DreamTheme } from "./dream";

/**
 * ⚠️ ไฟล์นี้ **จงใจไม่ parity กับ Python** — `dream_interpretation_engine.py` ยังใช้ substring
 *    แบบเดิมอยู่ และ Python ไม่มีตัวตัดคำไทยในตัว (ต้องลง pythainlp) การบังคับให้ตรงกันจะ
 *    แปลว่าต้องคง**บั๊ก**ไว้ ฟังก์ชัน `findSymbolMatches()` เดิมใน dream.ts จึงถูกเก็บไว้ครบ
 *    เพื่อให้ golden test เทียบกับ Python ได้ต่อ ส่วนโปรดักชันเรียกไฟล์นี้แทน
 */

let segmenter: Intl.Segmenter | null = null;
function getSegmenter(): Intl.Segmenter | null {
  if (segmenter) return segmenter;
  try {
    segmenter = new Intl.Segmenter("th", { granularity: "word" });
    return segmenter;
  } catch {
    return null; // runtime ไม่มี ICU เต็ม → ผู้เรียกต้อง fallback
  }
}

/** true ถ้า runtime นี้ตัดคำไทยได้จริง (Node ที่ build มาแบบ small-icu จะคืน false) */
export function hasThaiSegmentation(): boolean {
  const s = getSegmenter();
  if (!s) return false;
  // ตรวจด้วยเคสจริง: ถ้าตัดไม่เป็นจะได้ token เดียว
  const words = [...s.segment("ฝันว่างูเลื้อยเข้ามา")].filter((x) => x.isWordLike);
  return words.length > 2;
}

/** ตัดข้อความไทยเป็นคำ — คืน [] ถ้า runtime ตัดไม่ได้ */
export function segmentThai(text: string): string[] {
  const s = getSegmenter();
  if (!s) return [];
  return [...s.segment(text)].filter((x) => x.isWordLike).map((x) => x.segment);
}

/**
 * วลี `phrase` ปรากฏใน `text` โดยตรงกับขอบเขตคำจริงไหม
 *
 * วิธี: ตัดทั้งสองฝั่งเป็นคำ แล้วหาว่าลำดับคำของ phrase เป็น subsequence ต่อเนื่องของ text ไหม
 * — จับ "กระโดด ข้าม" ใน "ฝัน ว่า กระโดด ข้าม รั้ว" ได้ แต่ไม่จับ "ข้าม" ใน "เข้า|มา"
 */
export function phraseInText(phrase: string, textWords: readonly string[]): boolean {
  const pw = segmentThai(phrase);
  if (pw.length === 0) return false;
  for (let i = 0; i + pw.length <= textWords.length; i++) {
    let ok = true;
    for (let j = 0; j < pw.length; j++) {
      if (textWords[i + j] !== pw[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * ขอบเขต segment ทั้งหมดของข้อความ (ตำแหน่งเริ่ม/จบเป็น code-unit index)
 * ใช้เช็คว่า substring หนึ่ง "เกาะขอบคำจริง" ไหม โดยไม่ต้องให้ token ตรงกันเป๊ะ
 *
 * ⚠️ ทำไมไม่ใช้ phraseInText กับทุกอย่าง: คำนอกพจนานุกรม ICU (คำทับศัพท์ใหม่ เช่น "โดรน")
 *    ถูกตัดไม่เสถียร — "โดรน" เดี่ยวๆ = 1 token แต่ในประโยคกลายเป็น โด|รน → เทียบลำดับ
 *    token แล้วไม่เจอทั้งที่คำอยู่ตรงนั้นจริง วิธี "ขอบ segment" ยอมให้วลีครอบหลาย segment
 *    (โด+รน) ขอแค่หัว-ท้ายตรงขอบ → จับ OOV ได้ และยังกัน "ข้าม" กลาง "เ|ข้าม|า" ได้เหมือนเดิม
 */
export function segmentBoundaries(text: string): { starts: Set<number>; ends: Set<number> } | null {
  const s = getSegmenter();
  if (!s) return null;
  const starts = new Set<number>();
  const ends = new Set<number>();
  for (const seg of s.segment(text)) {
    starts.add(seg.index);
    ends.add(seg.index + seg.segment.length);
  }
  return { starts, ends };
}

/** วลีปรากฏใน text โดยหัวและท้ายตรงขอบ segment (ทนคำนอกพจนานุกรม — ดูคอมเมนต์ segmentBoundaries) */
export function phraseAtWordBoundaries(
  phrase: string,
  text: string,
  b: { starts: Set<number>; ends: Set<number> }
): boolean {
  let idx = text.indexOf(phrase);
  while (idx !== -1) {
    if (b.starts.has(idx) && b.ends.has(idx + phrase.length)) return true;
    idx = text.indexOf(phrase, idx + 1);
  }
  return false;
}

/** ทุก segment พร้อมตำแหน่งเริ่ม (ใช้หาว่า "คำ" ซ่อนอยู่หัวคำประสมไหม) */
export function segmentSpans(text: string): { index: number; segment: string }[] | null {
  const s = getSegmenter();
  if (!s) return null;
  return [...s.segment(text)].map((x) => ({ index: x.index, segment: x.segment }));
}

/**
 * ความยาว "รูปอักขระ" ของคำไทย — นับรวมสระบน-ล่างด้วย
 * ⚠️ อย่าใช้ตัวนับที่ตัดสระบน-ล่างทิ้งกับกฎนี้: "งู" จะเหลือ 1 (ง + สระอูใต้) แล้วโดนกฎตัดทิ้ง
 *    ทั้งที่เป็นคำที่คนฝันถึงมากที่สุด (เจอจริงตอนทดสอบ 7 ส.ค. 2569)
 */
function glyphLen(str: string): number {
  return [...str].length;
}

/**
 * คำประสมภาษาไทยเป็นแบบ "หัวคำ + คำขยาย" (งูเห่า = งู + เห่า) — ICU มองเป็นคำเดียว
 * ทำให้สัญลักษณ์ "งู" ไม่ถูกจับทั้งที่ผู้ใช้ฝันเห็นงูจริงๆ (ช่องว่างที่พบ 6 ส.ค. 2569)
 *
 * 🔴 กฎนี้เปิดเฉพาะหมวด "สัตว์/แมลง" เท่านั้น เพราะเป็นกลุ่มที่ประสมคำบ่อยที่สุดในความฝัน
 *    และชื่อสัตว์ชนกับคำอื่นน้อย — ถ้าเปิดทั้งฐานจะพังทันที เช่น "ตาข่าย" จะถูกจับเป็น "ตา"
 *    (อวัยวะ) และ "หัวใจ" จะถูกจับเป็น "หัว" · เงื่อนไขเสริมอีก 2 ชั้น:
 *      - หัวคำต้องยาว ≥ 2 รูปอักขระ (กันคำพยางค์เดียวที่ชนง่าย)
 *      - ส่วนที่เหลือต้องยาว ≥ 2 รูปอักขระ (กัน "งา" ในคำว่า "งาน" ที่เหลือแค่ "น")
 */
function compoundHeadMatch(word: string, spans: { index: number; segment: string }[]): boolean {
  if (glyphLen(word) < 2) return false;
  for (const sp of spans) {
    if (sp.segment.length <= word.length) continue;
    if (!sp.segment.startsWith(word)) continue;
    if (glyphLen(sp.segment.slice(word.length)) >= 2) return true;
  }
  return false;
}

/**
 * คำพ้องรูปที่ "อยู่ในคำอื่น" จนความหมายเปลี่ยนไปคนละเรื่อง — ถ้าคำนั้นปรากฏเฉพาะในกับดักนี้
 * ทั้งข้อความ ให้ถือว่าไม่ใช่สัญลักษณ์จริง (เจอจากฝันจริงของผู้ใช้: "แผ่แม่เบี้ย" ของงูเห่า
 * ถูกจับเป็นสัญลักษณ์ "แม่/มารดา")
 */
const TRAP_PHRASES: Record<string, string[]> = {
  แม่: ["แม่เบี้ย", "แม่ทัพ", "แม่แรง", "แม่พิมพ์"],
  ตา: ["ตาข่าย", "ตารางเวลา"],
  หัว: ["หัวใจ", "หัวหน้า", "หัวข้อ"],
  ปู: ["ปูน", "ปูเสื่อ", "ปู่"],
  พ่อ: ["พ่อค้า", "พ่อครัว"],
  ต่อ: ["ต่อไป", "ต่อจาก", "ต่อรอง", "ต่อสู้", "ต่อเนื่อง", "ติดต่อ", "ต่อต้าน"],
};

function countOccurrences(text: string, needle: string): number {
  let n = 0;
  let i = text.indexOf(needle);
  while (i !== -1) {
    n++;
    i = text.indexOf(needle, i + needle.length);
  }
  return n;
}

/** true = คำนี้ปรากฏเฉพาะในกับดัก (ไม่ได้หมายถึงสัญลักษณ์จริง) */
function onlyInTrap(word: string, text: string): boolean {
  const traps = TRAP_PHRASES[word];
  if (!traps) return false;
  const total = countOccurrences(text, word);
  if (total === 0) return false;
  const inTrap = traps.reduce((sum, t) => sum + countOccurrences(text, t) * countOccurrences(t, word), 0);
  return inTrap >= total;
}

/**
 * จัดลำดับสัญลักษณ์ที่จับได้ + ตัดซ้ำ + จำกัดจำนวน (ใช้เฉพาะเส้น production)
 *
 * เหตุผล: ฐานความฝันมีแถวซ้ำ 49 แถว (หมวดเดียวกันแต่ชื่อหมวดต่อท้ายภาษาอังกฤษ) และมีสัญลักษณ์
 * ที่เป็นคำใช้ทั่วไปในภาษา ("ให้" "ต่อ") ซึ่งโผล่ในประโยคปกติได้ตลอด — ถ้าส่งไปทั้งกองผู้เล่าเรื่อง
 * จะให้น้ำหนักผิด จึงเรียง "คำนามรูปธรรม (สัตว์/สถานที่/ภัย/สิ่งของ) มาก่อน" แล้วค่อยกริยา/อารมณ์
 * และตัดเหลือ 8 รายการ — ไม่ได้ลบข้อมูลออกจากฐาน แค่จัดลำดับความสำคัญ
 */
const ABSTRACT_CATEGORY = /การกระทำ|กริยา|อารมณ์|สภาวะ/;
const MAX_SYMBOLS = 8;

export function rankAndDedupeSymbols(matches: readonly DreamSymbol[]): DreamSymbol[] {
  const seen = new Set<string>();
  const unique = matches.filter((m) => {
    if (seen.has(m.dream_object)) return false;
    seen.add(m.dream_object);
    return true;
  });
  return unique
    .map((m, i) => ({ m, i, rank: ABSTRACT_CATEGORY.test(m.category) ? 1 : 0 }))
    .sort((a, b) => a.rank - b.rank || b.m.dream_object.length - a.m.dream_object.length || a.i - b.i)
    .slice(0, MAX_SYMBOLS)
    .map((x) => x.m);
}

/** หมวดที่อนุญาตให้จับหัวคำประสม (ดูเหตุผลใน compoundHeadMatch) */
const COMPOUND_HEAD_CATEGORY = /สัตว์|แมลง/;

/**
 * จับสัญลักษณ์จากฐานข้อมูลด้วยขอบเขตคำ
 * ถ้า runtime ตัดคำไทยไม่ได้ → คืน null เพื่อให้ผู้เรียก fallback ไปใช้ substring แบบเดิม
 * (ยอมให้ over-match ดีกว่าไม่เจออะไรเลย)
 */
export function findSymbolMatchesSegmented(
  dreamText: string,
  db: readonly DreamSymbol[]
): DreamSymbol[] | null {
  if (!hasThaiSegmentation()) return null;
  // ใช้ "ขอบ segment" แทน "ลำดับ token" (30 ก.ค. 2569) — เข้มเท่าเดิมกับเคส over-match
  // ("ข้าม" กลาง "เข้ามา" ยังไม่จับ) แต่ทนคำนอกพจนานุกรม ICU ("โดรน" → โด|รน) ซึ่งเทียบ
  // ลำดับ token แล้วพลาดทั้งที่คำอยู่ตรงนั้น — false-negative ของ engine = ปลุก AI-1 ฟรีๆ
  const bounds = segmentBoundaries(dreamText);
  if (!bounds) return null;
  const spans = segmentSpans(dreamText) ?? [];
  const out: DreamSymbol[] = [];
  for (const row of db) {
    const allowCompound = COMPOUND_HEAD_CATEGORY.test(row.category);
    for (const v of variants(row.dream_object)) {
      if (!v) continue;
      if (onlyInTrap(v, dreamText)) continue;
      if (phraseAtWordBoundaries(v, dreamText, bounds) || (allowCompound && compoundHeadMatch(v, spans))) {
        out.push(row);
        break;
      }
    }
  }
  return rankAndDedupeSymbols(out);
}

/** เวอร์ชันสำหรับธีมจิตวิทยา — ธีมสั้นและกำกวมกว่า จึงเทียบสองทางเหมือนตรรกะเดิม */
export function findThemeMatchesSegmented(
  dreamText: string,
  db: readonly DreamTheme[]
): DreamTheme[] | null {
  if (!hasThaiSegmentation()) return null;
  const bounds = segmentBoundaries(dreamText);
  if (!bounds) return null;
  const out: DreamTheme[] = [];
  for (const row of db) {
    for (const v of variants(row.dream_theme)) {
      if (v && (phraseAtWordBoundaries(v, dreamText, bounds) || v.includes(dreamText))) {
        out.push(row);
        break;
      }
    }
  }
  return out;
}
