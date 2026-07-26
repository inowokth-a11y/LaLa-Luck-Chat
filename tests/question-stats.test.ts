// เทสต์สรุปประวัติคำถาม (lib/admin/question-stats.ts)
import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeQuestions, type QuestionRow } from "../lib/admin/question-stats";

const row = (p: Partial<QuestionRow>): QuestionRow => ({
  question: "q",
  status: "answered",
  fns: [],
  created_at: "2569-07-26T10:00:00Z",
  ...p,
});

test("นับตามสถานะ + answered rate + top fns", () => {
  const s = summarizeQuestions([
    row({ status: "answered", fns: ["lookup2digit"] }),
    row({ status: "answered", fns: ["lookup2digit", "wuXingScore"] }),
    row({ status: "unclear", question: "ดูลายมือให้หน่อย" }),
    row({ status: "needs_input" }),
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.answeredRate, 0.5);
  assert.equal(s.byStatus.find((x) => x.status === "answered")?.count, 2);
  assert.equal(s.topFns[0].fn, "lookup2digit");
  assert.equal(s.topFns[0].count, 2);
});

test("🔴 คำถาม unclear ถูกดึงมาโชว์ (สิ่งที่ยังตอบไม่ได้)", () => {
  const s = summarizeQuestions([
    row({ status: "unclear", question: "ดูดวงเนื้อคู่", created_at: "2569-07-26T12:00:00Z" }),
    row({ status: "answered" }),
    row({ status: "unclear", question: "ทำนายไพ่ยิปซี", created_at: "2569-07-26T11:00:00Z" }),
  ]);
  assert.equal(s.recentUnclear.length, 2);
  assert.ok(s.recentUnclear.some((u) => u.question === "ดูดวงเนื้อคู่"));
});

test("จำกัดจำนวน unclear ที่โชว์", () => {
  const rows = Array.from({ length: 30 }, (_, i) => row({ status: "unclear", question: `q${i}` }));
  assert.equal(summarizeQuestions(rows, 20).recentUnclear.length, 20);
});

test("รายการว่าง → ไม่ throw", () => {
  const s = summarizeQuestions([]);
  assert.equal(s.total, 0);
  assert.equal(s.answeredRate, 0);
  assert.deepEqual(s.recentUnclear, []);
});
