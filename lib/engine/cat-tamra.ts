/**
 * ดูดวงแมว — ตำราแมวศุภลักษณ์ (สมุดข่อยโบราณ) + ชั้นธาตุ (เฟส 1 · ผู้ใช้เคาะ 6 ก.ย. 2569
 * "เริ่มตามความเหมาะสม" → ตัดสิน: เล่าเฉพาะด้านมงคล ไม่มีคำตัดสินร้าย + เริ่มฟอร์มเลือกลักษณะ)
 *
 * แหล่งข้อมูล (งานวิจัย cross-check 6 ก.ย. 2569 — รายละเอียดใน CLAUDE.md):
 * - รายชื่อแมวมงคล 17 ชนิด: silpa-mag (article_160290) · mthai · lib.ru.ac.th · th.wikipedia — ตรงกัน
 * - ลักษณะรายชนิด: ตำราแมววัดอนงคาราม (ฉบับที่ catdumb คัดลอก) cross-check กับ lib.ru.ac.th
 *   ในชนิดที่ยังเหลือในปัจจุบัน 6 ชนิด (วิเชียรมาศ/ศุภลักษณ์/สีสวาด/โกญจา/แซมเสวตร/ขาวมณี) ตรงกัน
 * - คุณที่ให้รายชนิด: mthai (371168 "พุทธคุณแมวมงคล 17 ชนิด")
 *
 * 🔴 ธรรมเนียม/ข้อจำกัดที่ประกาศ (CAT_TAMRA_CAVEAT):
 * - **ขาวมณีไม่อยู่ในสมุดข่อย** (แมวไทยยุคหลัง) แต่หลายแหล่งนับรวม → ใส่พร้อมป้าย inTamra=false
 * - ตำรามีหมวด "แมวให้โทษ" 6 ชื่อ แต่**ไม่มีแหล่งไหนให้ลักษณะละเอียด** และผู้ใช้ตัดสินให้เล่าเฉพาะ
 *   ด้านมงคล → ระบบ**ไม่จำแนกแมวเป็นแมวร้ายเด็ดขาด** (เทสต์ regex ล็อกทุก string) · แมวที่ไม่ตรง
 *   17 ชนิด = "แมวทั่วไป" พร้อมชั้นธาตุตามสี ไม่ใช่คำตัดสิน
 * - ชั้นธาตุจากสีขน = COLOR_TO_ELEMENT (ตารางฮวงจุ้ยของระบบ) — ชั้นเสริม ไม่ใช่ตำราแมวโดยตรง
 * - ไม่เกี่ยวกับสุขภาพ/พฤติกรรมสัตว์ — ห้ามคำแนะนำทางสัตวแพทย์
 */

import { wuXingScore, THAI_LABEL_5, type Element5, type WuXingResult } from "./element";
import { COLOR_TO_ELEMENT, ELEMENT_TO_COLORS } from "./fengshui";
import { nameElement } from "./naming";
import { bridgeElement } from "./network-holistic";

// ---------------------------------------------------------------------------
// ตัวเลือกลักษณะที่เจ้าของสังเกตเองได้ (preset enum — ค่านอก enum ถูกเพิกเฉย)
// ---------------------------------------------------------------------------

export const CAT_COATS = {
  white_solid: { th: "ขาวล้วนทั้งตัว", colorTh: "ขาว" },
  black_solid: { th: "ดำล้วนทั้งตัว", colorTh: "ดำ" },
  black_white_marks: { th: "ดำเป็นหลัก มีขาวเป็นแต้ม/แถบ", colorTh: "ดำ" },
  white_black_marks: { th: "ขาวเป็นหลัก มีแต้ม/ลายดำ", colorTh: "ขาว" },
  gray_silver: { th: "เทาเงิน (สีสวาด) ทั้งตัว", colorTh: "เทา" },
  copper_brown: { th: "น้ำตาลทองแดงทั้งตัว", colorTh: "น้ำตาล" },
  cream_points: { th: "ครีม/ขาว แต้มเข้มที่หน้า หู เท้า หาง", colorTh: "ครีม" },
  orange: { th: "ส้ม/เหลืองทอง", colorTh: "ส้ม" },
  tabby: { th: "ลายสลิด/ลายเสือ", colorTh: "น้ำตาล" },
  calico: { th: "สามสี/ด่างหลายสี", colorTh: null },
  other: { th: "อื่นๆ", colorTh: null },
} as const;
export type CatCoat = keyof typeof CAT_COATS;

