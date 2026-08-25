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

/** บอกขอบเขตตรงๆ — หัวข้อที่ตำราไม่มีข้อมูล ยังไม่เปิด (ห้ามแต่งเอง §15)
 *  (23 ส.ค. 2569: "รูปลักษณ์ภายนอก" ถอดจากรายการนี้แล้ว — พบตาราง ค.1 นรลักษณ์กายา 5 ธาตุ
 *  ในตำราจตุพลวัตรเอง จึงเปิดหัวข้อนี้ได้ด้วยข้อมูลตำราจริง ดู PHYSIOGNOMY_BY_ELEMENT) */
export const SOULMATE_SCOPE_NOTE =
  "หัวข้อ 'อายุของคู่' ไม่เปิดในทุกเวอร์ชัน — ตำราต้นทางไม่มีข้อมูล และโหราศาสตร์ระบุอายุแน่นอน" +
  "ไม่ได้ (บอกได้เพียงวุฒิภาวะ) — ส่วน บริบทที่มักพบคู่ · จังหวะเวลาเรื่องคู่ · แนวโน้มพื้นเพ/ฐานะ/" +
  "การงานฝั่งคู่ เปิดผ่านชั้นคำนวณตำแหน่งดาวซึ่งเป็นชั้นเสริม (แนวโน้มกว้างๆ มี caveat กำกับแยก " +
  "— ไม่ใช่คำระบุตัวเลขทรัพย์สินหรือฟันธง)";

// ---------------------------------------------------------------------------
// นรลักษณ์กายา 5 ธาตุ — ตำราจตุพลวัตร ภาคผนวก ค.1 (คัดลอกตรง ห้ามแก้ถ้อยคำเอง)
// ใช้บอก "แนวโน้มรูปลักษณ์" ของคู่จากธาตุ + ป้อนเข้า prompt ภาพ (ผู้ใช้เคาะ 23 ส.ค. 2569)
// ---------------------------------------------------------------------------

export interface Physiognomy {
  /** ลักษณะใบหน้า (ค.1 คำต่อคำ) */
  faceTh: string;
  /** ลักษณะรูปร่าง (ค.1 คำต่อคำ) */
  bodyTh: string;
  /** คำบรรยายอังกฤษสำหรับ prompt ภาพ (แปลง ค.1 เป็นภาษาภาพเชิงบวก) */
  promptEn: string;
}

export const PHYSIOGNOMY_BY_ELEMENT: Record<Element5, Physiognomy> = {
  Wood: {
    faceTh: "ยาวและแคบ, โหนกแก้มและกรามไม่เด่นชัด",
    bodyTh: "สูงโปร่ง",
    promptEn: "long slender face with soft cheekbones, tall slim graceful build",
  },
  Fire: {
    faceTh: "รูปสามเหลี่ยมหรือรูปไข่, หน้าผากกว้างและสูง, คางเล็กแหลม",
    bodyTh: "ไหล่กว้าง เอวเล็ก",
    promptEn: "oval face with a broad high forehead and delicate pointed chin, broad shoulders with a slim waist",
  },
  Earth: {
    faceTh: "รูปสี่เหลี่ยมจัตุรัส/ผืนผ้า, ใบหน้าใหญ่, มีเนื้อหนาแน่น",
    bodyTh: "โครงร่างใหญ่, แน่น, ดูมั่นคง",
    promptEn: "strong square full face, solid sturdy dependable build",
  },
  Metal: {
    faceTh: "รูปไข่หรือค่อนข้างเหลี่ยมแต่มุมมน, โครงสร้างสมดุล",
    bodyTh: "สมส่วน, ดูแข็งแรง",
    promptEn: "balanced oval face with softly angular refined features, well-proportioned athletic build",
  },
  Water: {
    faceTh: "ใบหน้ากลม, อูม, มีเนื้อเยอะ, หน้ากว้าง, คางสั้น",
    bodyTh: "ท้วม, มีเนื้อ",
    promptEn: "soft round full face with gentle plump friendly features, soft gently curvy figure with radiant supple skin",
  },
};

/** caveat บังคับเมื่อพูดถึงรูปลักษณ์ — เป็นแนวโน้มตามศาสตร์ ไม่ใช่คำระบุตัวบุคคล */
export const APPEARANCE_CAVEAT =
  "รูปลักษณ์เป็นแนวโน้มกว้างๆ ตามหลักโหงวเฮ้ง-ธาตุ (นรลักษณ์กายา) จากตำราต้นทาง — " +
  "ไม่ใช่คำระบุรูปร่างหน้าตาของบุคคลใดบุคคลหนึ่งแน่นอน";

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

/** ชั้นเสริมธาตุจากชื่อผู้ใช้ ↔ ธาตุคู่ (ผู้ใช้เคาะ 23 ส.ค. 2569) —
 *  ตารางกลุ่มอักษร→ธาตุยังรอเจ้าของสูตรยืนยัน จึงเป็นชั้นเสริมพร้อม NAME_TABLE_CAVEAT เสมอ
 *  ไม่ใช่แกนหลักของคำทำนาย (แกนหลัก = ลัคนา/ภพปัตนิ + ธาตุจากวันเกิด ตามตำรา) */
