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
// (ตัวตรวจ boolean เดิมถูกแทนด้วย compoundHeadIndex ด้านล่าง — กติกาเดียวกัน แต่คืนตำแหน่ง)

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
  // "ยิ้มให้/ทำให้/บอกให้" คือคำเชื่อมในประโยค ไม่ใช่การให้/บริจาค (เจอจริง 10 ก.ย. 2569:
  // "แม่ยิ้มให้" ถูกจับเป็นสัญลักษณ์ "ให้ / บริจาค" แล้วดันแกนเรื่องแม่ตกไป)
  ให้: ["ยิ้มให้", "ทำให้", "พูดให้", "บอกให้", "เพื่อให้", "ปล่อยให้", "อยากให้", "จนให้", "ส่งยิ้มให้"],
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
 * เหตุผลเดิม (7 ส.ค. 2569): ฐานความฝันมีแถวซ้ำ 49 แถว และมีสัญลักษณ์ที่เป็นคำใช้ทั่วไป ("ให้" "ต่อ")
 * ซึ่งโผล่ในประโยคปกติได้ตลอด — ถ้าส่งไปทั้งกองผู้เล่าเรื่องจะให้น้ำหนักผิด
 *
 * 🔴 ยกเครื่อง 10 ก.ย. 2569 (ผู้ใช้รายงาน "คำทำนายหลุดประเด็น" — ตรวจแล้วต้นตออยู่ที่นี่):
 *   เดิมเรียง "ชื่อยาวก่อน" ทำให้แกนเรื่อง (เช่น "แม่") ตกไปอยู่หลัง "บ้าน/ประตู" และกริยาประกอบ
 *   (เดิน/ให้/ยิ้ม/ไม่ทัน) ถูกส่งด้วยน้ำหนักเท่ากัน AI จึงสรุปจากกริยาแทนแกนเรื่อง · กติกาใหม่:
 *   1. คำนามรูปธรรมเรียงตาม **ตำแหน่งที่ปรากฏในฝัน** (สิ่งที่ผู้ใช้เอ่ยก่อน = แกนเรื่อง)
 *   2. สัญลักษณ์ที่ "ซ้อนอยู่ในคำยาวกว่า" ถูกตัด — "แฟน" ใน "แฟนเก่า" ไม่ใช่คนรักปัจจุบัน ·
 *      "แม่น้ำ" กับ "แม่น้ำ / สายน้ำ" ที่จับตำแหน่งเดียวกันเหลือตัวเดียว
 *   3. กริยา/อารมณ์ (หมวดนามธรรม) ถ้ามีคำนาม ≥ 2 จำกัดไว้ 4 ตัว (เรียงปนคำนามตามตำแหน่ง) ·
 *      กริยาทั่วไป (เดิน/ยิ้ม/กิน/ให้ ฯลฯ — LOW_SALIENCE) อยู่ท้ายสุดและไม่เกิน 2
 *   ไม่ได้ลบข้อมูลออกจากฐาน แค่จัดลำดับความสำคัญให้ตรงกับที่ผู้ใช้เล่า
 */
const ABSTRACT_CATEGORY = /การกระทำ|กริยา|อารมณ์|สภาวะ/;
const MAX_SYMBOLS = 8;
const MAX_ABSTRACT_WHEN_NOUNS = 4;
const MAX_LOW_SALIENCE = 2;
/** กริยาทั่วไปที่โผล่ในทุกฉาก — ไม่ควรเป็นข้อสรุปของคำทำนาย */
const LOW_SALIENCE = new Set(["เดิน", "ยิ้ม", "หัวเราะ", "กิน / ทานอาหาร", "ดื่มน้ำ", "ให้ / บริจาค", "นั่ง / นั่งสมาธิ", "ยืน / ยืนตระหง่าน", "นอนหลับ"]);

