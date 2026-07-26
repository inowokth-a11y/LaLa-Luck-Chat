// บันทึกประวัติคำถามแชทอิสระ (§16) — fire-and-forget ต้องไม่หน่วง/ทำให้คำตอบพัง
// 🔒 เขียนด้วย service role · ห้าม import เข้า client component

import { createServiceClient } from "@/lib/supabase/server";

const MAX_Q_LEN = 500;

export function logQuestion(rec: {
  question: string;
  status: "answered" | "needs_input" | "unclear";
  fns?: string[];
  userId?: string | null;
  channel?: string;
}): void {
  // ไม่ await — บันทึกสถิติต้องไม่หน่วงผู้ใช้
  void (async () => {
    try {
      const svc = createServiceClient();
      await svc.from("chat_question_log").insert({
        question: rec.question.slice(0, MAX_Q_LEN),
        status: rec.status,
        fns: rec.fns ?? [],
        user_id: rec.userId ?? null,
        channel: rec.channel ?? "web",
      });
    } catch (e) {
      console.warn("[question-log] บันทึกไม่สำเร็จ (ไม่กระทบคำตอบ)", e);
    }
  })();
}
