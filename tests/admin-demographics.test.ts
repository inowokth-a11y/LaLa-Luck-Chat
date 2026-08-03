// สรุปผู้ถามตาม เพศ×ช่วงอายุ×แนวคำถาม — ตรรกะล้วน (แดชบอร์ดแอดมิน 4 ส.ค. 2569)
import test from "node:test";
import assert from "node:assert/strict";
import { ageBucket, questionTopic, summarizeDemographics } from "../lib/admin/demographics";

const NOW = new Date("2026-08-04T00:00:00Z");

test("ageBucket — ช่วงถูกต้อง + ปีเพี้ยน (พ.ศ./อนาคต) = ไม่ทราบ ไม่เดา", () => {
  assert.equal(ageBucket("2000-01-01", NOW), "25-34");
  assert.equal(ageBucket("2010-01-01", NOW), "<18");
  assert.equal(ageBucket("1960-01-01", NOW), "55+");
  assert.equal(ageBucket("2000-12-31", NOW), "25-34"); // ยังไม่ถึงวันเกิดปีนี้ = 25
  assert.equal(ageBucket(null, NOW), "ไม่ทราบ");
  assert.equal(ageBucket("2533-05-05", NOW), "ไม่ทราบ"); // พ.ศ. หลุดมา — อายุติดลบ ห้ามเดา
  assert.equal(ageBucket("ขยะ", NOW), "ไม่ทราบ");
});

test("questionTopic — จัดแนวตาม keyword · เฉพาะเจาะจงชนะกว้าง · นอกเกณฑ์ = อื่นๆ", () => {
  assert.equal(questionTopic("ทะเบียนรถ 6266 ดีไหม"), "เลขมงคล");
  assert.equal(questionTopic("ชื่อสมชายเข้ากับดวงไหม"), "ชื่อ");
  assert.equal(questionTopic("พรุ่งนี้ออกรถกี่โมงดี"), "ฤกษ์/เวลา");
  assert.equal(questionTopic("เมื่อไหร่จะเจอเนื้อคู่"), "ความรัก");
  assert.equal(questionTopic("ปีนี้ควรย้ายงานไหม"), "งาน/เงิน");
  assert.equal(questionTopic("ช่วงนี้เครียดมาก"), "ใจ/สุขภาวะ");
  assert.equal(questionTopic("ดวงปีนี้เป็นยังไง"), "ดวงรวม/ธาตุ");
  assert.equal(questionTopic("สวัสดีครับ"), "อื่นๆ");
});

test("summarizeDemographics — นับต่อกลุ่มถูก + คนไม่มีโปรไฟล์แยกเป็น unattributed (ไม่เดาเพศ/อายุ)", () => {
  const profiles = [
    { auth_uid: "u1", birth_date: "2000-01-01", gender: "female" },
    { auth_uid: "u2", birth_date: "1990-01-01", gender: "male" },
    { auth_uid: "u3", birth_date: null, gender: null },
  ];
  const questions = [
    { user_id: "u1", question: "ทะเบียนรถดีไหม" },
    { user_id: "u1", question: "เบอร์โทรนี้เป็นยังไง" },
    { user_id: "u1", question: "เมื่อไหร่เจอเนื้อคู่" },
    { user_id: "u2", question: "ปีนี้ย้ายงานดีไหม" },
    { user_id: "u3", question: "ดวงเป็นไง" },
    { user_id: null, question: "สวัสดี" },
    { user_id: "ไม่มีโปรไฟล์", question: "ฤกษ์ออกรถ" },
  ];
  const s = summarizeDemographics(profiles, questions, NOW);
  assert.equal(s.totalQuestions, 7);
  assert.equal(s.unattributed, 2); // null + ไม่มีโปรไฟล์
  const f = s.byAgeGender.find((x) => x.gender === "female");
  assert.deepEqual({ age: f?.age, count: f?.count }, { age: "25-34", count: 3 });
  const femTopics = s.topTopicsByGender.find((x) => x.gender === "female")!.topics;
  assert.equal(femTopics[0].topic, "เลขมงคล");
  assert.equal(femTopics[0].count, 2);
  const unknown = s.byAgeGender.find((x) => x.gender === "unknown");
  assert.equal(unknown?.age, "ไม่ทราบ");
});