export interface RankedMatch {
  row: DreamSymbol;
  /** ตำแหน่งเริ่ม/จบ (code-unit) ของ variant ที่จับได้ในข้อความฝัน */
  start: number;
  end: number;
}

function isAbstract(row: DreamSymbol): boolean {
  return ABSTRACT_CATEGORY.test(row.category);
}

/** จัดลำดับตามตำแหน่ง + ตัดตัวที่ซ้อนในคำยาวกว่า + ตัดซ้ำ + จำกัดจำนวน */
export function rankMatches(items: readonly RankedMatch[]): DreamSymbol[] {
  // 2. ตัดตัวที่ช่วงคำอยู่ภายในช่วงของตัวอื่นที่ยาวกว่า (หรือช่วงเท่ากันแต่มาทีหลังในฐาน)
  const kept = items.filter((a, ia) =>
    !items.some((b, ib) => {
      if (ia === ib) return false;
      const covers = b.start <= a.start && b.end >= a.end;
      if (!covers) return false;
      const bLonger = b.end - b.start > a.end - a.start;
      return bLonger || ib < ia; // ช่วงเท่ากัน → เก็บตัวที่มาก่อนในฐาน
    })
  );
  const seen = new Set<string>();
  const unique = kept.filter((m) => {
    if (seen.has(m.row.dream_object)) return false;
    seen.add(m.row.dream_object);
    return true;
  });
  const byPos = (a: RankedMatch, b: RankedMatch) => a.start - b.start;
  const nouns = unique.filter((m) => !isAbstract(m.row)).sort(byPos);
  const low = unique.filter((m) => isAbstract(m.row) && LOW_SALIENCE.has(m.row.dream_object)).sort(byPos);
  const abstract = unique.filter((m) => isAbstract(m.row) && !LOW_SALIENCE.has(m.row.dream_object)).sort(byPos);
  const abstractCap = nouns.length >= 2 ? MAX_ABSTRACT_WHEN_NOUNS : MAX_SYMBOLS;
  // ลำดับสุดท้าย = ตามตำแหน่งที่เล่า (คำนาม+กริยาสำคัญปนกันตามฉาก) · กริยาทั่วไปต่อท้าย
  const main = [...nouns, ...abstract.slice(0, abstractCap)].sort(byPos);
  const out = [...main, ...low.slice(0, MAX_LOW_SALIENCE)];
  return out.slice(0, MAX_SYMBOLS).map((m) => m.row);
}

/** เวอร์ชันไม่มีตำแหน่ง (ใช้ลำดับในอาร์เรย์แทน) — คงไว้ให้โค้ด/เทสต์เดิมเรียกได้ */
export function rankAndDedupeSymbols(matches: readonly DreamSymbol[]): DreamSymbol[] {
  return rankMatches(matches.map((row, i) => ({ row, start: i, end: i + 1 })));
}

/**
 * แกนเรื่องของฝัน = สัญลักษณ์ 2 ตัวแรกตามลำดับที่ผู้ใช้เอ่ย (ไม่นับกริยาทั่วไป) — ฝันเรื่องสอบ
 * แกนคือ "สอบ" แม้เป็นหมวดการกระทำ (ทดลองแล้ว: ยึดคำนามอย่างเดียว AI ไปเล่าเรื่อง "บันได" แทน)
 * ส่งให้ผู้เล่าเรื่องเป็นฟิลด์แยก เพื่อให้บทสรุป/คำถามปิดท้ายยึดสิ่งนี้ ไม่ใช่กริยาประกอบ
 */
export function coreSymbols(ranked: readonly DreamSymbol[]): string[] {
  const main = ranked.filter((r) => !LOW_SALIENCE.has(r.dream_object)).slice(0, 2);
  if (main.length) return main.map((r) => r.dream_object);
  return ranked[0] ? [ranked[0].dream_object] : [];
}

