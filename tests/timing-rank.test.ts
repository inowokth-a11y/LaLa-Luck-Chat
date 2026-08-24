// เทสต์จัดอันดับวันฤกษ์ (lib/engine/timing.ts) — ต่อยอด Logic 3 (ไม่ใช่ golden parity)
import { test } from "node:test";
import assert from "node:assert/strict";

import { rankAuspiciousDays, ACTIVITIES, TIMING_CAVEAT } from "../lib/engine/timing";

test("คืนทุกวันในช่วง เรียงคะแนนมากไปน้อย + มี caveat กาลโยคเสมอ", () => {
  const r = rankAuspiciousDays({ fromISO: "2026-05-01", toISO: "2026-05-14", emphasis: "thanchai" });
  assert.equal(r.days.length, 14);
  for (let i = 1; i < r.days.length; i++) {
    assert.ok(r.days[i - 1].score >= r.days[i].score, "ต้องเรียงคะแนนจากมากไปน้อย");
  }
  assert.ok(/กาลโยค/.test(r.caveat) && /อุบากอง/.test(r.caveat));
});

test("ทุกวันมีฤกษ์รายชั่วโมง (อุบากอง) ติดมาด้วย", () => {
  const r = rankAuspiciousDays({ fromISO: "2026-05-01", toISO: "2026-05-07", emphasis: "any" });
  for (const d of r.days) {
    assert.ok(d.bestHour.range.includes("-"), "ต้องมีช่วงเวลายามดี");
    assert.ok(d.bestHour.yam, "ต้องมีชื่อยาม");
  }
});

test("วันร้าย (อุบาทว์/โลกาวินาศ) ถูกจัด verdict avoid และรั้งท้าย", () => {
  const r = rankAuspiciousDays({ fromISO: "2026-04-16", toISO: "2027-04-15", emphasis: "thanchai" });
  const avoid = r.days.filter((d) => d.verdict === "avoid");
  assert.ok(avoid.length > 0, "ทั้งปีควรมีวันที่ควรเลี่ยง");
  for (const d of avoid) {
    // ชั้นที่ 3 (ฤกษ์บน 24 ส.ค. 2569): วัน avoid มาจากวันร้ายกาลโยค หรือฤกษ์แตกขาด (โจโร/เพชฌฆาต/เทศาตรี)
    assert.ok(d.badTypes.length > 0 || d.rerk.fit === "avoid", "วัน avoid ต้องมีวันร้ายกาลโยคหรือฤกษ์เลี่ยง");
    assert.ok(d.score < 0);
  }
});

test("emphasis ต่างกัน → คะแนนบางวันต่างกัน (ธงชัย vs อธิบดี เน้นคนละวัน)", () => {
  const range = { fromISO: "2026-04-16", toISO: "2027-04-15" };
  const th = rankAuspiciousDays({ ...range, emphasis: "thanchai" });
  const ath = rankAuspiciousDays({ ...range, emphasis: "athibodi" });
  const thByDate = new Map(th.days.map((d) => [d.dateISO, d.score]));
  const anyDiff = ath.days.some((d) => thByDate.get(d.dateISO) !== d.score);
  assert.ok(anyDiff, "emphasis ต่างกันต้องทำให้อย่างน้อยหนึ่งวันคะแนนต่าง (เน้นคนละประเภท)");
});

test("ช่วงวันที่ผิด → คืนว่าง ไม่ throw", () => {
  assert.equal(rankAuspiciousDays({ fromISO: "2026-05-10", toISO: "2026-05-01", emphasis: "any" }).days.length, 0);
  assert.equal(rankAuspiciousDays({ fromISO: "พัง", toISO: "2026-05-01", emphasis: "any" }).days.length, 0);
});

test("จำกัดจำนวนวัน (maxDays)", () => {
  const r = rankAuspiciousDays({ fromISO: "2026-01-01", toISO: "2026-12-31", emphasis: "any", maxDays: 30 });
  assert.equal(r.days.length, 30);
});

test("ACTIVITIES preset ครบ + จับคู่ emphasis ถูก (ทะเบียนรถ/บ้าน/บริษัท = ธงชัย)", () => {
  const byKey = Object.fromEntries(ACTIVITIES.map((a) => [a.key, a.emphasis]));
  assert.equal(byKey.open_company, "thanchai");
  assert.equal(byKey.car_registration, "thanchai");
  assert.equal(byKey.housewarming, "thanchai");
  assert.equal(byKey.negotiation, "athibodi");
  assert.equal(byKey.general, "any");
});
