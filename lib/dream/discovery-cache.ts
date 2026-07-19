// แคชผล AI-1 (Logic 4) — อ่าน dream_pending_discoveries ก่อนเรียก AI-1 ใหม่
//
// ทำไมถึงคุ้มที่สุดในรายการงาน (CLAUDE.md §10): Dream + AI-1 = ฿10.02/ครั้ง เทียบกับ
// Dream ปกติ ฿0.69 — ต้นทุนเกือบทั้งหมดมาจาก web search + context 52k token ของ AI-1
// ถ้าสัญลักษณ์เดิมเคยถูกค้นแล้ว การเรียกซ้ำได้คำตอบเดิมแต่จ่ายเต็มราคาทุกครั้ง
//
// ⚠️ ขอบเขตที่ตั้งใจ: แคชนี้ "ใช้คำตอบเดิมของ AI-1 ซ้ำ" เท่านั้น ไม่ได้แปลว่าอนุมัติ
//    ข้อมูลนั้นเข้าฐานความรู้ — การรวมเข้า dream_symbols ยังต้องผ่านรีวิวโดยมนุษย์เหมือนเดิม
//
// ⚠️ วิธี match เป็น substring แบบเดียวกับ findSymbolMatches() ใน lib/engine/dream.ts
//    (ตั้งใจให้ตรงกัน เพื่อไม่ให้แคชจับคำได้ต่างจาก engine) — แปลว่ามันสืบทอดปัญหา
//    over-match คำสั้นของภาษาไทยมาด้วย (CLAUDE.md §10 งานที่ 7) จึงกันไว้ 2 ชั้น:
//      1. ข้ามคำที่สั้นกว่า MIN_MATCH_LEN (เสี่ยงชนคำอื่นสูงสุด)
//      2. เลือกคำที่ยาวที่สุดเมื่อ match ได้หลายคำ (เจาะจงกว่า = พลาดยากกว่า)
//    ⚠️ สองชั้นนี้ "ลด" ไม่ใช่ "แก้" — เคสตัวอย่างในเอกสาร ("ข้าม" อยู่ใน "เข้ามา") ยังหลุด
//    ได้อยู่เพราะเป็นคำยาวพอ ทางแก้จริงคือย้ายไป Postgres FTS ทั้ง engine + แคชพร้อมกัน

import { createServiceClient } from "@/lib/supabase/server";

export interface Discovery {
  category?: string;
  dream_object?: string;
  chinese_char?: string;
  kangxi_strokes?: number | null;
  element?: string;
  meaning_keyword?: string;
}

export interface CachedDiscovery extends Discovery {
  dream_object: string;
  /** true = แถวนี้ผ่านการรีวิวโดยมนุษย์แล้ว, false = ยังเป็นผลดิบจาก AI-1 */
  reviewed: boolean;
}

/** คำที่สั้นกว่านี้ไม่ใช้เป็นกุญแจแคช — เสี่ยงไปโผล่กลางคำอื่นสูงเกินไป (นับเป็นพยัญชนะ/สระฐาน) */
const MIN_MATCH_LEN = 3;

/**
 * นับความยาวคำไทยแบบไม่รวมวรรณยุกต์/สระบน-ล่าง
 * ".length" ใช้ไม่ได้กับไทย: "ข้า" = 3 code unit แต่เป็นแค่ 2 ตัวอักษรจริง
 * (U+0E31, U+0E34–U+0E3A, U+0E47–U+0E4E คือเครื่องหมายที่ลอยอยู่บน/ล่างพยัญชนะ ไม่กินที่)
 */
export function thaiBaseLength(s: string): number {
  return s.replace(/[ัิ-ฺ็-๎]/g, "").length;
}

/** กันแถวโตเกินจนดึงมาทั้งตาราง — ตารางนี้โตช้ามาก (1 แถว/สัญลักษณ์ใหม่) */
const MAX_ROWS = 2000;

