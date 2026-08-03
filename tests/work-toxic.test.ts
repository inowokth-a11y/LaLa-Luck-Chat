// เทสต์กลยุทธ์รับมือที่ทำงานเป็นพิษ (lib/engine/work-toxic.ts) — เนื้อหาจาก Toxic_Workplace_KB ผู้ใช้

import { test } from "node:test";
import assert from "node:assert/strict";
import { WORK_PATTERNS, WORK_PATTERN_INFO, toWorkPattern, getWorkShield, EXIT_FIRST_STEPS } from "../lib/engine/work-toxic";

test("ทุก pattern มี กลยุทธ์+สคริปต์+จุดยกระดับ+ธาตุ+เทคนิคตั้งหลัก ครบ", () => {
  for (const p of WORK_PATTERNS) {
    const r = getWorkShield(p, []);
    assert.ok(r.validation.includes("ไม่ใช่ความอ่อนแอ"), "ต้อง validate ความรู้สึกเสมอ");
    assert.ok(r.grounding.steps.length > 20, `${p}: ต้องมีเทคนิคตั้งหลักจริง`);
    assert.ok(r.caveat.includes("ไม่ใช่คำแนะนำทางกฎหมาย"));
    if (p !== "exit_thoughts") {
      const info = WORK_PATTERN_INFO[p as keyof typeof WORK_PATTERN_INFO];
      assert.ok(info.script.length > 20 && info.strategy.length > 20 && info.escalation.length > 10, p);
      assert.ok(info.elementNote.length > 3, `${p}: ต้องมี element_link จากต้นฉบับ`);
    }
  }
});

test("exit_thoughts — ไม่ผลักให้อยู่หรือออก + มีขั้นแรกประเมิน 3 ข้อ (Exit_Checklist)", () => {
  const r = getWorkShield("exit_thoughts", []);
  assert.ok(r.strategy!.includes("ของคุณคนเดียว"), "การตัดสินใจต้องเป็นของผู้ใช้");
  assert.deepEqual(r.exitSteps, EXIT_FIRST_STEPS);
  assert.equal(r.exitSteps!.length, 3);
});

test("toWorkPattern — จำแนกภาษาไทย · gaslighting ครอบ 'บอกว่าเราคิดไปเอง' · นอกเหนือ = null", () => {
  assert.equal(toWorkPattern("โดนเคลมงานตลอดเลย"), "credit_stealing");
  assert.equal(toWorkPattern("หัวหน้าบอกว่าฉันคิดไปเอง จำผิดเอง"), "gaslighting");
  assert.equal(toWorkPattern("โดนโยนความผิดประจำ"), "scapegoating");
  assert.equal(toWorkPattern("micromanage สุดๆ"), "micromanagement");
  assert.equal(toWorkPattern("อยากลาออกแต่ไม่แน่ใจ"), "exit_thoughts");
  assert.equal(toWorkPattern("อยากรวย"), null);
});

test("gaslighting → เทคนิคตั้งหลักคือ defusion/บันทึกหลักฐาน (ตาม Rules ต้นฉบับ GR003+GR004)", () => {
  const r = getWorkShield("gaslighting", []);
  assert.ok(["GR003", "GR004"].includes(r.grounding.id), `ได้ ${r.grounding.id}`);
  assert.ok(r.escalation!.includes("อย่ายอมรับว่าเป็นเรื่องธรรมดา"), "ห้าม normalize gaslighting");
});