/** ตำแหน่งแต้ม/ลายเสริม — ใช้แยกชนิดในกลุ่มดำ-ขาว / ขาว-ดำ */
export const CAT_MARKS = {
  none: { th: "ไม่มี/ไม่แน่ใจ" },
  white_collar: { th: "ขาวรอบคอเป็นปลอกคอ" },
  white_collar_mouth: { th: "ขาวรอบคอและรอบปาก" },
  white_mouth: { th: "ขาวรอบปาก/คาง" },
  white_paws4: { th: "ปลายเท้าขาวทั้ง 4 ข้าง" },
  white_nose_dot: { th: "จุดขาวที่จมูก" },
  white_ears: { th: "หูขาว" },
  white_speckled: { th: "ขนขาวแซมทั่วตัว" },
  white_chest_belly_face: { th: "แถบขาวที่อก ท้อง และหน้า" },
  white_stripe_back: { th: "แถบขาวยาวตามหลัง" },
  nine_black_spots: { th: "แต้มดำ 9 จุด (หัว คอ ไหล่ โคนขา โคนหาง)" },
  black_eye_rings: { th: "ลายดำรอบดวงตาเหมือนกรอบแว่น" },
  black_chest_band: { th: "แถบดำรอบอก" },
} as const;
export type CatMark = keyof typeof CAT_MARKS;

export const CAT_EYES = {
  unknown: { th: "ไม่แน่ใจ" },
  blue: { th: "ฟ้า" },
  amber: { th: "เหลืองอำพัน/ทอง" },
  green: { th: "เขียว/เหลืองอมเขียว" },
  odd: { th: "สองสี (ตาข้างละสี)" },
  dark: { th: "ดำ/เข้ม" },
} as const;
export type CatEye = keyof typeof CAT_EYES;

// ---------------------------------------------------------------------------
// ตาราง 17 ชนิด (+ขาวมณี) — ถ้อยคำลักษณะ/คุณ ยึดตามแหล่งที่ cross-check (ไม่แต่งเพิ่ม)
// ---------------------------------------------------------------------------

export interface CatBreed {
  key: string;
  nameTh: string;
  aliasTh?: string;
  traitsTh: string;
  eyeTh: string;
  boonTh: string;
  /** อยู่ในสมุดข่อยตำราแมวโบราณ 17 ชนิด (false = แมวไทยยุคหลังที่นิยมนับรวม) */
  inTamra: boolean;
  /** กติกาจับคู่จากลักษณะที่เจ้าของเลือก */
  match: { coat: CatCoat; mark?: CatMark; eye?: CatEye };
  expectedEye?: CatEye;
}

