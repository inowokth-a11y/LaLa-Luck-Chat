// ดัชนีสัญลักษณ์ความฝันสำหรับหน้า SEO (เฟส 2 "อาณาจักรทำนายฝัน" — 7 ส.ค. 2569)
//
// เป้าหมายคีย์เวิร์ด: "ทำนายฝัน" (274k/เดือน KD 23 — SERP อ่อนผิดปกติ อันดับ 2 เป็นเว็บ DA 8)
// และหางยาว "ฝันเห็น<สัญลักษณ์>" อีกหลายร้อยคำ
//
// 🔴 ทุกหน้าใช้ข้อมูลจากฐานจริงล้วน (สัญลักษณ์ 487 แถว + ตำราแก้เคล็ด) **ไม่มีการให้ AI เขียน
//    เนื้อหาคำทำนาย** — เนื้อหาที่เรนเดอร์เป็นการจัดวางข้อมูลที่มีอยู่ + คำอธิบายหลักการที่
//    เขียนจากสูตรจริง (ธาตุเชื่อม/วงจรกำเนิด) ต้นทุนต่อหน้า = ฿0 และ deterministic
//
// slug: ใช้ชื่อไทยตรงๆ (Google รองรับ UTF-8 และแสดงผลถอดรหัสใน SERP ไทย — ช่วย CTR)

import { PRODUCTION_DREAM_DB, type DreamSymbol } from "@/lib/engine/dream";
import { kaekledFor, type KaekledGuidance } from "@/lib/engine/kaekled";
import { DAY_STAR_NUMBER, parseSymbolNumbers } from "@/lib/engine/dream-energy";
import { bridgingElement } from "@/lib/engine/kaekled";
import type { Element5 } from "@/lib/engine/element";

export interface DreamSeoEntry {
  slug: string;
  /** ชื่อหลักที่ใช้พาดหัว (ตัวแรกของ "ก / ข") */
  name: string;
  /** ชื่ออื่นในแถวเดียวกัน */
  aliases: string[];
  category: string;
  element: string;
  kangxiChar: string;
  kangxiStrokes: number | null;
  meaning: string;
  /** ความหมายจากรูปทรง/ลักษณะ (ฐาน v3 — มีเฉพาะหมวดสัตว์บก) */
  shapeMeaning?: string;
  /** เลขที่ตำราผูกกับสัญลักษณ์ (ตัวเลขล้วน — ตัดศัพท์ใบ้หวยออกตามที่ผู้ใช้ตัดสิน 7 ส.ค. 2569) */
  numbers?: { คู่: string[]; หลักเดี่ยว: string[] } | null;
  remedy: KaekledGuidance | null;
}

/** ตัดวงเล็บ/ช่องว่างซ้ำ ให้เหลือคำที่คนพิมพ์ค้นจริง */
function cleanName(s: string): string {
  return s.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}

export function slugify(name: string): string {
  return cleanName(name).replace(/\s+/g, "-");
}

let cache: DreamSeoEntry[] | null = null;

/** สัญลักษณ์ทั้งหมดแบบไม่ซ้ำ (ฐานมีแถวซ้ำ 49 แถวจากหมวดที่ตั้งชื่อสองแบบ) */
export function dreamSeoEntries(): DreamSeoEntry[] {
  if (cache) return cache;
  const seen = new Set<string>();
  const out: DreamSeoEntry[] = [];
  for (const row of PRODUCTION_DREAM_DB as DreamSymbol[]) {
    const parts = row.dream_object.split("/").map(cleanName).filter(Boolean);
    if (parts.length === 0) continue;
    const name = parts[0];
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      name,
      aliases: parts.slice(1),
      category: cleanName(row.category),
      element: row.element,
      kangxiChar: row.chinese_char,
      kangxiStrokes: row.kangxi_strokes,
      meaning: row.meaning_keyword,
      ...(row.shape_meaning ? { shapeMeaning: row.shape_meaning } : {}),
      numbers: parseSymbolNumbers(row.lucky_number),
      remedy: kaekledFor(row.dream_object, row.element),
    });
  }
  cache = out;
  return out;
}

export function dreamSeoEntry(slug: string): DreamSeoEntry | null {
  return dreamSeoEntries().find((e) => e.slug === slug) ?? null;
}

