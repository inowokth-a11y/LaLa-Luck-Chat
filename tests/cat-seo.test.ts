// SEO ดูดวงแมว (9 ก.ย. 2569) — หน้ารายชนิด 18 + ตารางสีตามวันเกิดจาก engine + กติกาถ้อยคำโหมดแมว
import { test } from "node:test";
import assert from "node:assert";
import {
  catSeoEntries,
  catSeoEntry,
  dayCatColorRows,
  breedDayRows,
  catHubFaq,
  catBreedFaq,
  relatedBreeds,
  CAT_SEO_INTRO_TH,
  CAT_DAY_COLOR_CAVEAT,
  THAI_DAYS,
} from "../lib/cat/seo";
import { DAY_ELEMENT, wuXingScore } from "../lib/engine/element";

test("catSeoEntries — 18 ชนิด slug ไม่ซ้ำ (ชื่อไทย) · หาได้ทั้ง slug และ key · ธาตุมาจากสีขน", () => {
  const all = catSeoEntries();
  assert.equal(all.length, 18);
  assert.equal(new Set(all.map((e) => e.slug)).size, 18);
  assert.equal(all.filter((e) => e.inTamra).length, 17);
  assert.equal(catSeoEntry("วิเชียรมาศ")?.key, "wichienmat");
  assert.equal(catSeoEntry("wichienmat")?.slug, "วิเชียรมาศ");
  assert.equal(catSeoEntry("แมวเถื่อน"), null);
  // วิเชียรมาศ = ครีม → ดิน · โกญจา ดำ → น้ำ · สีสวาด เทา → ทอง
  assert.equal(catSeoEntry("วิเชียรมาศ")?.element, "Earth");
  assert.equal(catSeoEntry("โกญจา")?.element, "Water");
  assert.equal(catSeoEntry("สีสวาด")?.element, "Metal");
});

test("dayCatColorRows — 7 วันครบ · ค่าทุกช่องตรง wuXingScore(ธาตุวัน, ธาตุสี) จริง · ทุกวันมีสีเกื้อหนุนอย่างน้อย 1", () => {
  const rows = dayCatColorRows();
  assert.deepEqual(rows.map((r) => r.day), [...THAI_DAYS]);
  for (const r of rows) {
    assert.equal(r.dayEl, DAY_ELEMENT[r.day]);
    assert.ok(r.support.length + r.harmony.length >= 1, r.day);
    for (const c of [...r.support, ...r.harmony, ...r.care]) {
      // ตรวจซ้ำกับ engine ตัวจริง (ห้ามมีตัวเลขที่ไม่ได้มาจาก wuXingScore)
      const el = c.colorTh === "ขาว" || c.colorTh === "เทา" ? "Metal" : c.colorTh === "ดำ" ? "Water" : c.colorTh === "ส้ม" ? "Fire" : "Earth";
      assert.equal(c.score, wuXingScore(r.dayEl, el, []).final_score, `${r.day}/${c.colorTh}`);
    }
    for (const c of r.care) assert.ok(c.score < 0);
  }
  // คนเกิดวันอังคาร (ไฟ): ขาว/เทา (ทอง) ต้องอยู่ฝั่งควรดูแล (ไฟพิฆาตทอง)
  const tue = rows.find((r) => r.day === "อังคาร")!;
  assert.ok(tue.care.some((c) => c.colorTh === "ขาว") && tue.care.some((c) => c.colorTh === "เทา"));
});

test("breedDayRows/relatedBreeds — 7 วันสำหรับชนิดที่มีธาตุ · ว่างสำหรับ calico/none · related ธาตุเดียวกันมาก่อน", () => {
  const w = catSeoEntry("วิเชียรมาศ")!;
  assert.equal(breedDayRows(w).length, 7);
  const rel = relatedBreeds(w, 6);
  assert.equal(rel.length, 6);
  assert.ok(!rel.some((r) => r.slug === w.slug));
  assert.ok(rel[0].element === "Earth", "ชนิดธาตุเดียวกันต้องมาก่อน");
});

test("🔴 ถ้อยคำ SEO ตามกติกาโหมดแมว — ห้ามตัดสินแมวร้าย/ให้โทษ · ห้ามสุขภาพสัตว์ · FAQ ครบทุกชนิด", () => {
  const banned = /แมวร้าย|อัปมงคล|ให้โทษ|เสนียด|ไม่ควรเลี้ยง|ทิ้ง|โรค|ป่วย|รักษา/;
  const strings: string[] = [CAT_SEO_INTRO_TH, CAT_DAY_COLOR_CAVEAT];
  for (const f of catHubFaq()) strings.push(f.q, f.a);
  for (const e of catSeoEntries()) {
    const faq = catBreedFaq(e);
    assert.ok(faq.length >= 2, e.nameTh);
    for (const f of faq) strings.push(f.q, f.a);
  }
  for (const s of strings) assert.ok(!banned.test(s), `พบคำต้องห้าม: ${s.slice(0, 70)}`);
  // FAQ hub ต้องพูดถึง 17 ชนิดครบชื่อ + ข้อความ "ไม่ใช่ห้ามเลี้ยง" ต้องมีในตารางสี
  const hub = catHubFaq().map((f) => f.a).join(" ");
  for (const e of catSeoEntries().filter((x) => x.inTamra)) assert.ok(hub.includes(e.nameTh), e.nameTh);
  assert.ok(CAT_DAY_COLOR_CAVEAT.includes("ไม่ใช่ห้ามเลี้ยง"));
});
