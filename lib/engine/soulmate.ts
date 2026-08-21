// โหมดความรักและเนื้อคู่ (Logic 17 v1) — คำนวณจากลัคนานิรายนะ → ราศีที่ 7 (ภพปัตนิ = คู่ครอง)
//
// แหล่งข้อมูลจริง (ตรวจ 21 ส.ค. 2569 — CLAUDE.md §15 คิวข้อ 1):
//   - ตารางคุณลักษณะ 12 ลัคนาราศี = ตำราจตุพลวัตร ภาคผนวก ข.2 (ตรงกับ
//     data/raw-uploads/Zodiac_Signs_csv.csv คำต่อคำ — CSV คือ export ของ ข.2 ไม่ใช่แหล่งแยก)
//   - ความหมายดาวเจ้าเรือน = data/raw-uploads/Planet_Meanings_csv.csv (10 ดวง)
//     ⚠️ คอลัมน์ interpretation ใน CSV มีเลขขยะต่อท้าย ("11", "3333") — ตัดทิ้งตอนคัดลอก
//   - เคมีธาตุ = wuXingScore (golden test ผ่าน) · ทิศ = DIRECTION_TO_ELEMENT (Logic 7)
//
// 🔴 ขอบเขต v1 ที่ผู้ใช้เคาะ (21 ส.ค. 2569): ทำเฉพาะ 4 หัวข้อที่มีข้อมูลจริงรองรับ —
//    (1) นิสัยคู่ชั้นราศี (2) นิสัยชั้นดาวเจ้าเรือน (3) เคมีธาตุคุณ↔เขา (4) ทิศ/พลังงานเกื้อหนุน
//    อีก 5 หัวข้อของโครง Jyotish (รูปลักษณ์/พื้นเพ/ฐานะ/อายุ/ช่วงเวลา) **ไม่มีในตำรา ห้ามแต่งเอง**
//    → รอคำตอบเอกสารถึงเจ้าของตำรารอบสอง (SOULMATE_SCOPE_NOTE บอกผู้ใช้ตรงๆ)
//
// ไม่มีเวลาเกิด → fallback ชั้นธาตุ (จัดอันดับ 5 ธาตุแบบ myMatchProfile) พร้อมบอกตรงว่าเป็นคนละชั้น

import { wuXingScore, THAI_LABEL_5, type Element5, type WuXingResult } from "./element";
import { DIRECTION_TO_ELEMENT, ALL_DIRECTIONS, type Direction } from "./fengshui";
import { ZODIAC_ORDER, type ZodiacSign } from "./ascendant";

// ---------------------------------------------------------------------------
// ตาราง ข.2 — คุณลักษณะ 12 ลัคนาราศี (คัดลอกตรงจากตำรา ห้ามแก้ถ้อยคำเอง)
// ---------------------------------------------------------------------------

export interface ZodiacTraits {
  /** ธาตุระบบไทย 4 ธาตุตามตำรา (ไฟ/ดิน/ลม/น้ำ) */
  thaiElement: "ไฟ" | "ดิน" | "ลม" | "น้ำ";
  /** แปลงเป็น Element5 เพื่อเข้า wuXingScore (ลม→Wood ตามแบบแผนเดิมของระบบ) */
  element: Element5;
  /** เลขดาวเจ้าเรือน (ตนุลัคน์) ตาม ข.2 — กุมภ์มี 2 ดวง (ราหู ๘ / เสาร์ ๗) */
  rulerIds: number[];
  traits: string;
  strengths: string;
  weaknesses: string;
}

