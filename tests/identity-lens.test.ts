// เทสต์เลนส์เลขตัวตน (มติผู้ใช้ 1 ก.ย. 2569 — การ์ดพลังงานเข้าโหมดอื่นแบบ "สองทางให้เลือก")
import { test } from "node:test";
import assert from "node:assert";
import {
  identityLens,
  identityDualChemistry,
  identityLensSummaryTh,
  IDENTITY_LENS_CAVEAT,
} from "../lib/engine/identity-lens";
import { personalEnergyNumber } from "../lib/engine/card-id";
import { artifactElement, lookup2digit } from "../lib/engine/numerology";
import { wuXingScore } from "../lib/engine/element";

test("identityLens — เลข/การ์ด/ธาตุ มาจาก engine เดิมทุกตัว + caveat บังคับ", () => {
  const lens = identityLens("1990-03-15", { name: "สมชาย", birthTime: "18:30", dominant: "Fire", missing: ["Water"] });
  const n = personalEnergyNumber("1990-03-15", { name: "สมชาย", birthTime: "18:30" });
  assert.equal(lens.number, String(n).padStart(2, "0"), "เลขตัวตนต้องตรงสูตรรวม (= การ์ด /profile)");
  assert.equal(lens.card.name, lookup2digit(n).energy_name, "การ์ดต้องตรงตาราง Master Energy");
  assert.equal(lens.element, artifactElement(n), "ธาตุเลนส์ต้องมาจากตารางเลข→ธาตุของ Logic 2");
  assert.notEqual(lens.element, "Metal", "ธาตุจากเลขไม่มีวันเป็นทอง (ข้อจำกัดตารางเดิม)");
  assert.ok(lens.aspects.ภาพรวม >= 0 && lens.aspects.ภาพรวม <= 10);
  assert.deepEqual(lens.caveats, [IDENTITY_LENS_CAVEAT]);
  const sum = identityLensSummaryTh(lens);
  assert.ok(sum.includes(lens.number) && sum.includes(lens.elementTh) && sum.includes("เลนส์ทางเลือก"));
});

test("identityDualChemistry — ทาง ก ใช้ธาตุกำเนิด+ที่ขาด (clash ได้) · ทาง ข ไม่มีธาตุที่ขาด", () => {
  // ผู้ใช้ไฟขาดน้ำ เจอเป้าธาตุน้ำ: ทาง ก ต้องพลิกเป็นยา (+2 Productive Clash)
  const d = identityDualChemistry("Fire", ["Water"], "Earth", "Water");
  assert.equal(d.a.final_score, wuXingScore("Fire", "Water", ["Water"]).final_score);
  assert.equal(d.a.final_score, 2, "ทาง ก: ธาตุขาดพลิกเป็นยา");
  // ทาง ข: ดิน↔น้ำ ไม่มี missing → พิฆาตปกติ ไม่มีทางเป็น clash
  assert.equal(d.b.final_score, wuXingScore("Earth", "Water", []).final_score);
  assert.ok(d.b.final_score < 2, "ทาง ข ไม่มีแนวคิดธาตุที่ขาด — clash ไม่เกิด");
});

test("ไม่มีคำเชียร์/คำตัดสินใน string ของเลนส์ (กติกา Mirror เดิม)", () => {
  const lens = identityLens("1986-10-07", {});
  const all = [IDENTITY_LENS_CAVEAT, identityLensSummaryTh(lens)].join(" ");
  assert.ok(!/ดีกว่า|เหมาะกว่า|ควรเลือก|แม่นกว่า/.test(all));
});