export const CAT_TAMRA: readonly CatBreed[] = [
  { key: "wichienmat", nameTh: "วิเชียรมาศ", aliasTh: "แมวสยาม",
    traitsTh: "ขนสีขาว/ครีม มีแต้มสีน้ำตาลเข้ม 9 แห่ง ที่หน้า หูสองข้าง เท้าทั้งสี่ หาง และอวัยวะเพศ",
    eyeTh: "ฟ้าสดใส", boonTh: "โชคก้อนโตแก่เจ้าของ", inTamra: true,
    match: { coat: "cream_points" }, expectedEye: "blue" },
  { key: "supalak", nameTh: "ศุภลักษณ์", aliasTh: "ทองแดง",
    traitsTh: "ขนสีทองแดง/น้ำตาลเข้มคล้ายสนิมตลอดตัว หู หน้า และปลายขาเข้มกว่า",
    eyeTh: "เหลืองอำพันเป็นประกาย", boonTh: "โชคลาภ ยศถาบรรดาศักดิ์ เหมาะกับธุรกิจ-ค้าขาย", inTamra: true,
    match: { coat: "copper_brown" }, expectedEye: "amber" },
  { key: "malet", nameTh: "สีสวาด", aliasTh: "มาเลศ / โคราช / ดอกเลา",
    traitsTh: "ขนสีเทาเงินดุจเมฆยามฟ้าครึ้มฝนตลอดตัว หัวรูปหัวใจ",
    eyeTh: "เขียวสดใสหรือเหลืองอำพัน", boonTh: "ผู้หลักผู้ใหญ่คอยอุปถัมภ์", inTamra: true,
    match: { coat: "gray_silver" }, expectedEye: "green" },
  { key: "konja", nameTh: "โกญจา", aliasTh: "โกนจา",
    traitsTh: "ขนสั้นสีดำตลอดตัว หัวกลม", eyeTh: "เหลืองอมเขียว",
    boonTh: "อำนาจวาสนา เป็นที่ชื่นชอบของเจ้านาย", inTamra: true,
    match: { coat: "black_solid" }, expectedEye: "green" },
  { key: "nilarat", nameTh: "นิลรัตน์",
    traitsTh: "ดำสนิททั้งตัว หางยาว (ตำราว่าดำถึงเล็บ ลิ้น และดวงตา)", eyeTh: "ดำ/เข้ม",
    boonTh: "เจริญ มีทรัพย์ ปราศจากอันตราย", inTamra: true,
    match: { coat: "black_solid", eye: "dark" }, expectedEye: "dark" },
  { key: "wilat", nameTh: "วิลาศ",
    traitsTh: "ขนดำ มีแถบสีขาวที่อก ท้อง และหน้า", eyeTh: "เขียว",
    boonTh: "เจ้าคนนายคน มีเงินทองมากมาย", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_chest_belly_face" }, expectedEye: "green" },
  { key: "kaotaem", nameTh: "เก้าแต้ม",
    traitsTh: "ขนสีขาว มีแต้มดำ 9 แห่ง: หัว คอ ไหล่สองข้าง โคนขาทั้งสี่ และโคนหาง", eyeTh: "ตามตำราไม่ระบุ",
    boonTh: "รุ่งเรืองทางการค้าขาย", inTamra: true,
    match: { coat: "white_black_marks", mark: "nine_black_spots" } },
  { key: "saemsawet", nameTh: "แซมเสวตร", aliasTh: "แซมเศวต",
    traitsTh: "ขนสีดำแซมด้วยขนขาวทั่วตัว ขนบาง", eyeTh: "เขียวอมเหลืองดุจแสงหิ่งห้อย",
    boonTh: "ให้คุณหนักหนา (ตำราถือเป็นแมวหายาก)", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_speckled" }, expectedEye: "green" },
  { key: "rattanakampon", nameTh: "รัตนกำพล", aliasTh: "รัตนกัมพล",
    traitsTh: "ขนขาวดุจไข่มุก มีแถบดำรอบอก", eyeTh: "ทอง/อำพัน",
    boonTh: "มียศ ผู้อื่นยำเกรง", inTamra: true,
    match: { coat: "white_black_marks", mark: "black_chest_band" }, expectedEye: "amber" },
  { key: "nilajak", nameTh: "นิลจักร",
    traitsTh: "ขนดำสนิท มีแถบขาวรอบคอเป็นปลอกคอ", eyeTh: "ตามตำราไม่ระบุ",
    boonTh: "มีทรัพย์มาก", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_collar" } },
  { key: "mulila", nameTh: "มุลิลา",
    traitsTh: "ขนดำขลับเป็นมัน หูสีขาว", eyeTh: "เหลือง",
    boonTh: "การเล่าเรียนดีสมปรารถนา (ตำราว่าเหมาะกับนักบวช)", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_ears" }, expectedEye: "amber" },
  { key: "krobwaen", nameTh: "กรอบแว่น", aliasTh: "อานม้า",
    traitsTh: "ขนขาว มีลายดำรอบดวงตาเหมือนกรอบแว่น", eyeTh: "ตามตำราไม่ระบุ",
    boonTh: "ให้เกียรติยศแก่เจ้าของ", inTamra: true,
    match: { coat: "white_black_marks", mark: "black_eye_rings" } },
  { key: "patsawet", nameTh: "ปัดเสวตร", aliasTh: "ปัดตลอด",
    traitsTh: "ขนดำเป็นมัน มีแถบขาวยาวตามหลัง", eyeTh: "เหลืองเป็นประกาย",
    boonTh: "เจริญ ลาภยศ", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_stripe_back" }, expectedEye: "amber" },
  { key: "krajok", nameTh: "กระจอก",
    traitsTh: "ขนสั้นสีดำ มีขาวรอบปาก", eyeTh: "เหลืองอมเขียว",
    boonTh: "ที่ดิน เงินทอง เป็นเจ้านายคน", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_mouth" }, expectedEye: "green" },
  { key: "singhasep", nameTh: "สิงหเสพย์",
    traitsTh: "ขนสั้นสีดำ มีขาวรอบคอและรอบปาก", eyeTh: "เหลืองอมเขียว",
    boonTh: "สิริมงคลแก่เรือน", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_collar_mouth" }, expectedEye: "green" },
  { key: "karawek", nameTh: "การเวก",
    traitsTh: "ขนดำทั้งตัว มีจุดขาวที่จมูก", eyeTh: "เหลืองอำพัน",
    boonTh: "ลาภยศและบรรดาศักดิ์", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_nose_dot" }, expectedEye: "amber" },
  { key: "jatubot", nameTh: "จตุบท",
    traitsTh: "ขนดำ ปลายเท้าขาวทั้ง 4 ข้าง", eyeTh: "เหลือง",
    boonTh: "ให้คุณแก่ผู้เลี้ยง (ตำราว่าเหมาะกับบุคคลชั้นสูง)", inTamra: true,
    match: { coat: "black_white_marks", mark: "white_paws4" }, expectedEye: "amber" },
  { key: "khaomanee", nameTh: "ขาวมณี", aliasTh: "ขาวปลอด",
    traitsTh: "ขนสั้นสีขาวตลอดตัว", eyeTh: "ฟ้า เหลืองอำพัน หรือสองสี",
    boonTh: "แมวไทยยุคหลัง — ความเชื่อทั่วไปถือเป็นแมวมงคลนำโชค (ไม่อยู่ในสมุดข่อย 17 ชนิด)", inTamra: false,
    match: { coat: "white_solid" } },
];

export const CAT_TAMRA_CAVEAT =
  "อ้างอิงตำราแมวศุภลักษณ์ (สมุดข่อยโบราณ) ฉบับที่เผยแพร่ทั่วไป — แต่ละสำนัก/ฉบับอาจนับชนิดและ" +
  "ถ้อยคำต่างกันบ้าง · ขาวมณีเป็นแมวไทยยุคหลังที่นิยมนับรวม · ระบบเล่าเฉพาะด้านมงคลตามตำรา " +
  "ไม่มีคำตัดสินว่าแมวตัวใดไม่ดี — แมวทุกตัวเป็นมงคลกับคนที่รักมัน · ไม่เกี่ยวกับสุขภาพหรือ" +
  "พฤติกรรมสัตว์ (เรื่องสุขภาพปรึกษาสัตวแพทย์)";

export const CAT_ELEMENT_NOTE =
  "ธาตุของแมวประเมินจากสีขนหลักตามตารางสี→ธาตุของระบบ (ชั้นเสริม ไม่ใช่ตำราแมวโดยตรง)";

// ---------------------------------------------------------------------------
// จับคู่ชนิดตำรา
// ---------------------------------------------------------------------------

export interface CatMatch {
  breed: CatBreed | null;
  /** ตาที่เลือกต่างจากตำรา (ยังจับคู่ให้ แต่บอกตรงๆ) */
  eyeNoteTh: string | null;
}

export function matchCatTamra(coatRaw: string, markRaw?: string | null, eyeRaw?: string | null): CatMatch {
  const coat = (coatRaw in CAT_COATS ? coatRaw : "other") as CatCoat;
  const mark = (markRaw && markRaw in CAT_MARKS ? markRaw : "none") as CatMark;
  const eye = (eyeRaw && eyeRaw in CAT_EYES ? eyeRaw : "unknown") as CatEye;

  const candidates = CAT_TAMRA.filter((b) => b.match.coat === coat);
  let breed: CatBreed | null = null;
  if (candidates.length === 1 && !candidates[0].match.mark && !candidates[0].match.eye) {
    breed = candidates[0];
  } else if (candidates.length) {
    // กลุ่มที่ต้องแยกด้วยแต้ม/ตา: ตรง mark ก่อน · กลุ่มดำล้วนแยกด้วยตา (นิลรัตน์=ตาดำ · โกญจา=อื่น)
    breed =
      candidates.find((b) => b.match.mark && b.match.mark === mark) ??
      candidates.find((b) => b.match.eye && b.match.eye === eye) ??
      candidates.find((b) => !b.match.mark && !b.match.eye) ??
      null;
  }
  let eyeNoteTh: string | null = null;
  if (breed && breed.expectedEye && eye !== "unknown" && eye !== breed.expectedEye) {
    eyeNoteTh = `ตำราระบุตา${breed.eyeTh} — ตาที่เลือกต่างออกไป จึงอ่านเป็น "ใกล้เคียง${breed.nameTh}"`;
  }
  return { breed, eyeNoteTh };
}

// ---------------------------------------------------------------------------
// ชั้นธาตุ + เคมีกับเจ้าของ + คำอ่านรวม
// ---------------------------------------------------------------------------

export function catElementFromCoat(coatRaw: string): { element: Element5; colorTh: string } | null {
  const coat = (coatRaw in CAT_COATS ? coatRaw : "other") as CatCoat;
  const colorTh = CAT_COATS[coat].colorTh;
  if (!colorTh) return null;
  const el = COLOR_TO_ELEMENT[colorTh];
  return el ? { element: el, colorTh } : null;
}

export interface CatReading {
  match: CatMatch;
  /** ชื่อที่ใช้เรียกผลลัพธ์ (ชื่อชนิดตำรา หรือ "แมวทั่วไป") */
  titleTh: string;
  boonTh: string;
  traitsTh: string;
  inTamra: boolean;
  element: { element: Element5; elementTh: string; colorTh: string } | null;
  /** เคมีธาตุแมว↔เจ้าของ — มุมเดียวกับทั้งระบบ wuXingScore(ธาตุเจ้าของ, ธาตุแมว, ธาตุที่เจ้าของขาด) */
  chemistry: WuXingResult | null;
  /** สีของใช้แมว (ปลอกคอ/ที่นอน) จากตารางสีธาตุ — พิฆาต=ธาตุสะพาน · อื่น=ธาตุแมวเอง */
  colorTipTh: string | null;
  /** ชื่อแมว → ธาตุ (Logic 19 ตาราง ทาง ค) — ชั้นเสริม */
  nameLayer: { elementTh: string; fit: WuXingResult } | null;
  caveats: string[];
}

export function catReading(input: {
  coat: string;
  mark?: string | null;
  eye?: string | null;
  catName?: string | null;
  owner?: { dominant: Element5; missing: Element5[] } | null;
}): CatReading {
  const match = matchCatTamra(input.coat, input.mark, input.eye);
  const b = match.breed;
  const elInfo = catElementFromCoat(input.coat);
  const element = elInfo ? { element: elInfo.element, elementTh: THAI_LABEL_5[elInfo.element], colorTh: elInfo.colorTh } : null;

  const chemistry =
    input.owner && element ? wuXingScore(input.owner.dominant, element.element, [...input.owner.missing]) : null;

  let colorTipTh: string | null = null;
  if (element) {
    if (chemistry && chemistry.final_score < 0 && input.owner) {
      const bridge = bridgeElement(input.owner.dominant, element.element);
      if (bridge) {
        colorTipTh = `สีของใช้แมว (ปลอกคอ/ที่นอน/ชาม) แนะโทนธาตุ${THAI_LABEL_5[bridge]}: ${ELEMENT_TO_COLORS[bridge].slice(0, 3).join("/")} — ธาตุสะพานผ่อนแรงปะทะระหว่างธาตุคุณกับธาตุแมว`;
      }
    } else {
      colorTipTh = `สีของใช้แมวที่เสริมธาตุ${element.elementTh}ของแมว: ${ELEMENT_TO_COLORS[element.element].slice(0, 3).join("/")}`;
    }
  }

  let nameLayer: CatReading["nameLayer"] = null;
  if (input.catName && input.catName.trim() && input.owner) {
    const nEl = nameElement(input.catName.trim());
    if (nEl) nameLayer = { elementTh: THAI_LABEL_5[nEl], fit: wuXingScore(input.owner.dominant, nEl, [...input.owner.missing]) };
  }

  const caveats = [CAT_TAMRA_CAVEAT];
  if (element) caveats.push(CAT_ELEMENT_NOTE);

  return {
    match,
    titleTh: b ? b.nameTh + (b.aliasTh ? ` (${b.aliasTh})` : "") : "แมวทั่วไป (นอกรายการ 17 ชนิดในตำรา)",
    boonTh: b
      ? b.boonTh
      : "ตำราศุภลักษณ์ระบุลักษณะเฉพาะ 17 แบบ — ลักษณะนี้ไม่ตรงชนิดใด แต่ตำราไม่ได้กล่าวว่าไม่ดี " +
        "ดูความเข้ากันผ่านชั้นธาตุจากสีขนแทน",
    traitsTh: b ? b.traitsTh : CAT_COATS[(input.coat in CAT_COATS ? input.coat : "other") as CatCoat].th,
    inTamra: b?.inTamra ?? false,
    element,
    chemistry,
    colorTipTh,
    nameLayer,
    caveats,
  };
}