export interface OwnNameLayer {
  elementTh: string;
  fit: WuXingResult;
  /** เลขศาสตร์ชื่อจาก NamePower (สูตร verify กับตัวอย่างตำราแล้ว §5) */
  namePower: number;
  /** การ์ดพลังงาน 00-99 ของเลขชื่อ — ตาราง Master Energy จริง (แบบเดียวการ์ดผลรวมสายเลข) */
  card: { id: string; name: string | null; essence: string | null };
  /** เนื้อคู่ในมุมธาตุจากชื่อ (ผู้ใช้เคาะ 23 ส.ค. 2569) — ธาตุคู่ที่เกื้อหนุนธาตุชื่อที่สุด
   *  แล้วดึง นิสัย (เทมเพลตหลักธาตุ) + รูปร่างหน้าตา (ค.1 ตำราจริง) + สไตล์ (ชั้นเสริม)
   *  ของธาตุนั้น — ทั้งก้อนเป็นชั้นเสริม caveat ตารางอักษร+รูปลักษณ์ครอบอยู่แล้ว
   *  🔴 โหมด match (คนจริง) จงใจไม่มี lens — ไม่ทำนายหน้าตา/นิสัยของบุคคลจริงจากชื่อ
   *  (การตัดสินใจเดิม §15: partnerMatch ไม่ใส่รูปลักษณ์) */
  lens?: {
    partnerElement: Element5;
    partnerElementTh: string;
    relationTh: string;
    traitsTh: string;
    appearance: Physiognomy;
    styleTh: string;
  };
}

/** เลขศาสตร์+การ์ดจากชื่อ — ใช้ร่วมทั้งชื่อผู้ใช้และชื่ออีกฝ่าย */
function nameNumerology(nm: string): { power: number; card: OwnNameLayer["card"] } {
  const power = namePower(nm);
  const c = lookup2digit(reduceTo99(power));
  return { power, card: { id: c.input, name: c.energy_name, essence: c.essence } };
}

function buildOwnNameLayer(
  ownName: string | null | undefined,
  partnerElement: Element5,
  userMissing: Element5[]
): OwnNameLayer | null {
  const nm = ownName?.trim();
  if (!nm) return null;
  const el = nameElement(nm);
  if (!el) return null;
  // มุมเดียวกับเคมีหลัก: ธาตุ(จากชื่อ)ของเรา ↔ ธาตุคู่ · ธาตุที่เราขาด = Productive Clash ได้
  const num = nameNumerology(nm);
  // มุมธาตุชื่อ: จัดอันดับธาตุคู่ที่เกื้อหนุน "ธาตุจากชื่อ" (กลไกเดียวกับ soulmateChemistry)
  const lensRanked = (Object.keys(THAI_LABEL_5) as Element5[])
    .map((cand) => ({ cand, s: wuXingScore(el, cand, [...userMissing]) }))
    .sort((a, b) => b.s.final_score - a.s.final_score)[0];
  return {
    elementTh: THAI_LABEL_5[el],
    fit: wuXingScore(el, partnerElement, [...userMissing]),
    namePower: num.power,
    card: num.card,
    lens: {
      partnerElement: lensRanked.cand,
      partnerElementTh: THAI_LABEL_5[lensRanked.cand],
      relationTh: lensRanked.s.relation_th,
      traitsTh: ELEMENT_PERSONA[lensRanked.cand].นิสัยเด่น,
      appearance: PHYSIOGNOMY_BY_ELEMENT[lensRanked.cand],
      styleTh: OUTFIT_MOOD_TH[lensRanked.cand],
    },
  };
}

export interface SoulmateReading {
  mode: "lagna";
  lagnaSign: ZodiacSign;
  seventhSign: ZodiacSign;
  partner: ZodiacTraits;
  rulers: { name: string; meaning: string }[];
  chemistry: SoulmateChemistry;
  /** แนวโน้มรูปลักษณ์จากธาตุของราศีคู่ — ตาราง ค.1 นรลักษณ์กายา (ตำราจริง) */
  appearance: Physiognomy;
  /** ธาตุจากชื่อผู้ใช้ ↔ ธาตุคู่ (ชั้นเสริม ⚠️) — null เมื่อไม่ให้ชื่อ/อ่านธาตุไม่ได้ */
  nameLayer: OwnNameLayer | null;
  caveats: string[];
}

/** คำทำนายเนื้อคู่ชั้นลัคนา (ต้องมีเวลาเกิด — ลัคนามาจาก calculateAscendant ที่ verify แล้ว) */
export function soulmateReading(
  lagnaSign: ZodiacSign,
  userDominant: Element5,
  userMissing: Element5[],
  ownName?: string | null
): SoulmateReading {
  const seventh = seventhSign(lagnaSign);
  const partner = ZODIAC_TRAITS[seventh];
  const nameLayer = buildOwnNameLayer(ownName, partner.element, userMissing);
  return {
    mode: "lagna",
    lagnaSign,
    seventhSign: seventh,
    partner,
    rulers: partner.rulerIds.map((id) => PLANET_MEANINGS[id]),
    chemistry: soulmateChemistry(userDominant, partner.element, userMissing),
    appearance: PHYSIOGNOMY_BY_ELEMENT[partner.element],
    nameLayer,
    caveats: [SOULMATE_CAVEAT, APPEARANCE_CAVEAT, ...(nameLayer ? [NAME_TABLE_CAVEAT] : []), SOULMATE_SCOPE_NOTE],
  };
}

