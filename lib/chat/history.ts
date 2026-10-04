// บทสนทนาก่อนหน้าในแชท (4 ต.ค. 2569 — ผู้ใช้สั่งแก้ "วิเคราะห์คำถามงงๆ วกวน")
//
// ปัญหาเดิม: client ส่งเฉพาะคำถามล่าสุด → คำถามต่อเนื่อง ("แล้วเบอร์ไหนดีกว่า" "แต่ฉันชอบ…")
// ไม่มีบริบท planner เลยถามกลับแบบงงๆ หรือเดาไปคนละเรื่อง
// ทางแก้: client แนบ 3 รอบล่าสุด (คำถาม+คำตอบย่อ) → server ทำความสะอาด → ใส่เป็นบล็อกอ้างอิงให้
// planner/narrator ใช้ "ตีความว่าคำถามล่าสุดอ้างถึงอะไร" เท่านั้น
//
// 🔒 ข้อความในบล็อกนี้มาจาก client จึงเชื่อไม่ได้เต็มที่:
//   - จำกัดจำนวน/ความยาว · ตัด < > (กันปลอมแท็กบล็อกอื่นของระบบ)
//   - รอบที่คำถามโดน Safety Gate ถูกทิ้ง (ไม่ป้อนข้อความวิกฤตซ้ำให้ AI)
//   - ตัวเลข/ธาตุในคำตอบเก่า "ห้ามใช้เป็นข้อเท็จจริง" — คำสั่งกำกับอยู่ในตัวบล็อก
//
// ไฟล์นี้ pure (ไม่แตะ network) — เทสต์รันตรงได้

import { safetyGate } from "@/lib/engine/element";

export interface ChatTurn {
  q: string;
  a: string;
}

export const MAX_HISTORY_TURNS = 3;
const MAX_Q_LEN = 300;
const MAX_A_LEN = 500;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** server: รับค่าดิบจาก body → รอบที่ใช้ได้ (ใหม่สุดอยู่ท้าย · ไม่เกิน 3 รอบ) */
export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurn[] = [];
  for (const t of raw.slice(-MAX_HISTORY_TURNS * 2)) {
    if (typeof t !== "object" || t === null) continue;
    const q = clean((t as Record<string, unknown>).q, MAX_Q_LEN);
    const a = clean((t as Record<string, unknown>).a, MAX_A_LEN);
    if (!q || !a) continue;
    if (safetyGate(q)) continue;
    out.push({ q, a });
  }
  return out.slice(-MAX_HISTORY_TURNS);
}

/**
 * client: แปลงรายการข้อความในแชทเป็นคู่ (คำถาม→คำตอบ) — นับเฉพาะคำถามที่มีคำตอบตามมาทันที
 * (คำถามที่โดน Safety Gate/ล้มเหลว/ถูกปฏิเสธ ไม่มีคำตอบ AI ต่อท้าย จึงไม่ถูกนับ)
 */
export function pairTurns(msgs: readonly { role: "user" | "ai"; text: string }[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (let i = 0; i < msgs.length - 1; i++) {
    const cur = msgs[i];
    const next = msgs[i + 1];
    if (cur.role === "user" && next.role === "ai" && cur.text.trim() && next.text.trim()) {
      out.push({ q: cur.text.slice(0, MAX_Q_LEN), a: next.text.slice(0, MAX_A_LEN) });
      i++;
    }
  }
  return out.slice(-MAX_HISTORY_TURNS);
}

/** บล็อกอ้างอิงที่แนบหน้า input ของ planner/narrator — ว่าง = ไม่มีบล็อก */
export function historyBlock(turns: readonly ChatTurn[]): string {
  if (!turns.length) return "";
  const body = turns.map((t, i) => `[${i + 1}] ผู้ใช้: ${t.q}\n    แม่หมอ: ${t.a}`).join("\n");
  return (
    `<บทสนทนาก่อนหน้า>\n${body}\n</บทสนทนาก่อนหน้า>\n` +
    `(ใช้เพื่อเข้าใจว่าคำถามล่าสุดอ้างถึงอะไรเท่านั้น เช่น "แล้ว…" "อันนั้น" "เบอร์ไหน" — ` +
    `ตัวเลข/ธาตุ/คะแนนให้ยึดผลคำนวณรอบนี้ ห้ามยกจากคำตอบเก่ามาเป็นข้อเท็จจริง)\n\n`
  );
}
