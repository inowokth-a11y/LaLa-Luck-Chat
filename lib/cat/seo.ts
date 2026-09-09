// SEO "ดูดวงแมว" (9 ก.ย. 2569 ผู้ใช้สั่ง "หาข้อมูลและทำ SEO เรื่องการดูดวงแมว")
//
// ผลวิจัยคีย์เวิร์ด (SERP ไทย 9 ก.ย. 2569): คลัสเตอร์ที่คนค้นจริง = "แมวมงคล 17 ชนิด" (silpa-mag/mthai/
// catdumb ครอง) · "แมวมงคล เสริมดวง/โชคลาภ" (lemon8/sanook/LINE TODAY) · "สีแมวถูกโฉลกตามวันเกิด"
// (lemon8/sanook — ยังไม่มีเว็บใหญ่ทำแบบคำนวณจริง) · "แมวหาย ทำไงดี / จะกลับมาไหม / ดูดวงแมวหาย"
// (rabbitcare/central/wongnai/pantip) · "ดูดวงแมวตามราศี/นิสัยแมว" (sanook)
// จุดต่างของเรา = เครื่องมือคำนวณจริง (ตำรา 17 ชนิด + ธาตุ) ไม่ใช่บทความลอยๆ
//
// 🔴 กติกาโหมดแมว (คงเดิม): เล่าเฉพาะด้านมงคล ห้ามตัดสินแมวตัวใดว่าร้าย/ไม่ดี · ไม่แตะสุขภาพสัตว์ ·
//    ทุกตารางคำนวณจาก engine จริง (DAY_ELEMENT verify แล้ว + COLOR_TO_ELEMENT + wuXingScore "ทาง ค")
//    และประกาศว่าเป็น "ธาตุประจำวันเกิดอย่างเดียว" ไม่ใช่ธาตุประจำตัวเต็ม (Element Seed ต้องใช้เครื่องมือ)
// ทุกฟังก์ชัน pure ฿0 · ไม่มี network

import { CAT_TAMRA, CAT_COATS, catElementFromCoat, CAT_TAMRA_CAVEAT, CAT_ELEMENT_NOTE, type CatBreed } from "@/lib/engine/cat-tamra";
import { DAY_ELEMENT, THAI_LABEL_5, wuXingScore, type Element5 } from "@/lib/engine/element";

export interface CatSeoEntry extends CatBreed {
  /** slug = ชื่อไทยที่คนพิมพ์ค้น (เช่น /cat/วิเชียรมาศ) */
  slug: string;
  element: Element5 | null;
  colorTh: string | null;
}

let cache: CatSeoEntry[] | null = null;

export function catSeoEntries(): CatSeoEntry[] {
  if (cache) return cache;
  cache = CAT_TAMRA.map((b) => {
    const el = catElementFromCoat(b.match.coat);
    return { ...b, slug: b.nameTh, element: el?.element ?? null, colorTh: el?.colorTh ?? null };
  });
  return cache;
}

export function catSeoEntry(slug: string): CatSeoEntry | null {
  return catSeoEntries().find((e) => e.slug === slug || e.key === slug) ?? null;
}

/** วันไทย 7 วัน ตามลำดับที่คนคุ้น */
export const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] as const;

export const CAT_DAY_COLOR_CAVEAT =
  "ตารางนี้ใช้ 'ธาตุประจำวันเกิด' อย่างเดียว (ตารางที่ตรวจกับเอกสารต้นทางแล้ว) เทียบกับธาตุจากสีขนแมว " +
  "ด้วยหลักเบญจธาตุชุดเดียวกับที่ระบบใช้ทำนายจริง — เป็นชั้นเสริมสำหรับดูแนวโน้มกว้างๆ ธาตุประจำตัวเต็มของคุณ " +
  "ต้องคำนวณจากวัน เดือน ปีเกิดครบ (ใช้เครื่องมือด้านบน) · แมวทุกสีเป็นมงคลกับคนที่รักมัน สีที่ 'ควรดูแล' " +
  "หมายถึงต้องใส่ใจสมดุลมากขึ้น ไม่ใช่ห้ามเลี้ยง";

export interface DayColorRow {
  day: string;
  dayEl: Element5;
  /** สีขน (ชื่อสีไทย) ที่ธาตุเกื้อหนุนธาตุประจำวัน (+2) หรือคนเป็นผู้ให้ (+1) */
  support: { colorTh: string; coatTh: string; score: number; relationTh: string }[];
  /** สีขนธาตุเดียวกัน (กลมกลืน) */
  harmony: { colorTh: string; coatTh: string; score: number; relationTh: string }[];
  /** สีขนที่ธาตุพิฆาตกัน (ต้องดูแลสมดุล — ไม่ใช่ห้าม) */
  care: { colorTh: string; coatTh: string; score: number; relationTh: string }[];
}

