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

test("คำถามต้องห้ามตามจรรยาบรรณ (จากรายงานวิจัย 2 ส.ค. 2569) → ปฏิเสธอ่อนโยนพร้อมเหตุผล", () => {
  const death = chatRedirectIntercept("ฉันจะตายเมื่อไหร่");
  assert.equal(death?.kind, "taboo_death");
  assert.ok(death!.message.includes("จรรยาบรรณ"));

  const baby = chatRedirectIntercept("ลูกในท้องโตขึ้นจะเป็นยังไง ดวงดีไหม");
  assert.equal(baby?.kind, "taboo_baby");
  assert.ok(baby!.message.includes("อวยพร"), "ต้องปิดด้วยการอวยพร ไม่ใช่ปฏิเสธห้วนๆ");

  const brk = chatRedirectIntercept("ทำยังไงให้เขาเลิกกับแฟนแล้วมาคบกับฉัน");
  assert.equal(brk?.kind, "taboo_love_break");
  assert.ok(brk!.message.includes("ไม่รับดู"));
  assert.equal(chatRedirectIntercept("อยากทำเสน่ห์ให้เขารัก")?.kind, "taboo_love_break");
});

test("MEDICAL_RE ฉบับขยาย — จับ 'โรคที่เป็นอยู่จะรักษาหายไหม' (เคสที่เคยรอด)", () => {
  assert.equal(chatRedirectIntercept("โรคที่เป็นอยู่จะรักษาหายไหม")?.kind, "medical");
  assert.equal(chatRedirectIntercept("อาการที่เป็นจะหายมั้ย")?.kind, "medical");
  // คำถามสุขภาพเชิงดูแล/เกณฑ์ ยังต้องผ่านไปสาย wellness (ไม่โดนดัก)
  assert.equal(chatRedirectIntercept("สุขภาพโดยรวมปีนี้เป็นอย่างไร"), null);
  assert.equal(chatRedirectIntercept("มีเกณฑ์เจ็บป่วยหรืออุบัติเหตุไหม"), null);
});