export const ZODIAC_TRAITS: Record<ZodiacSign, ZodiacTraits> = {
  เมษ: {
    thaiElement: "ไฟ", element: "Fire", rulerIds: [3],
    traits: "กล้าหาญ, รักอิสระ, เป็นผู้นำ, ตรงไปตรงมา",
    strengths: "กล้าตัดสินใจ, มีพลังงานสูง, มุ่งมั่น",
    weaknesses: "ใจร้อน, หุนหันพลันแล่น, ไม่ยอมคน",
  },
  พฤษภ: {
    thaiElement: "ดิน", element: "Earth", rulerIds: [6],
    traits: "สุขุม, อดทน, รักความสบาย, ยึดมั่นในหลักการ",
    strengths: "มั่นคง, พึ่งพาได้, มีรสนิยม, เก็บออมเก่ง",
    weaknesses: "ดื้อเงียบ, เปลี่ยนแปลงยาก, หวงของ",
  },
  มิถุน: {
    thaiElement: "ลม", element: "Wood", rulerIds: [4],
    traits: "ฉลาด, ช่างพูด, ปรับตัวเก่ง, อยากรู้อยากเห็น",
    strengths: "มีวาทศิลป์, เรียนรู้เร็ว, เข้าสังคมเก่ง",
    weaknesses: "ขี้เบื่อ, เปลี่ยนใจง่าย, ขาดความต่อเนื่อง",
  },
  กรกฎ: {
    thaiElement: "น้ำ", element: "Water", rulerIds: [2],
    traits: "อ่อนไหว, รักครอบครัว, ชอบดูแล, ช่างจินตนาการ",
    strengths: "เห็นอกเห็นใจ, ใส่ใจรายละเอียด, ปกป้องคนรัก",
    weaknesses: "อารมณ์แปรปรวน, ขี้น้อยใจ, ยึดติดกับอดีต",
  },
  สิงห์: {
    thaiElement: "ไฟ", element: "Fire", rulerIds: [1],
    traits: "มีความเป็นผู้นำ, รักศักดิ์ศรี, ใจกว้าง, ชอบเป็นจุดสนใจ",
    strengths: "มีความคิดสร้างสรรค์, กล้าแสดงออก, มีเสน่ห์",
    weaknesses: "อีโก้สูง, ชอบควบคุม, ไม่ชอบการวิจารณ์",
  },
  กันย์: {
    thaiElement: "ดิน", element: "Earth", rulerIds: [4],
    traits: "เจ้าระเบียบ, ช่างวิเคราะห์, ใส่ใจสุขภาพ, ชอบช่วยเหลือ",
    strengths: "ละเอียดรอบคอบ, มีระบบ, พึ่งพาได้",
    weaknesses: "จู้จี้ขี้บ่น, วิตกกังวล, วิจารณ์ตนเองและผู้อื่น",
  },
  ตุลย์: {
    thaiElement: "ลม", element: "Wood", rulerIds: [6],
    traits: "รักความยุติธรรม, มีเสน่ห์, ชอบเข้าสังคม, ตัดสินใจรอบคอบ",
    strengths: "มีทักษะการเจรจา, สร้างสมดุลเก่ง, มีรสนิยม",
    weaknesses: "ลังเล, ตัดสินใจยาก, ตามใจคนอื่นมากไป",
  },
  พิจิก: {
    thaiElement: "น้ำ", element: "Water", rulerIds: [3],
    traits: "ลึกลับ, จริงจัง, มีพลังดึงดูด, ไม่ยอมแพ้",
    strengths: "มุ่งมั่น, มีสัญชาตญาณดี, รักใครรักจริง",
    weaknesses: "ขี้ระแวง, เจ้าคิดเจ้าแค้น, หึงหวงรุนแรง",
  },
  ธนู: {
    thaiElement: "ไฟ", element: "Fire", rulerIds: [5],
    traits: "มองโลกในแง่ดี, รักอิสระ, ชอบผจญภัย, ใฝ่หาความรู้",
    strengths: "กระตือรือร้น, มีเป้าหมายชัดเจน, ใจกว้าง",
    weaknesses: "ใจร้อน, ขาดความอดทน, พูดตรงเกินไป",
  },
  มังกร: {
    thaiElement: "ดิน", element: "Earth", rulerIds: [7],
    traits: "มีความรับผิดชอบสูง, ทะเยอทะยาน, อดทน, จริงจัง",
    strengths: "วางแผนเก่ง, มุ่งมั่นในเป้าหมาย, มีวินัย",
    weaknesses: "เคร่งเครียด, ไม่ยืดหยุ่น, เก็บความรู้สึก",
  },
  กุมภ์: {
    thaiElement: "ลม", element: "Wood", rulerIds: [8, 7],
    traits: "เป็นตัวของตัวเอง, นักคิด, ชอบช่วยเหลือสังคม, รักอิสระ",
    strengths: "มีความคิดสร้างสรรค์, มองการณ์ไกล, มีมนุษยธรรม",
    weaknesses: "โลกส่วนตัวสูง, คาดเดายาก, ไม่ชอบอยู่ในกรอบ",
  },
  มีน: {
    thaiElement: "น้ำ", element: "Water", rulerIds: [5],
    traits: "ช่างฝัน, มีเมตตา, อ่อนไหว, มีจินตนาการสูง",
    strengths: "เห็นอกเห็นใจผู้อื่น, มีสัญชาตญาณดี, มีความคิดสร้างสรรค์",
    weaknesses: "โลเล, ไม่ค่อยอยู่กับความเป็นจริง, ถูกชักจูงง่าย",
  },
};

