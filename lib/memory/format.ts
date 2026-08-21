// ความจำแม่หมอ — ส่วนตรรกะล้วน (ตัดสั้น/จัดรูป/เกณฑ์สรุป) ไม่แตะ DB/AI (เทสต์ตรงๆ ได้)
//
// หลักคุมต้นทุน (เฟส 3): บล็อกความจำที่ inject เข้า prompt ต้องมีขนาดคงที่โดยประมาณ
// (summary ≤ MEMORY_SUMMARY_MAX + เหตุการณ์ล่าสุด ≤ RECENT_EVENTS × EVENT_LINE_MAX)
// ไม่ว่าผู้ใช้จะคุยมานานแค่ไหน — ประวัติดิบโตได้เรื่อยๆ แต่ prompt ไม่โต

export type HistoryKind = "chat" | "dream" | "oracle" | "soulmate";

export interface HistoryContent {
  /** คำถาม/ความฝันของผู้ใช้ (ตัดสั้นแล้ว) */
  q?: string;
  /** สาระของคำตอบ/ผล (ตัดสั้นแล้ว) เช่น ธาตุ/การ์ด/สัญลักษณ์ที่พบ */
  a?: string;
  /** ป้ายบริบท เช่น ชื่อฟังก์ชัน */
  tag?: string;
}

/** สรุปสะสมยาวสุด (ตัวอักษร) — Haiku ถูกสั่งให้เขียนไม่เกินนี้ และเราตัดซ้ำกันพลาด */
export const MEMORY_SUMMARY_MAX = 700;
/** จำนวนเหตุการณ์ดิบล่าสุดที่แนบไปกับ summary */
export const RECENT_EVENTS = 4;
/** ความยาวต่อบรรทัดเหตุการณ์ */
export const EVENT_LINE_MAX = 160;
/** ครบกี่เหตุการณ์ใหม่แล้วค่อยสรุปรอบถัดไป (ต้นทุน Haiku ~฿0.05-0.1/รอบ) */
export const SUMMARIZE_EVERY = 8;
/** ดึงเหตุการณ์กี่รายการไปให้ตัวสรุป */
export const SUMMARIZE_WINDOW = 16;

/** ตัดข้อความตามจำนวนตัวอักษร (code point) — กันสระ/วรรณยุกต์ไทยขาดกลางคู่ surrogate */
export function truncate(s: string, max: number): string {
  const chars = [...s.trim()];
  return chars.length <= max ? chars.join("") : chars.slice(0, max - 1).join("") + "…";
}

/** แปลงเหตุการณ์เป็นบรรทัดเดียวแบบกระชับ (ใช้ทั้งใน prompt และให้ตัวสรุปอ่าน) */
export function compactEvent(kind: HistoryKind, content: HistoryContent, when?: string): string {
  const label = kind === "dream" ? "ฝัน" : kind === "oracle" ? "เสี่ยงทาย" : kind === "soulmate" ? "ดูเนื้อคู่" : "ถาม";
  const parts = [
    content.tag ? `[${content.tag}]` : null,
    content.q ? `${label}: ${content.q}` : label,
    content.a ? `→ ${content.a}` : null,
  ].filter(Boolean);
  const line = parts.join(" ");
  return truncate(when ? `(${when}) ${line}` : line, EVENT_LINE_MAX);
}

/**
 * บล็อกความจำที่ inject เข้า prompt — null ถ้าไม่มีอะไรให้จำ
 * ⚠️ มีคำกำกับการใช้ในตัว: ความจำคือ "ข้อเท็จจริงจากการใช้งานก่อนหน้า" ไม่ใช่ใบสั่งทำนายเพิ่ม
 */
export function formatMemoryBlock(
  summary: string | null | undefined,
  recentLines: readonly string[]
): string | null {
  const sum = summary?.trim() ? truncate(summary, MEMORY_SUMMARY_MAX) : null;
  const recent = recentLines.filter((l) => l.trim()).slice(0, RECENT_EVENTS);
  if (!sum && recent.length === 0) return null;

  const lines: string[] = ["<ความจำของแม่หมอเกี่ยวกับผู้ใช้คนนี้>"];
  if (sum) lines.push(sum);
  if (recent.length) lines.push("ล่าสุด:", ...recent.map((l) => `- ${l}`));
  lines.push(
    "</ความจำของแม่หมอ>",
    "(ใช้ความจำเพื่อความต่อเนื่องเท่านั้น เช่น อ้างถึงเรื่องที่เขาเคยเล่า — ถ้าไม่เกี่ยวกับคำถามนี้ไม่ต้องเอ่ยถึง ห้ามใช้แต่งข้อเท็จจริง/คำทำนายใหม่)"
  );
  return lines.join("\n");
}

/** ถึงเวลาสรุปใหม่หรือยัง */
export const shouldSummarize = (eventsSinceSummary: number): boolean =>
  eventsSinceSummary >= SUMMARIZE_EVERY;

/** prompt ของตัวสรุป (Haiku) — สรุป "ข้อเท็จจริง" เท่านั้น ห้ามทำนายเพิ่ม */
export function buildSummarizerPrompt(oldSummary: string | null, eventLines: readonly string[]): string {
  return `สรุปประวัติการใช้งานของผู้ใช้แพลตฟอร์มดูดวงคนหนึ่ง เพื่อให้หมอดูใช้จำบริบทข้ามการสนทนา

${oldSummary ? `สรุปเดิม:\n${oldSummary}\n\n` : ""}เหตุการณ์ใหม่:
${eventLines.map((l) => `- ${l}`).join("\n")}

กติกา:
1. เขียนสรุปฉบับใหม่ฉบับเดียว (รวมสรุปเดิม+เหตุการณ์ใหม่) ยาวไม่เกิน ${MEMORY_SUMMARY_MAX} ตัวอักษร
2. เก็บเฉพาะ "ข้อเท็จจริง": เรื่องที่เขาถามบ่อย ความฝันซ้ำๆ การ์ด/ธาตุของเขา เรื่องที่เขากังวล
3. ห้ามแต่งคำทำนาย ห้ามวิเคราะห์เพิ่ม ห้ามใส่ความเห็น — สรุปอย่างเดียว
4. ตอบเป็นข้อความสรุปล้วนๆ ไม่ต้องมีหัวข้อ/คำนำ`;
}