export interface SoulmateElementReading {
  mode: "element";
  /** อันดับธาตุคู่ + ทิศ (ชั้นเดียวกับ myMatchProfile) */
  rankedElements: SoulmateChemistry["rankedElements"];
  supportDirections: Direction[];
  /** แนวโน้มรูปลักษณ์จากธาตุคู่อันดับ 1 — ตาราง ค.1 */
  appearance: Physiognomy;
  /** ธาตุจากชื่อผู้ใช้ ↔ ธาตุคู่อันดับ 1 (ชั้นเสริม ⚠️) */
  nameLayer: OwnNameLayer | null;
  caveats: string[];
}

/** fallback เมื่อไม่มีเวลาเกิด — ชั้นธาตุล้วน บอกตรงๆ ว่าเป็นคนละชั้นกับลัคนา */
export const SOULMATE_NO_TIME_NOTE =
  "ไม่มีเวลาเกิด จึงคำนวณลัคนา (และราศีคู่ครอง) ไม่ได้ — คำทำนายนี้ใช้ชั้นธาตุประจำตัวแทน " +
  "ถ้าทราบเวลาเกิดภายหลัง กรอกเพิ่มได้เพื่อรับคำทำนายชั้นลัคนาที่ละเอียดกว่า";

export function soulmateElementReading(
  userDominant: Element5,
  userMissing: Element5[],
  ownName?: string | null
): SoulmateElementReading {
  const c = soulmateChemistry(userDominant, userDominant, userMissing);
  const nameLayer = buildOwnNameLayer(ownName, c.rankedElements[0].element, userMissing);
  return {
    mode: "element",
    rankedElements: c.rankedElements,
    supportDirections: c.supportDirections,
    appearance: PHYSIOGNOMY_BY_ELEMENT[c.rankedElements[0].element],
    nameLayer,
    caveats: [SOULMATE_NO_TIME_NOTE, SOULMATE_CAVEAT, APPEARANCE_CAVEAT, ...(nameLayer ? [NAME_TABLE_CAVEAT] : []), SOULMATE_SCOPE_NOTE],
  };
}

// ---------------------------------------------------------------------------
// prompt ภาพเนื้อคู่ (FLUX) — อังกฤษล้วน สุภาพ ผู้ใหญ่เท่านั้น (แบบแผนเดียวกับ logoImagePrompt)
// ---------------------------------------------------------------------------

export type PartnerGender = "male" | "female" | "any";

// สัญชาติ/ภูมิภาคแยกไปอยู่ใน LOOK_STYLES (ผู้ใช้เลือกเอง · default ไทย) — base ไม่ผูกสัญชาติ
const GENDER_PHRASE: Record<PartnerGender, string> = {
  male: "an adult man",
  female: "an adult woman",
  any: "an adult person",
};

/** โทนสี/บรรยากาศตามธาตุของราศีคู่ — เชื่อมกับ ELEMENT ที่คำนวณ ไม่ใช่ให้ AI เดา */
// ปรับ 23 ส.ค. 2569 (feedback ผู้ใช้: ภาพมืด/จัดฉาก/ไม่เป็นธรรมชาติ) — สีธาตุเป็นแค่ "สีเน้น"
// ในเสื้อผ้า/ฉาก ไม่ใช่โทนคุมทั้งภาพ (โทนน้ำเงินเข้มทั้งภาพมาจาก mood เดิมของธาตุน้ำ)
const ELEMENT_ACCENT: Record<Element5, string> = {
  Fire: "warm coral-red",
  Earth: "cream and warm brown",
  Wood: "fresh green",
  Water: "soft sky-blue",
  Metal: "clean white and silver",
};

// ---------------------------------------------------------------------------
// ตัวเลือกรูปลักษณ์ (ผู้ใช้เคาะ 23 ส.ค. 2569 — "แนวดารา") · 🔴 กติกาความปลอดภัย:
// (1) เป็น preset enum เท่านั้น **ไม่มีช่องพิมพ์อิสระ** — กันการอ้างชื่อดารา/คนดังจริง
//     (สิทธิภาพลักษณ์บุคคล + ขัดป้าย "ไม่ใช่บุคคลจริง" + นโยบายผู้ให้บริการโมเดลภาพ)
// (2) เป็น "ตัวเลือกการวาดภาพตามความชอบ" ไม่ใช่คำทำนาย — รูปลักษณ์เนื้อคู่คือหัวข้อที่ตำรา
//     ยังไม่มีข้อมูล (SOULMATE_SCOPE_NOTE) · SOULMATE_LOOK_NOTE ต้องแสดงคู่ตัวเลือกเสมอ
// ---------------------------------------------------------------------------

export const SOULMATE_LOOK_NOTE =
  "ตัวเลือกรูปลักษณ์เป็นการตั้งค่าภาพตามความชอบของคุณเอง ไม่ใช่คำทำนายจากดวง " +
  "(ตำรายังไม่มีข้อมูลรูปลักษณ์เนื้อคู่ — อยู่ระหว่างสอบถามเจ้าของตำรา)";