// ---------------------------------------------------------------------------
// ความหมายดาวเจ้าเรือน — Planet_Meanings_csv.csv (เลขขยะท้ายบรรทัดตัดทิ้งแล้ว)
// ---------------------------------------------------------------------------

export const PLANET_MEANINGS: Record<number, { name: string; meaning: string }> = {
  1: { name: "อาทิตย์", meaning: "พลังแห่งความเป็นผู้นำ ศักดิ์ศรี ความเชื่อมั่นในตนเอง และความทะเยอทะยาน" },
  2: { name: "จันทร์", meaning: "ความอ่อนโยน จินตนาการ การดูแลเอาใจใส่ ความผูกพันกับครอบครัว และอารมณ์ความรู้สึก" },
  3: { name: "อังคาร", meaning: "ความกล้าหาญ ความขยันขันแข็ง การต่อสู้ การตัดสินใจที่เด็ดขาด และความตรงไปตรงมา" },
  4: { name: "พุธ", meaning: "สติปัญญา การสื่อสาร การเจรจา ไหวพริบปฏิภาณ และความสามารถในการปรับตัว" },
  5: { name: "พฤหัสบดี", meaning: "ปัญญาบริสุทธิ์ คุณธรรม โชคลาภ ความสำเร็จ การมองโลกในแง่ดี และศาสนา" },
  6: { name: "ศุกร์", meaning: "ความรัก ศิลปะ ความสวยงาม เสน่ห์ ความสุขสมหวัง และความสะดวกสบาย" },
  7: { name: "เสาร์", meaning: "ความอดทน ความรับผิดชอบ การแบกรับภาระ ความวิตกกังวล และความหนักแน่นมั่นคง" },
  8: { name: "ราหู", meaning: "ความลุ่มหลง มัวเมา ความเปลี่ยนแปลง การกล้าได้กล้าเสีย และไหวพริบในการเอาตัวรอด" },
  9: { name: "เกตุ", meaning: "จิตวิญญาณ ญาณหยั่งรู้ สิ่งศักดิ์สิทธิ์คุ้มครอง ความแปลกประหลาด และสัมผัสที่หก" },
  0: { name: "มฤตยู", meaning: "การเปลี่ยนแปลงกะทันหัน ความพลิกผัน (การจบสิ้นเพื่อเริ่มใหม่) และศาสตร์ลึกลับ" },
};

// ---------------------------------------------------------------------------
// caveat บังคับ — ทุกคำตอบของโหมดนี้ต้องมีครบ (มีเทสต์ล็อก)
// ---------------------------------------------------------------------------

