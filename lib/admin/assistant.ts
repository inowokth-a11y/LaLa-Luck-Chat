// ผู้ช่วย AI สำหรับแอดมิน — สรุปข้อมูล + ตอบคำถามจากตัวเลขในแดชบอร์ด
// 🔴 AI ตอบจาก context ที่ให้เท่านั้น ห้ามแต่งตัวเลข (เหมือนหลัก §16 — คนเชื่อตัวเลขจากแดชบอร์ด)
// context สร้างจาก aggregator ที่ verify แล้ว (usage-stats + question-stats) → pure เทสต์ได้

import type { UsageStats } from "./usage-stats";
import type { QuestionSummary } from "./question-stats";

export const ADMIN_ASSISTANT_SYSTEM = `คุณคือผู้ช่วยวิเคราะห์ข้อมูลของแอดมิน KRUTH ELEMENT (แพลตฟอร์มดูดวงที่ "คำนวณจริง")
ตอบเป็นภาษาไทย กระชับ ตรงประเด็น เชิงธุรกิจ

กฎเหล็ก:
1. ใช้ได้เฉพาะตัวเลข/ข้อมูลใน <ข้อมูลแดชบอร์ด> เท่านั้น — **ห้ามแต่งตัวเลขหรือเดา** ถ้าไม่มีข้อมูลให้บอกตรงๆ
2. เมื่อสรุป ให้ชี้ (ก) ต้นทุน/กำไรที่ควรระวัง (ข) คำถามที่ผู้ใช้อยากได้แต่ยังตอบไม่ได้ (unclear)
   → เสนอว่าควรทำฟีเจอร์/engine อะไรต่อ โดยอิงจำนวนครั้งจริง
3. ไม่ต้องทวนข้อมูลดิบทั้งหมด — สรุปเป็นข้อค้นพบ (insight) + ข้อเสนอแนะที่ทำได้จริง`;

/** สร้าง context กระชับจากสถิติที่รวมแล้ว — คุมความยาว (ไม่เท indexดิบ) */
export function buildAdminContext(usage: UsageStats, questions: QuestionSummary): string {
  const byRole = usage.byRole.map((r) => `${r.role}=${r.calls}ครั้ง/฿${r.costThb}`).join(", ");
  const byModel = usage.byModel.slice(0, 5).map((m) => `${m.provider}/${m.model}=${m.calls}ครั้ง/฿${m.costThb}${m.failures ? `/ล่ม${m.failures}` : ""}`).join(", ");
  const status = questions.byStatus.map((s) => `${s.status}=${s.count}`).join(", ");
  const topFns = questions.topFns.map((f) => `${f.fn}(${f.count})`).join(", ") || "—";
  const unclear = questions.recentUnclear.length
    ? questions.recentUnclear.map((u, i) => `  ${i + 1}. "${u.question}"`).join("\n")
    : "  (ไม่มี)";

  return `=== ต้นทุน AI ===
- เรียก AI ${usage.totalCalls} ครั้ง · แคชฮิต ${usage.cacheHits} · cache hit rate ${(usage.cacheHitRate * 100).toFixed(0)}%
- ต้นทุนรวม ฿${usage.totalCostThb} · เฉลี่ย ฿${usage.avgCostPerCall}/ครั้ง · อัตราล่ม ${(usage.failRate * 100).toFixed(0)}% (${usage.failures} ครั้ง)
- แยก role: ${byRole || "—"}
- แยกโมเดล: ${byModel || "—"}

=== คำถามผู้ใช้ (แชทวิเคราะห์อิสระ) ===
- ทั้งหมด ${questions.total} คำถาม · ตอบได้ ${(questions.answeredRate * 100).toFixed(0)}%
- สถานะ: ${status || "—"}
- ฟังก์ชันที่ถูกใช้บ่อย: ${topFns}
- คำถามที่ "ยังตอบไม่ได้" (unclear) ล่าสุด — ใช้จัดลำดับฟีเจอร์:
${unclear}`;
}

/** input สำหรับ AI (context + คำสั่ง) */
export function buildAssistantInput(context: string, question: string): string {
  return `<ข้อมูลแดชบอร์ด>
${context}
</ข้อมูลแดชบอร์ด>

คำถาม/คำสั่งจากแอดมิน: ${question}`;
}

/** คำสั่งสรุปอัตโนมัติ (ปุ่ม "สรุปด้วย AI") */
export const SUMMARY_COMMAND =
  "สรุปภาพรวมต้นทุน/การใช้งาน + ชี้คำถามที่ผู้ใช้อยากได้แต่ยังตอบไม่ได้ แล้วเสนอว่าควรทำฟีเจอร์/engine อะไรต่อ (เรียงตามความคุ้ม)";