/** สัญชาติ/สไตล์ลุค (ผู้ใช้เคาะ 23 ส.ค. 2569: แทนโครงหน้า/วัยที่ให้ AI จัดเอง) —
 *  บรรยายเป็น "ลักษณะภูมิภาค+สไตล์" ไม่อ้างอิงบุคคลจริง · default = ไทย */
export const LOOK_STYLES = {
  thai: { th: "ไทย", en: "Thai appearance with warm Southeast Asian features, polished and photogenic" },
  korean: { th: "เกาหลี", en: "Korean appearance in the style of a K-drama lead, clear glowing skin" },
  japanese: { th: "ญี่ปุ่น", en: "Japanese appearance with a clean elegant natural style" },
  chinese: { th: "จีน", en: "Chinese appearance with refined graceful features" },
  western: { th: "ฝรั่ง (ตะวันตก)", en: "Caucasian European appearance, fair skin, well-defined Western facial features" },
  arab: { th: "อาหรับ/ตะวันออกกลาง", en: "Middle Eastern appearance with elegant modest style" },
  indian: { th: "อินเดีย/เอเชียใต้", en: "South Asian appearance with graceful warm features" },
  mixed: { th: "ลูกครึ่ง", en: "mixed Asian-Western appearance, photogenic and charming" },
} as const;
export type LookKey = keyof typeof LOOK_STYLES;

/** โครงหน้า */
export const FACE_STYLES = {
  warm: { th: "อบอุ่น", en: "gentle warm approachable facial features" },
  sweet: { th: "หน้าหวาน", en: "soft sweet charming facial features" },
  sharp: { th: "คมเข้ม", en: "sharp well-defined striking facial features" },
  bright: { th: "สดใส", en: "bright cheerful youthful facial features" },
} as const;
export type FaceKey = keyof typeof FACE_STYLES;

/** ช่วงวัย (ผู้ใหญ่เท่านั้น — สอดคล้องกติกา modest/adult เดิม) */
export const AGE_STYLES = {
  "20s": { th: "วัย 20+", en: "in their mid twenties" },
  "30s": { th: "วัย 30+", en: "in their thirties" },
  "40s": { th: "วัย 40+", en: "in their forties" },
  "50s": { th: "วัย 50+", en: "in their fifties, graceful and dignified" },
} as const;
export type AgeKey = keyof typeof AGE_STYLES;

/**
 * ชุด+อารมณ์ภาพตามธาตุของคู่ (ผู้ใช้เคาะ 23 ส.ค. 2569: "แต่งกาย/อารมณ์ตามแนวคำทำนาย")
 * — แปลงบุคลิกตาม ข.2/ค.1 ของแต่ละกลุ่มธาตุเป็นภาษาภาพ (การแปลงเป็นงานออกแบบ แต่บุคลิกต้นทาง
 * มาจากตำราจริง) · ยังบังคับ modest เสมอ
 */
export const OUTFIT_MOOD_BY_ELEMENT: Record<Element5, { outfitEn: string; moodEn: string }> = {
  // ไม้ (มิถุน/ตุลย์/กุมภ์ — ฉลาด ช่างพูด เข้าสังคม สร้างสรรค์)
  Wood: { outfitEn: "smart casual modern outfit in light fresh tones", moodEn: "sociable cheerful creative mood" },
  // ไฟ (เมษ/สิงห์/ธนู — ผู้นำ มั่นใจ กล้าแสดงออก ผจญภัย)
  Fire: { outfitEn: "confident stylish outfit with bold clean lines", moodEn: "energetic charismatic warm mood" },
  // ดิน (พฤษภ/กันย์/มังกร — สุขุม มั่นคง รับผิดชอบ)
  Earth: { outfitEn: "neat classic timeless outfit", moodEn: "calm dependable grounded mood" },
  // ทอง (สมดุล แข็งแกร่ง ชัดเจน เป็นนักจัดการ — ค.1)
  Metal: { outfitEn: "clean tailored minimal outfit", moodEn: "composed refined confident mood" },
  // น้ำ (กรกฎ/พิจิก/มีน — อ่อนโยน ลึกซึ้ง ช่างฝัน มนุษยสัมพันธ์ดี)
  Water: { outfitEn: "soft comfortable flowing outfit", moodEn: "gentle warm approachable dreamy mood" },
};

/** ฉาก 3 แบบ — ภาพละมุมมอง เพื่อให้แต่ละรูปมีคำบรรยายประจำภาพของตัวเอง (ผู้ใช้ขอ) */
const IMAGE_VARIANT_SCENES: readonly string[] = [
  "close-up portrait near a bright window with soft morning light",
  "half-body lifestyle shot in a bright airy everyday setting, relaxed and approachable",
  "candid outdoor portrait in a sunny park with natural greenery, genuine laughing smile",
];

/**
 * สร้าง prompt ภาพเนื้อคู่จากข้อเท็จจริงที่คำนวณแล้ว (ธาตุของราศีคู่ → สีเน้น)
 * 🔴 บังคับ: สุภาพ (modest clothing) · ผู้ใหญ่ · ไม่มีตัวอักษรในภาพ · สว่าง-ธรรมชาติ-สมจริง
 */