/** หลักเดียวกับ myMatchProfile — ระบบไม่มีทางรู้ตัวบุคคล/เวลา ห้ามเคลมเกิน */
export const SOULMATE_CAVEAT =
  "คำทำนายนี้บอกได้เพียง 'พลังงานและลักษณะนิสัยแบบไหนเกื้อหนุนคุณ' ตามหลักโหราศาสตร์ — " +
  "ระบุตัวบุคคล รูปร่างหน้าตา สถานที่ หรือเวลาที่จะพบกันแน่นอนไม่ได้ค่ะ";

/** บอกขอบเขต v1 ตรงๆ — 5 หัวข้อที่ตำราไม่มีข้อมูล ยังไม่เปิด (ห้ามแต่งเอง §15) */
export const SOULMATE_SCOPE_NOTE =
  "หัวข้อ รูปลักษณ์ภายนอก · พื้นเพครอบครัว · ฐานะ · อายุ · ช่วงเวลาที่จะพบ " +
  "ยังไม่เปิดในเวอร์ชันนี้ เพราะตำราต้นทางยังไม่มีข้อมูลรองรับ (อยู่ระหว่างสอบถามเจ้าของตำรา)";

/** ป้ายบังคับของภาพเนื้อคู่ทุกรูป (ผู้ใช้สั่ง 21 ส.ค. 2569) */
export const SOULMATE_IMAGE_DISCLAIMER =
  "ภาพจินตนาการจาก AI ตามบุคลิกและธาตุที่คำนวณ — ไม่ใช่บุคคลจริง และไม่ได้มาจากตำรา";

// ---------------------------------------------------------------------------
// การคำนวณ
// ---------------------------------------------------------------------------

/** ราศีที่ 7 นับจากลัคนา (ภพปัตนิ = คู่ครอง หุ้นส่วน — ชื่อภพตรง HOUSE_NAMES ใน transit.ts) */
export function seventhSign(lagna: ZodiacSign): ZodiacSign {
  const idx = ZODIAC_ORDER.indexOf(lagna);
  return ZODIAC_ORDER[(idx + 6) % 12];
}

export interface SoulmateChemistry {
  score: WuXingResult;
  /** ทิศที่ธาตุตรงกับธาตุที่เกื้อหนุนผู้ใช้ที่สุด (อันดับ 1 จากการจัดอันดับ 5 ธาตุ) */
  supportDirections: Direction[];
  /** อันดับธาตุคู่ทั้ง 5 (มุมเดียวกับ myMatchProfile — wuXingScore(เรา, เขา, ธาตุที่เราขาด)) */
  rankedElements: { element: Element5; thai: string; score: number; relation: string }[];
}

export function soulmateChemistry(
  userDominant: Element5,
  partnerElement: Element5,
  userMissing: Element5[]
): SoulmateChemistry {
  const ranked = (Object.keys(THAI_LABEL_5) as Element5[])
    .map((el) => {
      const s = wuXingScore(userDominant, el, userMissing);
      return { element: el, thai: THAI_LABEL_5[el], score: s.final_score, relation: s.relation_th };
    })
    .sort((a, b) => b.score - a.score);
  const top = ranked[0].score;
  const best = ranked.filter((r) => r.score === top).map((r) => r.element);
  return {
    score: wuXingScore(userDominant, partnerElement, userMissing),
    supportDirections: ALL_DIRECTIONS.filter((d) => best.includes(DIRECTION_TO_ELEMENT[d])),
    rankedElements: ranked,
  };
}

export interface SoulmateReading {
  mode: "lagna";
  lagnaSign: ZodiacSign;
  seventhSign: ZodiacSign;
  partner: ZodiacTraits;
  rulers: { name: string; meaning: string }[];
  chemistry: SoulmateChemistry;
  caveats: string[];
}

