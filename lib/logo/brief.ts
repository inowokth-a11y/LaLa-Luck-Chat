// AI ตีความชื่อแบรนด์ → brief ภาพสำหรับ prompt โลโก้ (ผู้ใช้สั่ง 9 ก.ย. 2569:
// "โลโก้ที่ไม่ได้พิมพ์อธิบายออกมาไม่ดี" — ชื่อเช่น "Lala Coffee" ควรได้ถ้วยกาแฟ ไม่ใช่รูปทรงลอยๆ)
//
// เส้นแบ่ง §16: AI ทำ "การตัดสินเชิงความหมาย" ของชื่อ (หมวดธุรกิจ/สินค้า/ลวดลาย) เท่านั้น —
// ธาตุ/สไตล์/สี ยังมาจาก engine (logoImagePrompt + LOGO_STYLE_EN) เหมือนเดิม · ผลเป็น enum-ish
// สั้นๆ ที่ sanitize แล้ว ห้ามหลุด free-text ยาวเข้า prompt · ต้นทุน Haiku ~฿0.03/ครั้ง
// (แพทเทิร์นเดียวกับ AI-1 ฝัน: "ธาตุคำใหม่ต้องมาจากการตัดสินเชิงความหมาย ไม่ใช่นับขีด")

import { generate } from "@/lib/ai";

export interface LogoBrief {
  /** หมวดธุรกิจ (อังกฤษสั้น) */
  industryEn: string;
  /** สินค้า/บริการหลัก (อังกฤษสั้น) */
  productEn: string;
  /** ลวดลาย/สัญลักษณ์ที่สื่อชื่อ ≤3 ชิ้น (อังกฤษ) */
  motifsEn: string[];
  /** โทนอารมณ์ (อังกฤษสั้น) */
  moodEn: string;
  /** สรุปภาษาไทยให้ผู้ใช้เห็น/แก้ได้ */
  summaryTh: string;
}

const BRIEF_SYSTEM = `You interpret a brand name (Thai or English) for a logo designer.
Return ONLY compact JSON: {"industry":"...","product":"...","motifs":["...","...","..."],"mood":"...","summaryTh":"..."}
Rules: industry/product/mood = 1-4 English words each. motifs = up to 3 concrete visual symbols (nouns) that
represent the name's meaning or business (e.g. coffee cup, lotus, mountain, wave). If the name is a person's
name or ambiguous, infer the most plausible small business and say so in summaryTh. summaryTh = one Thai sentence
(<= 80 chars) explaining what you inferred. No colors, no text/lettering suggestions, no other keys.`;

const safeEn = (s: unknown, max = 40): string =>
  String(s ?? "")
    .replace(/[^A-Za-z0-9 ,'&-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** sanitize ผลจาก AI ให้เป็นค่าสั้นปลอดภัยเท่านั้น — pure (เทสต์ได้) · คืน null ถ้าใช้ไม่ได้ */
export function sanitizeBrief(raw: unknown): LogoBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const industryEn = safeEn(r.industry);
  const productEn = safeEn(r.product);
  const moodEn = safeEn(r.mood, 30);
  const motifsEn = (Array.isArray(r.motifs) ? r.motifs : [])
    .map((m) => safeEn(m, 30))
    .filter((m) => m.length >= 3)
    .slice(0, 3);
  const summaryTh = String(r.summaryTh ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  if (!productEn && motifsEn.length === 0) return null;
  return { industryEn, productEn, motifsEn, moodEn, summaryTh };
}

/** แปลง brief เป็นข้อความ extra สำหรับ logoImagePrompt (สั้น ≤ ~150 ตัวอักษร) */
export function briefToExtra(b: LogoBrief): string {
  const parts = [
    b.productEn ? (/business$/i.test(b.productEn) ? `for a ${b.productEn}` : `for a ${b.productEn} business`) : "",
    b.motifsEn.length ? `featuring ${b.motifsEn.join(" and ")}` : "",
    b.moodEn ? `${b.moodEn} feel` : "",
  ].filter(Boolean);
  return parts.join(", ").slice(0, 160);
}

function extractFirstJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** เรียก AI ตีความชื่อ — ล้มเหลว/ผลเพี้ยน = null (ผู้เรียกใช้ prompt เดิมต่อ ไม่พัง) */
export async function logoBrief(brandName: string, userId?: string | null): Promise<LogoBrief | null> {
  try {
    const out = await generate({
      role: "router",
      logicId: 19,
      channel: "web",
      userId: userId ?? undefined,
      system: BRIEF_SYSTEM,
      input: `Brand name: "${brandName.slice(0, 60)}"`,
      maxTokens: 220,
    });
    return sanitizeBrief(extractFirstJson(out.text));
  } catch {
    return null;
  }
}
