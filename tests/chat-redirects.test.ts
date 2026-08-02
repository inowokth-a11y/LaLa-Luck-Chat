// เทสต์ตัวดักคำถาม (lib/chat/redirects.ts) — จาก benchmark คำถามยอดฮิต 2 ส.ค. 2569

import { test } from "node:test";
import assert from "node:assert/strict";
import { chatRedirectIntercept } from "../lib/chat/redirects";

test("คำถามผลการรักษา → ปฏิเสธอ่อนโยน + ชี้ไปหาแพทย์ (ห้ามมีเมนูขายของ)", () => {
  for (const q of ["เป็นมะเร็งจะหายไหม", "ผ่าตัดแล้วจะรอดมั้ย", "ป่วยหนักอยู่ จะหายป่วยไหม"]) {
    const r = chatRedirectIntercept(q);
    assert.equal(r?.kind, "medical", q);
    assert.ok(r!.message.includes("แพทย์"), "ต้องชี้ไปหาแพทย์");
    assert.ok(r!.message.includes("กำลังใจ"), "ต้องมีความเห็นใจ");
    assert.ok(!r!.message.includes("เลขทะเบียน"), "ห้ามเสนอเมนูขายของในบริบทนี้");
  }
});

test("medical ชนะ tool เมื่อปนกัน — 'ฤกษ์ผ่าตัด...จะหายไหม' ต้องตอบแบบ medical", () => {
  const r = chatRedirectIntercept("จะผ่าตัดเดือนหน้า ดูฤกษ์ให้หน่อย แล้วจะหายไหม");
  assert.equal(r?.kind, "medical");
});

test("คำถามที่มีเครื่องมือเฉพาะ → พาไปหน้าเครื่องมือ ไม่ใช่ 'ยังไม่มีโหมด'", () => {
  assert.equal(chatRedirectIntercept("ฝันเห็นงูใหญ่ หมายถึงอะไร")?.kind, "dream");
  assert.equal(chatRedirectIntercept("ฤกษ์แต่งงานเดือนหน้าวันไหนดี")?.kind, "timing");
  assert.equal(chatRedirectIntercept("โต๊ะทำงานหันทิศไหนดี ฮวงจุ้ยห้องนอน")?.kind, "fengshui");
  assert.equal(chatRedirectIntercept("อยากเสี่ยงทายเรื่องงาน")?.kind, "oracle");
  // ข้อความต้องบอกชื่อหน้า (ผู้ใช้กดตามได้)
  assert.ok(chatRedirectIntercept("ทำนายฝันหน่อย")!.message.includes("/dream"));
  assert.ok(chatRedirectIntercept("หาวันมงคลออกรถ")!.message.includes("/timing"));
});

test("คำถามปกติต้องไม่ถูกดัก — ปล่อยไปเส้น AI/engine", () => {
  for (const q of [
    "ทะเบียนรถ 8899 ดีไหม",
    "ช่วงนี้เครียดมาก ทำยังไงดี", // ดูแลใจทั่วไป — wellness ตอบได้ ไม่ใช่ medical
    "ปีนี้เหมาะเริ่มธุรกิจใหม่ไหม",
    "ธาตุไฟเข้ากับธาตุน้ำไหม",
    "อยากมีสุขภาพดีขึ้นทำยังไง", // ไม่ใช่คำถามผลการรักษาโรค
  ]) {
    assert.equal(chatRedirectIntercept(q), null, `"${q}" ไม่ควรถูกดัก`);
  }
});