/** จัดกลุ่มตามหมวด สำหรับหน้ารวม */
export function dreamSeoByCategory(): { category: string; entries: DreamSeoEntry[] }[] {
  const map = new Map<string, DreamSeoEntry[]>();
  for (const e of dreamSeoEntries()) {
    const list = map.get(e.category) ?? [];
    list.push(e);
    map.set(e.category, list);
  }
  return [...map.entries()]
    .map(([category, entries]) => ({ category, entries }))
    .sort((a, b) => b.entries.length - a.entries.length);
}

/** สัญลักษณ์ใกล้เคียง (หมวดเดียวกัน) สำหรับลิงก์ภายใน */
export function relatedEntries(entry: DreamSeoEntry, limit = 8): DreamSeoEntry[] {
  const same = dreamSeoEntries().filter((e) => e.category === entry.category && e.slug !== entry.slug);
  if (same.length >= limit) return same.slice(0, limit);
  const others = dreamSeoEntries().filter((e) => e.category !== entry.category && e.slug !== entry.slug);
  return [...same, ...others.slice(0, limit - same.length)];
}

/**
 * เลขเชิงสัญลักษณ์ประจำสัญลักษณ์ — ขีดอักษรคังซี (จากฐาน) เท่านั้น
 * 🔴 กรอบการนำเสนอเดียวกับในแชท: เป็น "เลขจากการคำนวณ" ห้ามนำเสนอเป็นการใบ้หวย
 */
export const DREAM_SEO_NUMBER_NOTE =
  "ตัวเลขทั้งหมดนี้มาจากการนับและตารางในตำรา (จำนวนขีดอักษรคังซี และเลขที่ตำราผูกไว้กับสัญลักษณ์) " +
  "ใช้เป็นรหัสเชิงสัญลักษณ์เพื่อเชื่อมโยงความหมาย ไม่ใช่คำแนะนำการเสี่ยงโชคหรือการพนัน";

/** วันในสัปดาห์ + เลขดาวประจำวัน (ใช้อธิบายหลักการ "ฝันวันไหนมีผลต่างกัน") */
export const DAY_STARS = Object.entries(DAY_STAR_NUMBER) as [string, number][];

/** ธาตุที่ธาตุนี้ "พิฆาต" (วงจรควบคุม) */
const CONTROLS: Record<Element5, Element5> = {
  Wood: "Earth",
  Earth: "Water",
  Water: "Fire",
  Fire: "Metal",
  Metal: "Wood",
};

/**
 * ความสัมพันธ์ระหว่าง "ธาตุประจำวันที่ฝัน" กับ "ธาตุของสัญลักษณ์"
 *
 * ⚠️ จงใจไม่ใช้ข้อความจาก wuXingScore ตรงๆ — ข้อความชุดนั้นเขียนจากมุม "เรา (ผู้ใช้) ↔ สิ่งของ"
 *    ("บำรุงเรา" / "เราเป็นฝ่ายส่งพลัง") ซึ่งผิดบริบทของหน้านี้ที่เทียบ วัน ↔ สัญลักษณ์
 *    (ความสัมพันธ์ของธาตุใช้วงจรเดียวกัน แต่คำบรรยายต้องเป็นมุมของวันกับภาพฝัน)
 */
export function dayRelationText(dayEl: Element5, symbolEl: Element5): string {
  if (dayEl === symbolEl) return "ธาตุตรงกัน — พลังของสัญลักษณ์นี้เข้มข้นเป็นพิเศษ";
  if (bridgingElement(dayEl) === symbolEl) return "ธาตุประจำวันหนุนสัญลักษณ์ — ความหมายเด่นชัดขึ้น";
  if (bridgingElement(symbolEl) === dayEl) return "สัญลักษณ์ส่งพลังออกไปตามวัน — เรื่องมักคลี่คลาย ไม่ค้างคา";
  if (CONTROLS[dayEl] === symbolEl) return "ธาตุประจำวันข่มสัญลักษณ์ — แรงของภาพฝันถูกกดไว้";
  return "สัญลักษณ์ข่มธาตุประจำวัน — เป็นวันที่ควรใส่ใจเรื่องที่สัญลักษณ์นี้สื่อ";
}
