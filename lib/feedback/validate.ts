// ตรวจ input ความเห็น/คำถามความเห็น — ตรรกะล้วน (เทสต์ได้ · กันข้อมูลพังก่อนแตะ DB)

export const MAX_FEEDBACK_LEN = 1000;
export const MAX_PROMPT_LEN = 200;

export type FeedbackParsed = { ok: true; message: string; rating: number | null; promptId: number | null };
export type ValidationFail = { ok: false; error: string };

export function validateFeedback(input: {
  message?: unknown;
  rating?: unknown;
  promptId?: unknown;
}): FeedbackParsed | ValidationFail {
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message) return { ok: false, error: "กรุณาพิมพ์ความเห็น" };
  if (message.length > MAX_FEEDBACK_LEN) return { ok: false, error: `ความเห็นยาวเกินไป (สูงสุด ${MAX_FEEDBACK_LEN})` };

  let rating: number | null = null;
  if (input.rating !== undefined && input.rating !== null && input.rating !== "") {
    const r = Number(input.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return { ok: false, error: "คะแนนต้องเป็น 1-5" };
    rating = r;
  }

  let promptId: number | null = null;
  if (input.promptId !== undefined && input.promptId !== null && input.promptId !== "") {
    const p = Number(input.promptId);
    if (Number.isInteger(p) && p > 0) promptId = p; // ค่าพัง = ถือว่าเปิดกว้าง (ไม่ผูก prompt) ไม่ error
  }

  return { ok: true, message: message.slice(0, MAX_FEEDBACK_LEN), rating, promptId };
}

export function validatePromptQuestion(q: unknown): { ok: true; question: string } | ValidationFail {
  const question = typeof q === "string" ? q.trim() : "";
  if (!question) return { ok: false, error: "กรุณาพิมพ์คำถาม" };
  if (question.length > MAX_PROMPT_LEN) return { ok: false, error: `คำถามยาวเกินไป (สูงสุด ${MAX_PROMPT_LEN})` };
  return { ok: true, question };
}
