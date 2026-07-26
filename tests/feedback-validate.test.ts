// เทสต์ตรวจ input ความเห็น (lib/feedback/validate.ts)
import { test } from "node:test";
import assert from "node:assert/strict";

import { validateFeedback, validatePromptQuestion, MAX_FEEDBACK_LEN } from "../lib/feedback/validate";

test("ความเห็นปกติ + ให้ดาว + ผูก prompt → ผ่าน", () => {
  const r = validateFeedback({ message: "  อยากได้โหมดเนื้อคู่  ", rating: 4, promptId: 3 });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.message, "อยากได้โหมดเนื้อคู่");
  assert.equal(r.rating, 4);
  assert.equal(r.promptId, 3);
});

test("ความเห็นว่าง / ยาวเกิน → error", () => {
  assert.equal((validateFeedback({ message: "   " }) as { ok: false }).ok, false);
  assert.equal((validateFeedback({ message: "ก".repeat(MAX_FEEDBACK_LEN + 1) }) as { ok: false }).ok, false);
});

test("คะแนนนอกช่วง 1-5 → error · ไม่ส่งคะแนน → null (ไม่บังคับ)", () => {
  assert.equal((validateFeedback({ message: "ดี", rating: 6 }) as { ok: false }).ok, false);
  assert.equal((validateFeedback({ message: "ดี", rating: 0 }) as { ok: false }).ok, false);
  const r = validateFeedback({ message: "ดี" });
  assert.ok(r.ok && r.rating === null);
});

test("promptId พัง → ถือว่าเปิดกว้าง (null) ไม่ error", () => {
  const r = validateFeedback({ message: "ดี", promptId: "abc" });
  assert.ok(r.ok && r.promptId === null);
});

test("คำถามความเห็น (admin): ว่าง/ยาวเกิน → error · ปกติ → trim", () => {
  assert.equal((validatePromptQuestion("") as { ok: false }).ok, false);
  assert.equal((validatePromptQuestion("ก".repeat(300)) as { ok: false }).ok, false);
  const r = validatePromptQuestion("  อยากได้ฟีเจอร์อะไรเพิ่ม?  ");
  assert.ok(r.ok && r.question === "อยากได้ฟีเจอร์อะไรเพิ่ม?");
});
