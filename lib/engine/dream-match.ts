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
  const out: DreamSymbol[] = [];
  for (const row of db) {
    for (const v of variants(row.dream_object)) {
      if (v && phraseAtWordBoundaries(v, dreamText, bounds)) {
        out.push(row);
        break;
      }
    }
  }
  return out;
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
