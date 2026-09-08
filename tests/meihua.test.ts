// 梅花易数 — เทสต์กับตัวอย่างตัวเลขจากต้นฉบับ (卷一) + กติกาถ้อยคำแมวหาย
import { test } from "node:test";
import assert from "node:assert";
import { castFromNumbers, meihuaLostReading, shichenIndex, TRIGRAMS, OMEN_TH, MEIHUA_CAVEAT, hexagramName } from "../lib/engine/meihua";
import { DIRS8 } from "../lib/engine/lost-cat";

test("ตัวอย่างตัวเลขจากต้นฉบับ (卷一/เอกสารวิจัย): 34→兌 บน · 43→離 ล่าง · 43 mod 6 = 1 → 澤火革 แปรเป็น 澤山咸", () => {
  // year+month+day = 34 → upper 兌 (34 mod 8 = 2) · total 43 → lower 離 (43 mod 8 = 3) · moving line 1
  const c = castFromNumbers(5, 12, 17, 9);
  assert.equal(c.upper.hanzi, "兌");
  assert.equal(c.lower.hanzi, "離");
  assert.equal(c.movingLine, 1);
  assert.equal(c.hexagram, "澤火革");
  // 用 = กัวล่าง (เส้น 1 อยู่ล่าง) · พลิกเส้น 1 ของ 離(101) → 001 = 艮 → 澤山咸 (ตรงเอกสารวิจัย §1.4)
  assert.equal(c.yong.hanzi, "離");
  assert.equal(c.ti.hanzi, "兌");
  assert.equal(c.changed.hanzi, "艮");
  assert.equal(c.changedHexagram, "澤山咸");
  // 體 兌=ทอง · 用 離=ไฟ → ไฟพิฆาตทอง = 用克體
  assert.equal(c.relation, "yong_controls_ti");
  // เศษ 0 → 8 / 6
  const z = castFromNumbers(8, 8, 8, 6);
  assert.equal(z.upper.hanzi, "坤");
  assert.equal(z.movingLine, 6);
  assert.equal(z.yong.hanzi, z.upper.hanzi, "เส้น 6 อยู่กัวบน → 用 = กัวบน");
});

test("8 กัว — เส้น/ทิศ/ธาตุครบ · ทิศทุกตัวอยู่ใน DIRS8 · ชื่อ 64 กัวไม่ซ้ำ", () => {
  assert.equal(TRIGRAMS.length, 8);
  for (const t of TRIGRAMS) assert.ok((DIRS8 as readonly string[]).includes(t.dirTh), t.dirTh);
  assert.deepEqual(TRIGRAMS.map((t) => t.hanzi).join(""), "乾兌離震巽坎艮坤");
  const names = new Set<string>();
  for (const u of TRIGRAMS) for (const l of TRIGRAMS) names.add(hexagramName(u, l));
  assert.equal(names.size, 64);
  assert.equal(hexagramName(TRIGRAMS[0], TRIGRAMS[0]), "乾為天");
  assert.equal(hexagramName(TRIGRAMS[7], TRIGRAMS[0]), "地天泰");
});

test("shichen — 23:00/00:30 = 子 · 01:00 = 丑 · 12:00 = 午 · 22:59 = 亥", () => {
  assert.equal(shichenIndex(23), 0);
  assert.equal(shichenIndex(0), 0);
  assert.equal(shichenIndex(1), 1);
  assert.equal(shichenIndex(12), 6);
  assert.equal(shichenIndex(22), 11);
});

test("meihuaLostReading — ใช้ปีลี่ชุน/เดือนวันจันทรคติ/ยาม · โปร่งใสตัวเลข · ทิศตรง DIRS8 · อินพุตเพี้ยน = null", () => {
  // 8 ก.ย. 2569 = 2026-09-08 (ปีมะเมีย 午=7) 19:30 (戌=11) → เดือนจีน 7 วัน 27
  const r = meihuaLostReading("2026-09-08", "19:30")!;
  assert.ok(r);
  assert.equal(r.numbers.year, 7);
  assert.equal(r.numbers.animalTh, "มะเมีย");
  assert.equal(r.numbers.lunarMonth, 7);
  assert.equal(r.numbers.lunarDay, 27);
  assert.equal(r.numbers.shichen, "戌");
  assert.equal(r.numbers.hour, 11);
  // ตรวจสูตรซ้ำด้วยมือ: 7+7+27 = 41 → mod 8 = 1 乾 · +11 = 52 → mod 8 = 4 震 · 52 mod 6 = 4 → เส้น 4 (กัวบน = 用)
  assert.equal(r.upper.hanzi, "乾");
  assert.equal(r.lower.hanzi, "震");
  assert.equal(r.movingLine, 4);
  assert.equal(r.yong.hanzi, "乾");
  assert.equal(r.changed.hanzi, "巽", "乾(111) พลิกเส้นล่างสุดของกัวบน → 011 = 巽");
  assert.equal(r.dirTh, "ตะวันออกเฉียงใต้");
  assert.ok((DIRS8 as readonly string[]).includes(r.secondaryDirTh));
  assert.equal(r.hexagram, "天雷無妄");
  assert.equal(r.changedHexagram, "風雷益");
  assert.ok(r.summaryTh.includes("ตะวันออกเฉียงใต้") && r.summaryTh.includes("天雷無妄") && r.summaryTh.includes("風雷益"));
  // ก่อนลี่ชุน → ปีก่อน (2026-01-20 ยังเป็นปีมะเส็ง 巳=6)
  assert.equal(meihuaLostReading("2026-01-20", "08:00")!.numbers.year, 6);
  // เพี้ยน
  assert.equal(meihuaLostReading("2026-02-30", "08:00"), null);
  assert.equal(meihuaLostReading("2026-09-08", ""), null);
  assert.equal(meihuaLostReading("abc", "08:00"), null);
});

test("🔴 ถ้อยคำ — ทุก omen/caveat ห้ามฟันธง/ห้ามบอกเลิกค้น/ห้าม 'หาไม่ได้' · ทุก omen มีทางปฏิบัติ", () => {
  const banned = /หาไม่ได้|ไม่มีทางเจอ|เลิกค้น|ไม่ต้องค้น|ตายแล้ว|แน่นอนว่าอยู่|อยู่ที่นั่นแน่|不可尋/;
  for (const o of Object.values(OMEN_TH)) {
    for (const s of [o.labelTh, o.adviceTh, o.zh]) assert.ok(!banned.test(s), s);
    assert.ok(o.adviceTh.length >= 30, "ต้องมีทางปฏิบัติ ไม่ใช่แค่ป้าย");
  }
  assert.ok(!banned.test(MEIHUA_CAVEAT));
  assert.ok(MEIHUA_CAVEAT.includes("ไม่ได้เข้าสูตรจัดลำดับ") && MEIHUA_CAVEAT.includes("ลี่ชุน"));
  const r = meihuaLostReading("2026-09-08", "19:30")!;
  assert.ok(!banned.test(r.summaryTh) && !banned.test(r.omen.adviceTh));
});