/** สีขนที่มีธาตุ (ตัด calico/other ที่ไม่มีสีหลัก) — ไม่ซ้ำสี */
function coatColorList(): { colorTh: string; coatTh: string; element: Element5 }[] {
  const seen = new Set<string>();
  const out: { colorTh: string; coatTh: string; element: Element5 }[] = [];
  for (const [key, c] of Object.entries(CAT_COATS)) {
    const el = catElementFromCoat(key);
    if (!el || seen.has(el.colorTh)) continue;
    seen.add(el.colorTh);
    out.push({ colorTh: el.colorTh, coatTh: c.th, element: el.element });
  }
  return out;
}

/** สีแมวถูกโฉลกตามวันเกิด — คำนวณจาก wuXingScore(ธาตุวันเกิด, ธาตุสีแมว) มุมเดียวกับโหมดแมว */
export function dayCatColorRows(): DayColorRow[] {
  const colors = coatColorList();
  return THAI_DAYS.map((day) => {
    const dayEl = DAY_ELEMENT[day] as Element5;
    const row: DayColorRow = { day, dayEl, support: [], harmony: [], care: [] };
    for (const c of colors) {
      const s = wuXingScore(dayEl, c.element, []);
      const item = { colorTh: c.colorTh, coatTh: c.coatTh, score: s.final_score, relationTh: s.relation_th };
      if (c.element === dayEl) row.harmony.push(item);
      else if (s.final_score > 0) row.support.push(item);
      else row.care.push(item);
    }
    row.support.sort((a, b) => b.score - a.score);
    return row;
  });
}

/** แมวชนิดนี้เกื้อหนุนคนเกิดวันไหน — ใช้ในหน้ารายชนิด */
export function breedDayRows(entry: CatSeoEntry): { day: string; dayEl: Element5; score: number; relationTh: string }[] {
  if (!entry.element) return [];
  return THAI_DAYS.map((day) => {
    const dayEl = DAY_ELEMENT[day] as Element5;
    const s = wuXingScore(dayEl, entry.element as Element5, []);
    return { day, dayEl, score: s.final_score, relationTh: s.relation_th };
  });
}

/** ชนิดใกล้เคียง (ธาตุเดียวกันก่อน แล้วค่อยที่เหลือ) */
export function relatedBreeds(entry: CatSeoEntry, limit = 6): CatSeoEntry[] {
  const all = catSeoEntries().filter((e) => e.slug !== entry.slug);
  const same = all.filter((e) => e.element && e.element === entry.element);
  const rest = all.filter((e) => !same.includes(e));
  return [...same, ...rest].slice(0, limit);
}

export const CAT_SEO_INTRO_TH =
  "ตำราดูลักษณะแมวของไทยปรากฏในสมุดข่อยโบราณตั้งแต่สมัยกรุงศรีอยุธยา เป็นหนึ่งในตำราพรหมชาติที่คัดลอกสืบต่อกันมา " +
  "ระบุแมวไว้ 23 ชนิด โดย 17 ชนิดเป็นแมวมงคลที่เชื่อว่าเลี้ยงแล้วนำโชคลาภ บารมี และความรุ่งเรืองมาสู่เจ้าของ " +
  "ระบบนี้ยึดฉบับวัดอนงคารามที่เผยแพร่ทั่วไปเป็นหลัก และเล่าเฉพาะด้านมงคลของแมวทั้ง 17 ชนิด (บวกขาวมณี " +
  "แมวไทยยุคหลังที่นิยมนับรวม) — ไม่นำอีก 6 ชนิดที่ตำราโบราณจัดไว้อีกกลุ่มมาตัดสินแมวของใคร เพราะแมวทุกตัวเป็นมงคลกับคนที่รักมัน";