/** ตำแหน่งแรกที่วลีปรากฏโดยหัว-ท้ายตรงขอบ segment (-1 = ไม่พบ) */
function firstBoundaryIndex(phrase: string, text: string, b: { starts: Set<number>; ends: Set<number> }): number {
  let idx = text.indexOf(phrase);
  while (idx !== -1) {
    if (b.starts.has(idx) && b.ends.has(idx + phrase.length)) return idx;
    idx = text.indexOf(phrase, idx + 1);
  }
  return -1;
}

/** ตำแหน่ง segment ที่มี `word` เป็นหัวคำประสม (-1 = ไม่พบ) — เงื่อนไขเดียวกับ compoundHeadMatch */
function compoundHeadIndex(word: string, spans: { index: number; segment: string }[]): number {
  if (glyphLen(word) < 2) return -1;
  for (const sp of spans) {
    if (sp.segment.length <= word.length) continue;
    if (!sp.segment.startsWith(word)) continue;
    if (glyphLen(sp.segment.slice(word.length)) >= 2) return sp.index;
  }
  return -1;
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
  const out: RankedMatch[] = [];
  for (const row of db) {
    const allowCompound = COMPOUND_HEAD_CATEGORY.test(row.category);
    for (const v of variants(row.dream_object)) {
      if (!v) continue;
      if (onlyInTrap(v, dreamText)) continue;
      const at = firstBoundaryIndex(v, dreamText, bounds);
      if (at !== -1) {
        out.push({ row, start: at, end: at + v.length });
        break;
      }
      if (allowCompound) {
        const head = compoundHeadIndex(v, spans);
        if (head !== -1) {
          out.push({ row, start: head, end: head + v.length });
          break;
        }
      }
    }
  }
  return rankMatches(out);
}

/**
 * variant ของชื่อธีม — ชื่อธีมบางตัวมีวงเล็บขยาย เช่น "ลิฟต์ (ขึ้น/ลง/ติด)" ซึ่งถ้าแยกด้วย "/" ตรงๆ
 * จะได้ "ลง" ไปจับฝัน "รถพุ่งลงแม่น้ำ" เป็นธีมลิฟต์ (เจอจริง 10 ก.ย. 2569) · กติกา: ส่วนหน้าวงเล็บ
 * ใช้ทุก variant · ส่วนในวงเล็บใช้เฉพาะวลี ≥ 2 คำ (ผีอำ · หาไม่เจอ · วิ่งไม่ถึง) และไม่ใช่คำขยายลอยๆ
 */
const THEME_PAREN_STOP = new Set(["ในฝัน"]);
/** คำเดียวในวงเล็บที่เป็นชื่อธีมจริง (ICU มอง "ผีอำ" เป็นคำเดียว จึงไม่ผ่านเกณฑ์ ≥ 2 คำ) */
const THEME_PAREN_ALLOW = new Set(["ผีอำ"]);
export function themeVariants(theme: string): string[] {
  const paren = [...theme.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  const base = theme.replace(/\s*\([^)]*\)/g, "");
  const out = variants(base);
  for (const inner of paren) {
    for (const v of variants(inner)) {
      if (THEME_PAREN_STOP.has(v)) continue;
      if (THEME_PAREN_ALLOW.has(v) || segmentThai(v).length >= 2) out.push(v);
    }
  }
  return out.filter((v) => v.length > 0);
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
  // ข้อความสั้นมาก (พิมพ์แค่ชื่อธีม) ยังเทียบกลับได้ · ข้อความยาวห้าม — ไม่งั้นทุกธีมที่มีคำนั้นจับหมด
  const reverseOk = glyphLen(dreamText.trim()) <= 10;
  for (const row of db) {
    for (const v of themeVariants(row.dream_theme)) {
      if (phraseAtWordBoundaries(v, dreamText, bounds) || (reverseOk && v.includes(dreamText.trim()))) {
        out.push(row);
        break;
      }
    }
  }
  return out;
}