/**
 * หาสัญลักษณ์ที่ AI-1 เคยค้นไว้แล้วในข้อความฝันนี้
 * คืน null = ไม่มีในแคช ผู้เรียกต้องเรียก AI-1 จริง
 * ไม่ throw เด็ดขาด — แคชล่มต้องไม่ทำให้ทำนายฝันล่ม (แค่กลับไปจ่ายเต็มราคา)
 */
export async function lookupCachedDiscovery(dreamText: string): Promise<CachedDiscovery | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("dream_pending_discoveries")
      .select("category, dream_object, chinese_char, kangxi_strokes, element, meaning_keyword, reviewed")
      .limit(MAX_ROWS);

    if (error) {
      console.warn("[dream-cache] อ่านแคชไม่สำเร็จ — จะเรียก AI-1 ตามปกติ", error.message);
      return null;
    }

    const hit = pickBestMatch(dreamText, (data ?? []) as CachedDiscovery[]);
    if (!hit) return null;

    void bumpHitCount(hit.dream_object); // telemetry — ไม่ต้องรอ ไม่ให้ช้าขึ้นเพราะ metric
    return hit;
  } catch (e) {
    console.warn("[dream-cache] อ่านแคชไม่สำเร็จ — จะเรียก AI-1 ตามปกติ", e);
    return null;
  }
}

/**
 * เลือกแถวที่ตรงที่สุด (pure — แยกออกมาให้เทสต์ได้โดยไม่ต้องต่อ Supabase)
 * เกณฑ์: dream_object ต้องปรากฏใน dreamText, ยาว ≥ MIN_MATCH_LEN, เลือกอันที่ยาวที่สุด
 */
export function pickBestMatch(dreamText: string, rows: CachedDiscovery[]): CachedDiscovery | null {
  let best: CachedDiscovery | null = null;
  let bestLen = 0;
  for (const row of rows) {
    const obj = (row.dream_object ?? "").trim();
    const len = thaiBaseLength(obj);
    if (len < MIN_MATCH_LEN) continue;
    if (!dreamText.includes(obj)) continue;
    if (!best || len > bestLen) {
      best = row;
      bestLen = len;
    }
  }
  return best;
}

/**
 * บันทึกผล AI-1 ลงแคช (upsert ด้วย dream_object — unique index จาก migration 018)
 * ไม่ throw: บันทึกไม่ได้แค่แปลว่าครั้งหน้ายังต้องเรียก AI-1 ใหม่ ไม่ควรทำให้คำตอบผู้ใช้พัง
 */
export async function saveDiscovery(d: Discovery): Promise<void> {
  const dreamObject = (d.dream_object ?? "").trim();
  if (!dreamObject) return; // ไม่มีชื่อสัญลักษณ์ = ใช้เป็นกุญแจแคชไม่ได้

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("dream_pending_discoveries").upsert(
      {
        category: d.category ?? null,
        dream_object: dreamObject,
        chinese_char: d.chinese_char ?? null,
        kangxi_strokes: d.kangxi_strokes ?? null,
        element: d.element ?? null,
        meaning_keyword: d.meaning_keyword ?? null,
        source: "ai_discovered",
      },
      { onConflict: "dream_object", ignoreDuplicates: true } // แถวเดิมอาจรีวิว/แก้มือแล้ว ห้ามทับ
    );
    if (error) console.warn("[dream-cache] บันทึกแคชไม่สำเร็จ", error.message);
  } catch (e) {
    console.warn("[dream-cache] บันทึกแคชไม่สำเร็จ", e);
  }
}

/** นับจำนวนครั้งที่แคชช่วยประหยัดการเรียก AI-1 (best-effort ล้วน) */
async function bumpHitCount(dreamObject: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.rpc("bump_dream_discovery_hit", { p_dream_object: dreamObject });
  } catch (e) {
    console.warn("[dream-cache] อัปเดต hit_count ไม่สำเร็จ (ไม่กระทบผลลัพธ์)", e);
  }
}
