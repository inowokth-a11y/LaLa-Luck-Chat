// สรุปประวัติคำถามแชท (chat_question_log) — ตรรกะล้วน (เทสต์ได้)
// เน้น "คำถามที่ตอบไม่ได้ (unclear)" = ความต้องการที่ยังไม่มี engine → จัดลำดับฟีเจอร์ถัดไป

export interface QuestionRow {
  question: string;
  status: string; // answered | needs_input | unclear
  fns: string[] | null;
  created_at: string;
}

export interface QuestionSummary {
  total: number;
  byStatus: { status: string; count: number }[];
  answeredRate: number;
  /** คำถาม unclear ล่าสุด (สิ่งที่ผู้ใช้อยากได้แต่เรายังตอบไม่ได้) */
  recentUnclear: { question: string; created_at: string }[];
  /** คำถามที่ตอบได้ล่าสุด (+ ฟังก์ชันที่ใช้) */
  recentAnswered: { question: string; fns: string[]; created_at: string }[];
  /** ฟังก์ชันที่ถูกใช้บ่อยสุด (จากคำถามที่ตอบได้) */
  topFns: { fn: string; count: number }[];
}

const STATUS_ORDER = ["answered", "needs_input", "unclear"];

export function summarizeQuestions(rows: QuestionRow[], unclearLimit = 20): QuestionSummary {
  const statusMap = new Map<string, number>();
  const fnMap = new Map<string, number>();
  const unclear: { question: string; created_at: string }[] = [];
  const answeredList: { question: string; fns: string[]; created_at: string }[] = [];

  for (const r of rows) {
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    if (r.status === "unclear") unclear.push({ question: r.question, created_at: r.created_at });
    if (r.status === "answered") answeredList.push({ question: r.question, fns: r.fns ?? [], created_at: r.created_at });
    for (const fn of r.fns ?? []) fnMap.set(fn, (fnMap.get(fn) ?? 0) + 1);
  }

  const answered = statusMap.get("answered") ?? 0;
  return {
    total: rows.length,
    byStatus: [...statusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)),
    answeredRate: rows.length === 0 ? 0 : Math.round((answered / rows.length) * 100) / 100,
    // rows เรียง created_at desc มาแล้ว (จาก query) → แรกๆ คือใหม่สุด
    recentUnclear: unclear.slice(0, unclearLimit),
    recentAnswered: answeredList.slice(0, unclearLimit),
    topFns: [...fnMap.entries()]
      .map(([fn, count]) => ({ fn, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