export function soulmateImagePrompt(opts: {
  gender: PartnerGender;
  element: Element5;
  variant?: number;
  /** ตัวเลือกรูปลักษณ์ — รับเฉพาะ key ใน preset (ค่าอื่นถูกเพิกเฉย ไม่มีทางพา free-text เข้า prompt) */
  look?: string | null;
  face?: string | null;
  age?: string | null;
}): string {
  const scene = IMAGE_VARIANT_SCENES[(opts.variant ?? 0) % IMAGE_VARIANT_SCENES.length];
  // default ไทย (พฤติกรรมเดิมของระบบ) — ค่านอก enum ก็ตกมาที่ไทย ไม่มีทางพา free-text เข้า prompt
  const look = opts.look && opts.look in LOOK_STYLES ? LOOK_STYLES[opts.look as LookKey].en : LOOK_STYLES.thai.en;
  const face = opts.face && opts.face in FACE_STYLES ? FACE_STYLES[opts.face as FaceKey].en : null;
  const age = opts.age && opts.age in AGE_STYLES ? AGE_STYLES[opts.age as AgeKey].en : null;
  return (
    `Bright natural photorealistic portrait photograph of ${GENDER_PHRASE[opts.gender]}` +
    (age ? ` ${age}` : "") +
    `, genuine warm smile, ` +
    // รูปหน้า/รูปร่างตามธาตุของคู่ — ตาราง ค.1 นรลักษณ์กายา (ตำราจริง ไม่ใช่ความชอบ)
    `${PHYSIOGNOMY_BY_ELEMENT[opts.element].promptEn}, ` +
    (face ? `${face}, ` : "") +
    `${look}, ` +
    `modest elegant everyday clothing, ${scene}, ` +
    `natural daylight, fresh airy atmosphere, highly detailed natural skin texture with visible pores, subtle skin imperfections, fine facial detail, ` +
    `subtle ${ELEMENT_ACCENT[opts.element]} color accents in clothing or surroundings, ` +
    `no text, no words, no letters, no watermark`
  );
}

/**
 * คำบรรยาย "ลักษณะคู่ที่เข้ากัน" ประจำภาพทั้ง 3 — ถ้อยคำมาจากผลคำนวณล้วน (ข.2/wuXing/ทิศ)
 * ห้ามแต่งลักษณะใหม่ที่ engine ไม่ได้ให้ (§16)
 */
/**
 * prompt คอลลาจรูปเดียว-หลายอิริยาบถ (ผู้ใช้เคาะ 23 ส.ค. 2569 จากภาพอ้างอิงแนว photoshoot
 * หลายมุม) — จุดแข็ง: **คนเดียวกันทุกมุมแน่นอน** (3 รูปแยกแบบเดิมได้คนละหน้า) + ต้นทุนเหลือ
 * 1 gen · เอาเฉพาะ "รูปแบบหลายมุม" ไม่เอาธีม/ป้ายข้อความของภาพอ้างอิง (no-text ตามกติกาเดิม)
 * ชุด+อารมณ์มาจากธาตุคู่ (OUTFIT_MOOD_BY_ELEMENT) · หน้า/รูปร่างจาก ค.1 · ลุคสัญชาติผู้ใช้เลือก
 */
/** สไตล์การแต่งกาย/อารมณ์ตามธาตุ ฉบับภาษาไทย — ความหมายเดียวกับ OUTFIT_MOOD_BY_ELEMENT
 *  (ใช้เล่าในคำทำนาย ส่วนตัวอังกฤษใช้ใน prompt ภาพ — ชั้นเสริม ไม่ใช่ตำราตรง) */
export const OUTFIT_MOOD_TH: Record<Element5, string> = {
  Wood: "สมาร์ทแคชวลโทนสดชื่น · บุคลิกเข้าสังคม ร่าเริง มีความคิดสร้างสรรค์",
  Fire: "แต่งตัวมั่นใจ เส้นสายชัดเจน · บุคลิกมีพลัง มีเสน่ห์ อบอุ่น",
  Earth: "เรียบร้อยคลาสสิกไร้กาลเวลา · บุคลิกสงบ น่าเชื่อถือ มั่นคง",
  Metal: "เรียบคมมินิมัล · บุคลิกนิ่ง สุขุม มั่นใจ",
  Water: "นุ่มสบายพลิ้วไหว · บุคลิกอ่อนโยน อบอุ่น ชวนฝัน",
};