export function catHubFaq(): { q: string; a: string }[] {
  const names = catSeoEntries().filter((e) => e.inTamra).map((e) => e.nameTh);
  return [
    {
      q: "ดูดวงแมวคืออะไร ดูจากอะไร",
      a: "ดูดวงแมวในที่นี้คือการเทียบลักษณะแมว (สีขน ลาย สีตา) กับตำราแมวศุภลักษณ์ในสมุดข่อยโบราณ 17 ชนิด ว่าแมวของคุณตรงกับชนิดใดและตำราว่าให้คุณด้านใด แล้วอ่านความเข้ากันของธาตุแมว (จากสีขน) กับธาตุของเจ้าของด้วยหลักเบญจธาตุ ไม่ใช่การเดาจากพฤติกรรม และไม่เกี่ยวกับสุขภาพสัตว์",
    },
    {
      q: "แมวมงคล 17 ชนิดมีอะไรบ้าง",
      a: `ตามสมุดข่อยตำราแมวโบราณ (ฉบับวัดอนงคาราม) ได้แก่ ${names.join(" ")} — ส่วนขาวมณีเป็นแมวไทยยุคหลังที่นิยมนับรวมเป็นแมวมงคลเช่นกัน`,
    },
    {
      q: "เลี้ยงแมวสีอะไรเสริมดวง ถูกโฉลกตามวันเกิด",
      a: "ดูได้จากธาตุประจำวันเกิดเทียบกับธาตุของสีขนแมว เช่น คนเกิดวันอังคารและอาทิตย์ (ธาตุไฟ) แมวสีน้ำตาล/ครีม/ส้มมีธาตุที่เกื้อหนุนหรือกลมกลืน ส่วนสีขาว/เทา (ธาตุทอง) เป็นคู่ที่ต้องดูแลสมดุลมากขึ้น ตารางครบทั้ง 7 วันอยู่ในหน้านี้ และคำนวณจากหลักเบญจธาตุชุดเดียวกับที่ระบบใช้ทำนายจริง แมวทุกสีเป็นมงคลกับคนที่รักมัน",
    },
    {
      q: "แมวของฉันไม่ตรงกับ 17 ชนิดในตำรา ดูดวงได้ไหม",
      a: "ได้ ระบบจะอ่านผ่านธาตุจากสีขนหลักและความเข้ากันกับธาตุของเจ้าของแทน (ชั้นเสริม) ตำราไม่มีคำตัดสินว่าแมวที่ไม่อยู่ในรายการเป็นแมวไม่ดี",
    },
    {
      q: "แมวหาย ดูดวงได้ไหม ควรค้นตรงไหนก่อน",
      a: "ไม่มีศาสตร์ใดระบุตำแหน่งแมวได้แน่นอน แต่ระบบช่วยจัดลำดับการค้นที่คุ้มค่าที่สุดจากสถิติงานวิจัยแมวหาย 1,210 ตัว (แมวในบ้านส่วนใหญ่พบในรัศมีไม่กี่สิบเมตรและมักซ่อนนิ่ง) ร่วมกับภูมิประเทศรอบบ้าน ฤกษ์ออกค้น และมุมตำราจากเวลาที่หาย ใช้ฟรีที่หน้าตามหาแมวหาย",
    },
  ];
}

export function catBreedFaq(e: CatSeoEntry): { q: string; a: string }[] {
  const alias = e.aliasTh ? ` (${e.aliasTh})` : "";
  const dayRows = breedDayRows(e);
  const best = dayRows.filter((r) => r.score > 0).map((r) => `วัน${r.day}`);
  return [
    {
      q: `แมว${e.nameTh}${alias} มีลักษณะอย่างไร`,
      a: `ตามตำราแมวศุภลักษณ์: ${e.traitsTh} ตา${e.eyeTh}${e.inTamra ? "" : " (เป็นแมวไทยยุคหลัง ไม่อยู่ในสมุดข่อย 17 ชนิด)"}`,
    },
    {
      q: `เลี้ยงแมว${e.nameTh}แล้วให้คุณด้านใด`,
      a: `ตำราว่า ${e.boonTh} — เป็นความเชื่อตามตำราโบราณ ไม่ใช่คำรับประกันผล`,
    },
    ...(e.element
      ? [
          {
            q: `แมว${e.nameTh}เหมาะกับคนเกิดวันไหน`,
            a: `สีขน${e.colorTh}ของ${e.nameTh}จัดเป็นธาตุ${THAI_LABEL_5[e.element]} (ชั้นเสริมจากสีขน) ธาตุนี้เกื้อหนุนหรือกลมกลืนกับธาตุประจำวันเกิดของคน${best.length ? `เกิด${best.join(" ")}` : ""} ส่วนวันอื่นเป็นคู่ที่ต้องดูแลสมดุลมากขึ้น ไม่ใช่ห้ามเลี้ยง — ธาตุประจำตัวเต็มต้องคำนวณจากวันเดือนปีเกิดในเครื่องมือดูดวงแมว`,
          },
        ]
      : []),
  ];
}

export { CAT_TAMRA_CAVEAT, CAT_ELEMENT_NOTE };
