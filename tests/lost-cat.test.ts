// เทสต์ตามหาแมวหาย (เฟส 1 · 8 ก.ย. 2569) — กติกา: สถิติคุมระยะ · ภูมิประเทศคุมทิศ · ธาตุแค่ nudge
import { test } from "node:test";
import assert from "node:assert";
import {
  DIRS8,
  RINGS,
  lostCatPlan,
  ringWeights,
  directionScores,
  LOST_CAT_CAVEAT,
  LOST_CAT_STATS_NOTE,
  ELEMENT_DIR_NOTE,
} from "../lib/engine/lost-cat";

test("ringWeights — แมวในบ้านล้วน วง 0-50 หนักสุด · ออกนอกบ้านได้ วง 150-500 หนักสุด · รวม = 1 · ไม่มีวง 0", () => {
  const indoor = ringWeights("indoor", "unknown", 1);
  assert.equal(indoor.indexOf(Math.max(...indoor)), 0);
  const out = ringWeights("outdoor_access", "unknown", 1);
  assert.equal(out.indexOf(Math.max(...out)), 2);
  for (const w of [indoor, out, ringWeights("outdoor_only", "timid", 30)]) {
    assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    assert.ok(w.every((x) => x > 0), "ทุกวงต้อง > 0 (ห้ามตัดพื้นที่ทิ้ง)");
  }
  // ขี้กลัว → วงใกล้หนักขึ้น
  assert.ok(ringWeights("indoor", "timid", 1)[0] > indoor[0]);
});

test("🔴 fixture ตามเอกสารออกแบบ: แมวในบ้าน+ขี้กลัว+หาย 2 วัน → ช่องอันดับ 1 ต้องเป็นวง 0-50 ม. ไม่ว่าทิศ/ธาตุจะชี้ทางไหน", () => {
  for (const coat of [null, "black_solid", "orange", "white_solid"]) {
    for (const exit of [null, "ใต้", "ตะวันตกเฉียงเหนือ"]) {
      const plan = lostCatPlan({ catType: "indoor", temperament: "timid", daysMissing: 2, exitDir: exit, coat });
      assert.equal(plan.cells[0].ring, "r0", `coat=${coat} exit=${exit}`);
    }
  }
});

test("ทิศ — ทางที่แมวออกชนะ · ธาตุแมวแค่ nudge ห้ามชนะภูมิประเทศ · เสียงดังลดแต่ไม่เป็น 0 · ค่านอก enum เพิกเฉย", () => {
  const { scores } = directionScores({ catType: "indoor", daysMissing: 1, exitDir: "ตะวันออก", coat: "black_solid" });
  assert.equal(scores[0].dir, "ตะวันออก", "ทางออกต้องเป็นอันดับ 1 แม้ธาตุน้ำ (ดำ) ชี้ทิศเหนือ");
  // ธาตุอย่างเดียว (ไม่มีข้อมูลภูมิประเทศ) จึงจะดันทิศธาตุขึ้น — และมีป้ายเหตุผลชั้นเสริม
  const onlyEl = directionScores({ catType: "indoor", daysMissing: 1, coat: "black_solid" });
  assert.equal(onlyEl.scores[0].dir, "เหนือ");
  assert.ok(onlyEl.scores[0].reasonsTh.some((r) => r.includes("ชั้นเสริม")));
  // เสียงดัง: น้ำหนักลดแต่ยังมี
  const noisy = directionScores({ catType: "indoor", daysMissing: 1, noiseDirs: ["ใต้"] });
  const south = noisy.scores.find((s) => s.dir === "ใต้")!;
  assert.ok(south.weight > 0 && south.weight < 1 / DIRS8.length);
  // injection/ค่าเพี้ยน
  const junk = directionScores({ catType: "indoor", daysMissing: 1, exitDir: "<script>", coverDirs: ["mars", "เหนือ"] });
  assert.equal(junk.scores[0].dir, "เหนือ");
  assert.ok(Math.abs(junk.scores.reduce((a, s) => a + s.weight, 0) - 1) < 1e-9);
});

test("แผนรวม — 32 ช่องรวม 1 ทุกช่อง > 0 · บ้านเก่าดันวงไกล · ยามอุบากอง+ช่วงแมวเคลื่อนไหว · caveat ครบ", () => {
  const plan = lostCatPlan({
    catType: "outdoor_access", temperament: "curious", daysMissing: 3,
    exitDir: "ตะวันตก", oldHomeDir: "เหนือ", coat: "orange", todayDayTh: "อังคาร",
  });
  assert.equal(plan.cells.length, DIRS8.length * RINGS.length);
  assert.ok(Math.abs(plan.cells.reduce((a, c) => a + c.score, 0) - 1) < 1e-9);
  assert.ok(plan.cells.every((c) => c.score > 0));
  // บ้านเก่า: ช่องวงไกลของทิศเหนือต้องสูงกว่าวงไกลของทิศที่น้ำหนักทิศเท่ากัน (ไม่มีเหตุผล)
  const northFar = plan.cells.find((c) => c.dir === "เหนือ" && c.ring === "r3")!;
  const eastFar = plan.cells.find((c) => c.dir === "ตะวันออก" && c.ring === "r3")!;
  assert.ok(northFar.score > eastFar.score);
  assert.ok(plan.ubakong && plan.windows.some((w) => w.labelTh.includes("อุบากอง")));
  assert.ok(plan.windows.some((w) => w.timeTh.includes("18:00-22:00")));
  assert.ok(plan.lureTh?.includes("ชั้นเสริม"));
  assert.deepEqual(plan.caveats, [LOST_CAT_CAVEAT, LOST_CAT_STATS_NOTE, ELEMENT_DIR_NOTE]);
  assert.ok(plan.checklistTh.length >= 6 && plan.hopeTh.includes("34%"));
  // ไม่ส่งวัน = ไม่มีชั้นยาม แต่แผนยังครบ
  const noDay = lostCatPlan({ catType: "indoor", daysMissing: 0 });
  assert.equal(noDay.ubakong, null);
  assert.equal(noDay.caveats.length, 2);
});

test("🔴 ถ้อยคำ — ห้ามฟันธงตำแหน่ง/ห้ามบอกให้เลิกค้น ในทุก string ที่ผู้ใช้เห็น", () => {
  const banned = /อยู่ที่นั่นแน่|แน่นอนว่าอยู่|ไม่ต้องค้น|เลิกค้น|ตายแล้ว|ไม่มีทางเจอ/;
  const plan = lostCatPlan({ catType: "indoor", temperament: "timid", daysMissing: 10, exitDir: "ใต้", coat: "black_solid", todayDayTh: "ศุกร์" });
  const strings = [
    LOST_CAT_CAVEAT, LOST_CAT_STATS_NOTE, ELEMENT_DIR_NOTE, plan.hopeTh, plan.lureTh ?? "",
    ...plan.checklistTh, ...plan.windows.map((w) => w.timeTh),
    ...plan.cells.flatMap((c) => [...c.whyTh, ...c.placesTh]),
  ];
  for (const s of strings) assert.ok(!banned.test(s), s.slice(0, 60));
});