/** คำทำนายเนื้อคู่ชั้นลัคนา (ต้องมีเวลาเกิด — ลัคนามาจาก calculateAscendant ที่ verify แล้ว) */
export function soulmateReading(
  lagnaSign: ZodiacSign,
  userDominant: Element5,
  userMissing: Element5[]
): SoulmateReading {
  const seventh = seventhSign(lagnaSign);
  const partner = ZODIAC_TRAITS[seventh];
  return {
    mode: "lagna",
    lagnaSign,
    seventhSign: seventh,
    partner,
    rulers: partner.rulerIds.map((id) => PLANET_MEANINGS[id]),
    chemistry: soulmateChemistry(userDominant, partner.element, userMissing),
    caveats: [SOULMATE_CAVEAT, SOULMATE_SCOPE_NOTE],
  };
}

export interface SoulmateElementReading {
  mode: "element";
  /** อันดับธาตุคู่ + ทิศ (ชั้นเดียวกับ myMatchProfile) */
  rankedElements: SoulmateChemistry["rankedElements"];
  supportDirections: Direction[];
  caveats: string[];
}

/** fallback เมื่อไม่มีเวลาเกิด — ชั้นธาตุล้วน บอกตรงๆ ว่าเป็นคนละชั้นกับลัคนา */
export const SOULMATE_NO_TIME_NOTE =
  "ไม่มีเวลาเกิด จึงคำนวณลัคนา (และราศีคู่ครอง) ไม่ได้ — คำทำนายนี้ใช้ชั้นธาตุประจำตัวแทน " +
  "ถ้าทราบเวลาเกิดภายหลัง กรอกเพิ่มได้เพื่อรับคำทำนายชั้นลัคนาที่ละเอียดกว่า";

export function soulmateElementReading(
  userDominant: Element5,
  userMissing: Element5[]
): SoulmateElementReading {
  const c = soulmateChemistry(userDominant, userDominant, userMissing);
  return {
    mode: "element",
    rankedElements: c.rankedElements,
    supportDirections: c.supportDirections,
    caveats: [SOULMATE_NO_TIME_NOTE, SOULMATE_CAVEAT, SOULMATE_SCOPE_NOTE],
  };
}

// ---------------------------------------------------------------------------
// prompt ภาพเนื้อคู่ (FLUX) — อังกฤษล้วน สุภาพ ผู้ใหญ่เท่านั้น (แบบแผนเดียวกับ logoImagePrompt)
// ---------------------------------------------------------------------------

export type PartnerGender = "male" | "female" | "any";

const GENDER_PHRASE: Record<PartnerGender, string> = {
  male: "an adult Thai man",
  female: "an adult Thai woman",
  any: "an adult Thai person",
};

/** โทนสี/บรรยากาศตามธาตุของราศีคู่ — เชื่อมกับ ELEMENT ที่คำนวณ ไม่ใช่ให้ AI เดา */
const ELEMENT_MOOD: Record<Element5, string> = {
  Fire: "warm golden-red tones, confident radiant mood",
  Earth: "earthy warm beige and terracotta tones, calm grounded mood",
  Wood: "fresh green natural tones, lively breezy mood",
  Water: "cool blue serene tones, gentle dreamy mood",
  Metal: "elegant silver-white tones, refined graceful mood",
};

/**
 * สร้าง prompt ภาพเนื้อคู่จากข้อเท็จจริงที่คำนวณแล้ว (ธาตุของราศีคู่ → โทนภาพ)
 * 🔴 บังคับ: สุภาพ (modest clothing) · ผู้ใหญ่ · ไม่มีตัวอักษรในภาพ · ภาพเดี่ยว portrait
 */
export function soulmateImagePrompt(opts: { gender: PartnerGender; element: Element5 }): string {
  return (
    `Tasteful artistic portrait of ${GENDER_PHRASE[opts.gender]}, warm friendly expression, ` +
    `modest elegant clothing, ${ELEMENT_MOOD[opts.element]}, ` +
    `soft cinematic lighting, dreamy romantic atmosphere, upper-body portrait, ` +
    `photorealistic but clearly an artistic illustration, no text, no words, no letters, no watermark`
  );
}