export function soulmateCollagePrompt(opts: {
  gender: PartnerGender;
  element: Element5;
  look?: string | null;
  /** วลีรูปลักษณ์เสริมจากชั้น Jyotish (PLANET_APPEARANCE en — มาจาก enum ของ engine เท่านั้น) */
  extraTraitsEn?: readonly string[];
  /** วลีจากแท็กความชอบของผู้ใช้ (preference-match enum เท่านั้น) — มี = ใช้แทนโครง ค.1
   *  (ภาพเป็น "ตัวเลือกการวาดตามความชอบ" ไม่ใช่คำทำนาย — precedent SOULMATE_LOOK_NOTE) */
  preferenceEn?: readonly string[];
}): string {
  const look = opts.look && opts.look in LOOK_STYLES ? LOOK_STYLES[opts.look as LookKey].en : LOOK_STYLES.thai.en;
  const phys = PHYSIOGNOMY_BY_ELEMENT[opts.element];
  const om = OUTFIT_MOOD_BY_ELEMENT[opts.element];
  return (
    `A professional photo collage of one single person: the same ${GENDER_PHRASE[opts.gender]} shown in four different poses and camera angles arranged in a 2x2 grid — ` +
    `front close-up portrait smiling, side profile view, seated relaxed pose, full-body standing pose with arms crossed showing the body build. ` +
    `Each panel shows that person completely alone, exactly one person per panel, never two people together. ` +
    `The person fills most of each panel, tightly framed with the head near the top edge, minimal empty background space above the head. ` +
    `Identical face, identical hairstyle and identical outfit in every panel, consistent studio lighting, ` +
    `bright clean light studio background with subtle ${ELEMENT_ACCENT[opts.element]} color accents, ` +
    `${opts.preferenceEn && opts.preferenceEn.length ? opts.preferenceEn.join(", ") : phys.promptEn}, ${look}, ` +
    (opts.extraTraitsEn && opts.extraTraitsEn.length ? `${opts.extraTraitsEn.join(", ")}, ` : "") +
    `modest ${om.outfitEn}, ${om.moodEn}, genuine warm smile, ` +
    `highly detailed natural skin texture with visible pores, photorealistic, ` +
    `no text, no words, no letters, no watermark`
  );
}

export function soulmateImageCaptions(reading: SoulmateReading | SoulmateElementReading): [string, string, string] {
  if (reading.mode === "lagna") {
    const p = reading.partner;
    const dirs = reading.chemistry.supportDirections.slice(0, 3).join("/");
    const phys = PHYSIOGNOMY_BY_ELEMENT[p.element];
    return [
      `นิสัยเด่นของคู่: ${p.traits} (ราศี${reading.seventhSign} · ธาตุ${THAI_LABEL_5[p.element]}) · แนวโน้มรูปลักษณ์ตามนรลักษณ์: ใบหน้า${phys.faceTh} · รูปร่าง${phys.bodyTh}`,
      `จุดแข็งเมื่ออยู่ด้วยกัน: ${p.strengths}`,
      `เคมีธาตุ: ${reading.chemistry.score.relation_th}${dirs ? ` · พลังเกื้อหนุนอยู่ทางทิศ${dirs}` : ""}`,
    ];
  }
  const top = reading.rankedElements[0];
  const second = reading.rankedElements[1];
  const dirs = reading.supportDirections.slice(0, 3).join("/");
  return [
    `คู่ธาตุ${top.thai} เกื้อหนุนคุณที่สุด (${top.score > 0 ? "+" : ""}${top.score}) — ${top.relation}`,
    `รองลงมาคือคู่ธาตุ${second.thai} (${second.score > 0 ? "+" : ""}${second.score}) — ${second.relation}`,
    `พลังเกื้อหนุนอยู่ทางทิศ${dirs || "—"} (จากธาตุที่เข้ากับคุณที่สุด)`,
  ];
}

// ---------------------------------------------------------------------------
// เช็คกับคนที่คุณสนใจ (ผู้ใช้เคาะ 23 ส.ค. 2569) — วันเกิดเขา (บังคับ) + เวลาเกิด/ชื่อ (ไม่บังคับ)
// ประกอบจากชิ้นที่มีอยู่ทั้งหมด: personSeedFromBirthDate (ElementSeed จริง) · เลขตัวตน→5 ด้าน
// (มุมผู้ใช้เป็นศูนย์กลาง — แบบเดียวกับโหมดองค์รวม) · ภพปัตนิเช็คไขว้ (seventhSign เป็น involution:
// ตรงทางเดียว = ตรงซึ่งกันและกันเสมอ จึงรายงานเป็น "ตรงกันทั้งสองทาง" ค่าเดียว) ·
// ธาตุชื่อ (⚠️ตารางยังไม่ verify — caveat บังคับ) · 🔴 ไม่รับรูปถ่ายบุคคลที่สาม (ชีวมิติ
// เจ้าตัวไม่ได้ยินยอม + Logic 5/6 ยังไม่มีสูตร)
// ---------------------------------------------------------------------------

import {
  personSeedFromBirthDate,
  birthPowerNumber,
  partAspects,
  analyzeCoherence,
  holisticAdvice,
  type HolisticPart,
  type AspectCoherence,
  type HolisticAdvice,
} from "./network-holistic";
import { nameElement } from "./naming";
import { namePower, reduceTo99 } from "./card-id";
import { ELEMENT_PERSONA } from "./first-reading";
import { lookup2digit } from "./numerology";

/** ข้อมูลอีกฝ่ายใช้คำนวณชั่วขณะเท่านั้น — ประกาศบนหน้า + ห้ามเก็บลง DB/ความจำ (มีเทสต์ล็อกข้อความ) */
export const PARTNER_PRIVACY_NOTE =
  "ข้อมูลของอีกฝ่าย (วันเกิด/เวลาเกิด/ชื่อ) ใช้คำนวณชั่วขณะเท่านั้น ระบบไม่จัดเก็บ";

