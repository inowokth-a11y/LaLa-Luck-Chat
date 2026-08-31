// เทสต์คำแนะนำสองแนวทาง (เสริมส่วนที่ขาด / ส่งเสริมจุดแข็ง) — ผู้ใช้เคาะ 31 ส.ค. 2569
// ขอบเขต: เฉพาะคำแนะนำท้ายคำทำนาย · แพทเทิร์น Mirror เดิม (ระบบไม่เลือกแทน ห้ามคำเชียร์)
import { test } from "node:test";
import assert from "node:assert";
import {
  SUPPORT_OF,
  dualAdvicePaths,
  dualAdviceContextTh,
  DUAL_ADVICE_NOTE,
  DUAL_ADVICE_CAVEAT,
} from "../lib/engine/dual-advice";
import { ELEMENT_TO_COLORS } from "../lib/engine/fengshui";
import { getWellnessPair } from "../lib/engine/wellness";
import type { Element5 } from "../lib/engine/element";

test("SUPPORT_OF — วงจรให้กำเนิดครบ 5 ธาตุ (น้ำ→ไม้→ไฟ→ดิน→ทอง→น้ำ)", () => {
  assert.deepEqual(SUPPORT_OF, {
    Wood: "Water",
    Fire: "Wood",
    Earth: "Fire",
    Metal: "Earth",
    Water: "Metal",
  });
});

test("dualAdvicePaths — ทุกค่ามาจากตารางเดิมจริง ไม่มีสูตรใหม่", () => {
  const da = dualAdvicePaths("Fire", ["Water"]);
  // แนวเสริมขาด: ธาตุน้ำ — สีจาก ELEMENT_TO_COLORS · เทคนิคจาก wellness ธาตุน้ำ
  assert.ok(da.lack);
  assert.ok(da.lack!.focusTh.includes("น้ำ"));
  assert.deepEqual(da.lack!.colors, ELEMENT_TO_COLORS.Water.slice(0, 2));
  const wWater = getWellnessPair("Water");
  assert.equal(da.lack!.practiceTh, "error" in wWater ? null : wWater.internal.name);
  // แนวเสริมแข็ง: ธาตุแม่ของไฟ = ไม้ (印) — สีธาตุไม้ · เทคนิคของธาตุเด่นเอง
  assert.ok(da.strength.focusTh.includes("ไฟ") && da.strength.focusTh.includes("ไม้"));
  assert.deepEqual(da.strength.colors, ELEMENT_TO_COLORS.Wood.slice(0, 2));
  const wFire = getWellnessPair("Fire");
  assert.equal(da.strength.practiceTh, "error" in wFire ? null : wFire.internal.name);
  // ที่มาสองแนวต้องต่างกันจริง (ตำราหนุน vs ประกอบจากวงจร) — ห้ามทำให้ดูเท่ากัน
  assert.notEqual(da.lack!.sourceTh, da.strength.sourceTh);
  assert.ok(da.strength.sourceTh.includes("ไม่ใช่ตารางตำราเฉพาะ"));
  assert.deepEqual(da.caveats, [DUAL_ADVICE_CAVEAT]);
});

test("ธาตุครบ (ไม่มีขาด) → ไม่มีทางแยกปลอม: lack = null เหลือแนวเดียว", () => {
  const da = dualAdvicePaths("Earth", []);
  assert.equal(da.lack, null);
  assert.ok(da.strength.focusTh.includes("ดิน"));
  const ctx = dualAdviceContextTh(da);
  assert.ok(!ctx.includes("เสริมส่วนที่ขาด"), "ธาตุครบต้องไม่โผล่แนวเสริมขาด");
  assert.ok(ctx.includes("ส่งเสริมจุดแข็ง"));
});

test("บล็อก context — ครบสองแนว + โน้ตให้ผู้ใช้เลือกเอง + ไม่มีคำเชียร์", () => {
  const ctx = dualAdviceContextTh(dualAdvicePaths("Wood", ["Metal", "Water"]));
  assert.ok(ctx.includes("เสริมส่วนที่ขาด") && ctx.includes("ส่งเสริมจุดแข็ง"));
  assert.ok(ctx.includes("ทอง/น้ำ") || (ctx.includes("ทอง") && ctx.includes("น้ำ")), "ธาตุขาดหลายตัวต้องขึ้นครบ");
  assert.ok(ctx.includes(DUAL_ADVICE_NOTE));
  // กติกา Mirror เดิม: ห้ามคำเชียร์ในทุก string ของ engine (การเลือกเป็นของเจ้าของดวง)
  for (const el of ["Wood", "Fire", "Earth", "Metal", "Water"] as Element5[]) {
    const c = dualAdviceContextTh(dualAdvicePaths(el, el === "Water" ? [] : ["Water"]));
    assert.ok(!/ดีกว่า|เหมาะกว่า|ควรเลือก|แนะนำทาง/.test(c), `ห้ามคำเชียร์ (ธาตุ ${el})`);
  }
});
