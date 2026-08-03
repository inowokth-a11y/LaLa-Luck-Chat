// เทสต์แบบประเมินสุขภาวะ (lib/engine/wellbeing.ts) — สูตรจาก Satiya_KWI KB ผู้ใช้

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KWI_QUESTIONS,
  KWI_DIMENSIONS,
  KWI_PATTERNS,
  validateKwiAnswers,
  scoreKwi,
  WELLBEING_CAVEAT,
} from "../lib/engine/wellbeing";

const answerAll = (idx: number | ((q: (typeof KWI_QUESTIONS)[number]) => number)) =>
  Object.fromEntries(KWI_QUESTIONS.map((q) => [q.id, typeof idx === "function" ? idx(q) : Math.min(idx, q.options.length - 1)]));

test("โครงคำถาม: ครบ 25 ข้อ · 5 ข้อ/มิติ · คะแนนตรงจำนวนตัวเลือก · V3 ไม่คิดคะแนน", () => {
  assert.equal(KWI_QUESTIONS.length, 25);
  for (const d of KWI_DIMENSIONS) {
    assert.equal(KWI_QUESTIONS.filter((q) => q.dimension === d).length, 5, d);
  }
  for (const q of KWI_QUESTIONS) {
    if (q.scores) assert.equal(q.scores.length, q.options.length, q.id);
  }
  assert.equal(KWI_QUESTIONS.find((q) => q.id === "V3")!.scores, null, "V3 เก็บข้อมูลเวลาอย่างเดียว (ต้นฉบับ)");
});

test("validate: ตอบครบทุกข้อ+ในช่วงเท่านั้นถึงผ่าน", () => {
  assert.equal(validateKwiAnswers(answerAll(2)), null);
  const missing = answerAll(2);
  delete (missing as Record<string, number>).M4;
  assert.ok(validateKwiAnswers(missing)?.includes("M4"));
  assert.ok(validateKwiAnswers({ ...answerAll(2), V1: 9 }));
  assert.ok(validateKwiAnswers({ ...answerAll(2), V1: "3" as never }));
});

test("คะแนน: ตอบดีสุดทุกข้อ → เบ่งบาน 🌟 · ตอบแย่สุด → ต้องการดูแล 💙 + referral", () => {
  // ตอบตัวเลือกคะแนนสูงสุดของแต่ละข้อ (ไม่ใช่ index สุดท้ายเสมอ เช่น A2 ตัวแรกดีสุด)
  const best = answerAll((q) => (q.scores ? q.scores.indexOf(Math.max(...q.scores)) : 0));
  const rBest = scoreKwi(best as Record<string, number>);
  assert.equal(rBest.badge.emoji, "🌟");
  assert.equal(rBest.pattern.id, "P001", "ทุกมิติ ≥3.5 = ผู้เบ่งบาน");
  assert.equal(rBest.showReferral, false);

  const worst = answerAll((q) => (q.scores ? q.scores.indexOf(Math.min(...q.scores)) : 0));
  const rWorst = scoreKwi(worst as Record<string, number>);
  assert.equal(rWorst.badge.emoji, "💙");
  assert.equal(rWorst.pattern.id, "P005", "ต่ำทุกมิติ = ผู้กำลังสร้างใหม่ (จับก่อนตาม priority)");
  assert.equal(rWorst.showReferral, true, "badge ต่ำสุด/REBUILDER ต้องชวนคุยผู้เชี่ยวชาญ");
});

test("pattern เฉพาะทาง: ผู้ให้ที่หมดแรง (connection สูง + vitality ต่ำ)", () => {
  // vitality ต่ำสุด, ที่เหลือสูงสุด
  const a = answerAll((q) =>
    q.scores
      ? q.dimension === "VITALITY"
        ? q.scores.indexOf(Math.min(...q.scores))
        : q.scores.indexOf(Math.max(...q.scores))
      : 0
  );
  const r = scoreKwi(a as Record<string, number>);
  assert.equal(r.pattern.id, "P004");
  assert.equal(r.lowest, "VITALITY");
});

test("เสียงแม่หมอ + คำต้องห้าม: ไม่มี ครับ/ผม (เสียง Satiya เดิม) และไม่มีคำคลินิก", () => {
  const clinical = /โรค|วินิจฉัย|ผิดปกติ|อาการป่วย|ซึมเศร้า|disorder/;
  for (const p of Object.values(KWI_PATTERNS)) {
    for (const t of [p.description, p.strength, p.challenge, p.opening, p.shortTermAction, p.longTerm]) {
      assert.ok(!/ครับ|(^|[^ก-๙])ผม/.test(t), `เสียงผิด persona ใน "${t.slice(0, 40)}"`);
      assert.ok(!clinical.test(t), `คำคลินิกใน "${t.slice(0, 40)}"`);
    }
  }
  for (const q of KWI_QUESTIONS) assert.ok(!clinical.test(q.text + q.options.join()), q.id);
  assert.ok(WELLBEING_CAVEAT.includes("ไม่ใช่เครื่องมือวินิจฉัย") && WELLBEING_CAVEAT.includes("1323"));
});