export const NAME_TABLE_CAVEAT =
  "ธาตุจากชื่อใช้เกณฑ์เลขกลุ่มอักษร→ดาวประจำเลข→ธาตุประจำวันตามตำรา — เป็นชั้นเสริมประกอบ";

export interface PartnerMatchResult {
  partner: {
    dominantTh: string;
    missingTh: string[];
    identityNumber: string;
    lagnaSign: ZodiacSign | null;
  };
  /** เคมีธาตุคุณ↔เขา — มุมเดียวกับทั้งระบบ wuXingScore(ธาตุคุณ, ธาตุเขา, ธาตุที่คุณขาด) */
  chemistry: WuXingResult;
  /** ความสอดคล้อง 5 ด้านจากเลขตัวตนทั้งคู่ (สูตรเสริม — caveat เดิมของ numberAspects) */
  parts: HolisticPart[];
  coherence: AspectCoherence[];
  /** ภพปัตนิเช็คไขว้ — null เมื่อลัคนาฝ่ายใดฝ่ายหนึ่งไม่ทราบ (ไม่เดา) */
  patni: { userSeventh: ZodiacSign; partnerLagna: ZodiacSign; match: boolean } | null;
  /** ธาตุ+เลขศาสตร์+การ์ดจากชื่อเขา (ชั้นเสริม ⚠️) — null เมื่อไม่ให้ชื่อ/อ่านธาตุไม่ได้ */
  nameLayer: OwnNameLayer | null;
  advice: HolisticAdvice;
  caveats: string[];
}

export function partnerMatchReading(input: {
  userDominant: Element5;
  userMissing: Element5[];
  userBirthDate: string;
  userLagna?: ZodiacSign | null;
  partnerBirthDate: string;
  partnerLagna?: ZodiacSign | null;
  partnerName?: string | null;
}): PartnerMatchResult | null {
  const pSeed = personSeedFromBirthDate(input.partnerBirthDate);
  if (!pSeed) return null;
  const partnerElement = pSeed.dominant as Element5;

  const chemistry = wuXingScore(input.userDominant, partnerElement, [...input.userMissing]);

  // คะแนน 5 ด้านจากเลขตัวตนทั้งคู่ (มุมผู้ใช้เป็นศูนย์กลาง — convention เดียวกับโหมดองค์รวม)
  const userNum = String(birthPowerNumber(input.userBirthDate)).padStart(2, "0");
  const partnerNum = String(birthPowerNumber(input.partnerBirthDate)).padStart(2, "0");
  const parts: HolisticPart[] = [
    {
      label: `ตัวคุณ (เลขตัวตน ${userNum})`,
      icon: "👤",
      aspects: partAspects({ digits: userNum, letters: null }, input.userDominant, input.userMissing),
      chemistry: null,
      element: null,
    },
    {
      label: `เขา (เลขตัวตน ${partnerNum})`,
      icon: "💗",
      aspects: partAspects({ digits: partnerNum, letters: null }, input.userDominant, input.userMissing),
      chemistry,
      element: partnerElement,
      personMissing: pSeed.missing_th,
    },
  ];
  const coherence = analyzeCoherence(parts);
  const advice = holisticAdvice(parts, coherence, input.userDominant);

  // ภพปัตนิเช็คไขว้ — seventhSign เป็น involution จึง "ตรงทางเดียว = ตรงสองทางเสมอ"
  let patni: PartnerMatchResult["patni"] = null;
  if (input.userLagna && input.partnerLagna) {
    const userSeventh = seventhSign(input.userLagna);
    patni = { userSeventh, partnerLagna: input.partnerLagna, match: userSeventh === input.partnerLagna };
    if (patni.match) {
      advice.strengths.unshift(
        `💞 ลัคนาของเขา (ราศี${input.partnerLagna}) ตรงกับภพคู่ครอง (ปัตนิ) ของคุณพอดี — และโดยโครงสร้างราศี ลัคนาของคุณก็อยู่ในภพคู่ครองของเขาเช่นกัน (ตรงตามตำราทั้งสองทาง)`
      );
    }
  }

  // ธาตุชื่อ (ชั้นเสริม — ตารางยังไม่ verify)
  let nameLayer: PartnerMatchResult["nameLayer"] = null;
  const nm = input.partnerName?.trim();
  if (nm) {
    const el = nameElement(nm);
    if (el) {
      const num = nameNumerology(nm);
      nameLayer = { elementTh: THAI_LABEL_5[el], fit: wuXingScore(input.userDominant, el, [...input.userMissing]), namePower: num.power, card: num.card };
    }
  }

  const caveats = [
    ...advice.caveats,
    SOULMATE_CAVEAT,
    "อ่านเป็นความเข้ากันของพลังงานเท่านั้น — ไม่ใช่คำตัดสินความสัมพันธ์หรือตัวบุคคล",
    PARTNER_PRIVACY_NOTE,
    ...(nameLayer ? [NAME_TABLE_CAVEAT] : []),
  ];

  return {
    partner: {
      dominantTh: THAI_LABEL_5[partnerElement],
      missingTh: pSeed.missing_th,
      identityNumber: partnerNum,
      lagnaSign: input.partnerLagna ?? null,
    },
    chemistry,
    parts,
    coherence,
    patni,
    nameLayer,
    advice,
    caveats,
  };
}


// ---------------------------------------------------------------------------
// สองเส้นทางเนื้อคู่ (Dual Path — ผู้ใช้เคาะ 25 ส.ค. 2569)
// เมื่อ "ทางที่ตำราชี้" กับ "ทางที่ใจผู้ใช้เลือก" เป็นคนละธาตุ → เล่าสองทางเทียบกัน
// แล้วให้เจ้าของดวงเลือกเอง (รวมถึงเลือกสร้างภาพตามแบบ ก หรือ ข)
// 🔴 ไม่ใช่สูตรใหม่ — รันเอนจินเดิม (ค.1/persona/wuXing/ทิศ) ทางละธาตุ · ทางตำราติดป้ายแกนหลักเสมอ
// ---------------------------------------------------------------------------

export interface SoulmatePath {
  key: "ก" | "ข";
  element: Element5;
  elementTh: string;
  /** ที่มาของเส้นทาง — ทางตำรา (ภพปัตนิ) หรือทางที่ใจเลือก (ดวงรองรับผ่านเคมี) */
  sourceTh: string;
  chemistry: WuXingResult;
  traitsTh: string;
  appearance: Physiognomy;
  styleTh: string;
  supportDirections: Direction[];
}

export interface SoulmateDualPath {
  a: SoulmatePath; // ก = ทางตำรา
  b: SoulmatePath; // ข = ทางที่ใจเลือก
  comparisonTh: string;
  caveats: string[];
}

export const DUAL_PATH_CAVEAT =
  "สองเส้นทางคือการอ่านดวงเดียวกันคนละเส้นทาง — ทางตำรา (ภพปัตนิ) เป็นแกนหลักเสมอ " +
  "ส่วนทางที่ใจเลือกคือเส้นที่ดวงรองรับผ่านเคมีธาตุ · การเลือกเป็นของเจ้าของดวง ระบบไม่เลือกแทน";

function buildPath(key: "ก" | "ข", el: Element5, sourceTh: string, userDominant: Element5, userMissing: Element5[]): SoulmatePath {
  return {
    key,
    element: el,
    elementTh: THAI_LABEL_5[el],
    sourceTh,
    chemistry: wuXingScore(userDominant, el, [...userMissing]),
    traitsTh: ELEMENT_PERSONA[el].นิสัยเด่น,
    appearance: PHYSIOGNOMY_BY_ELEMENT[el],
    styleTh: OUTFIT_MOOD_TH[el],
    supportDirections: ALL_DIRECTIONS.filter((d) => DIRECTION_TO_ELEMENT[d] === el),
  };
}

/**
 * สองเส้นทางเนื้อคู่ — คืน null เมื่อไม่มีทางแยกจริง (ธาตุที่ใจเลือกตรงกับทางตำรา หรือไม่ได้ระบุ)
 * @param tamraElement ธาตุจากภพปัตนิ (หรืออันดับ 1 ของโหมดธาตุ)
 * @param preferredElement ธาตุจากสเปกที่ผู้ใช้เลือก (แท็ก body/face — enum ของ engine เท่านั้น)
 */
export function soulmateDualPath(
  userDominant: Element5,
  userMissing: Element5[],
  tamraElement: Element5,
  preferredElement: Element5 | null | undefined,
  sourceBTh?: string
): SoulmateDualPath | null {
  if (!preferredElement || preferredElement === tamraElement) return null;
  const a = buildPath("ก", tamraElement, "ทางที่ตำราชี้ (เรือนคู่ครอง — ชั้นหลัก)", userDominant, userMissing);
  const b = buildPath("ข", preferredElement, sourceBTh ?? "ทางที่ใจคุณเลือก (จากสเปกที่ระบุ — ดวงรองรับผ่านเคมีธาตุ)", userDominant, userMissing);
  const sa = a.chemistry.final_score, sb = b.chemistry.final_score;
  const comparisonTh =
    sa === sb
      ? `ทั้งสองทางได้เคมีเท่ากัน (${sa >= 0 ? "+" : ""}${sa}) — ต่างกันที่ "แบบของความเกื้อหนุน": ` +
        `ทาง ก ${a.chemistry.relation_th} · ทาง ข ${b.chemistry.relation_th} — เลือกตามใจได้โดยไม่ฝืนดวง`
      : sa > sb
        ? `ทาง ก (ตำรา) เคมีสูงกว่า (${sa >= 0 ? "+" : ""}${sa} เทียบ ${sb >= 0 ? "+" : ""}${sb}) — ` +
          `ทาง ข ยังเดินได้ เพียงต้องอาศัยการดูแลกันมากขึ้น`
        : `ทาง ข (ใจเลือก) เคมีสูงกว่า (${sb >= 0 ? "+" : ""}${sb} เทียบ ${sa >= 0 ? "+" : ""}${sa}) — ` +
          `ส่วนทาง ก มีน้ำหนักของตำราหนุน — สองมุมคนละแบบ ไม่หักล้างกัน`;
  return { a, b, comparisonTh, caveats: [DUAL_PATH_CAVEAT, APPEARANCE_CAVEAT] };
}
