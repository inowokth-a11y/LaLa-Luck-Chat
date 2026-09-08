// เทสต์ดูดวงแมว — ตำราแมวศุภลักษณ์ 17 ชนิด + ชั้นธาตุ (6 ก.ย. 2569)
import { test } from "node:test";
import assert from "node:assert";
import {
  CAT_TAMRA,
  CAT_COATS,
  CAT_MARKS,
  CAT_EYES,
  CAT_TAMRA_CAVEAT,
  matchCatTamra,
  catElementFromCoat,
  catReading,
} from "../lib/engine/cat-tamra";
import { COLOR_TO_ELEMENT } from "../lib/engine/fengshui";
import { wuXingScore } from "../lib/engine/element";

test("ตาราง — 17 ชนิดในสมุดข่อย + ขาวมณีป้ายนอกตำรา · ทุกชนิดมีลักษณะ/คุณ · key ไม่ซ้ำ", () => {
  const inTamra = CAT_TAMRA.filter((b) => b.inTamra);
  assert.equal(inTamra.length, 17, "แมวมงคลในสมุดข่อยต้อง 17 ชนิด");
  const outside = CAT_TAMRA.filter((b) => !b.inTamra).map((b) => b.nameTh);
  assert.deepEqual(outside, ["ขาวมณี"], "ขาวมณีคือชนิดเดียวที่นับรวมแบบมีป้าย");
  assert.equal(new Set(CAT_TAMRA.map((b) => b.key)).size, CAT_TAMRA.length);
  for (const b of CAT_TAMRA) {
    assert.ok(b.traitsTh.length > 10 && b.boonTh.length > 5, b.nameTh);
    assert.ok(b.match.coat in CAT_COATS, `coat ของ ${b.nameTh} ต้องอยู่ใน enum`);
    if (b.match.mark) assert.ok(b.match.mark in CAT_MARKS);
    if (b.expectedEye) assert.ok(b.expectedEye in CAT_EYES);
  }
  // ชนิดที่ยังเหลือในปัจจุบัน 6 ชนิด (lib.ru.ac.th) ต้องอยู่ครบ
  for (const n of ["วิเชียรมาศ", "ศุภลักษณ์", "สีสวาด", "โกญจา", "แซมเสวตร", "ขาวมณี"]) {
    assert.ok(CAT_TAMRA.some((b) => b.nameTh === n), n);
  }
});

test("จับคู่ — ตัวอย่างชนิดหลักตรงตำรา · แยกกลุ่มดำ-ขาวด้วยแต้ม · ดำล้วนแยกด้วยตา · นอกตำรา = null", () => {
  assert.equal(matchCatTamra("cream_points", null, "blue").breed?.nameTh, "วิเชียรมาศ");
  assert.equal(matchCatTamra("copper_brown").breed?.nameTh, "ศุภลักษณ์");
  assert.equal(matchCatTamra("gray_silver").breed?.nameTh, "สีสวาด");
  assert.equal(matchCatTamra("white_solid").breed?.nameTh, "ขาวมณี");
  assert.equal(matchCatTamra("black_white_marks", "white_collar").breed?.nameTh, "นิลจักร");
  assert.equal(matchCatTamra("black_white_marks", "white_collar_mouth").breed?.nameTh, "สิงหเสพย์");
  assert.equal(matchCatTamra("black_white_marks", "white_paws4").breed?.nameTh, "จตุบท");
  assert.equal(matchCatTamra("white_black_marks", "nine_black_spots").breed?.nameTh, "เก้าแต้ม");
  assert.equal(matchCatTamra("white_black_marks", "black_eye_rings").breed?.nameTh, "กรอบแว่น");
  assert.equal(matchCatTamra("black_solid", null, "dark").breed?.nameTh, "นิลรัตน์");
  assert.equal(matchCatTamra("black_solid", null, "green").breed?.nameTh, "โกญจา");
  assert.equal(matchCatTamra("black_solid").breed?.nameTh, "โกญจา", "ไม่รู้ตา = โกญจา (ชนิดที่รู้จักกว่า)");
  // ตาต่างจากตำรา → ยังจับคู่แต่มีโน้ต
  const m = matchCatTamra("cream_points", null, "green");
  assert.equal(m.breed?.nameTh, "วิเชียรมาศ");
  assert.ok(m.eyeNoteTh?.includes("ใกล้เคียง"));
  // นอกตำรา + injection
  assert.equal(matchCatTamra("orange").breed, null);
  assert.equal(matchCatTamra("tabby").breed, null);
  assert.equal(matchCatTamra("<script>", "hack", "x").breed, null);
});

test("ชั้นธาตุจากสี — ตรงตาราง COLOR_TO_ELEMENT · หลายสี = null", () => {
  assert.equal(catElementFromCoat("black_solid")?.element, COLOR_TO_ELEMENT["ดำ"]);
  assert.equal(catElementFromCoat("white_solid")?.element, COLOR_TO_ELEMENT["ขาว"]);
  assert.equal(catElementFromCoat("orange")?.element, "Fire");
  assert.equal(catElementFromCoat("gray_silver")?.element, "Metal");
  assert.equal(catElementFromCoat("calico"), null);
  assert.equal(catElementFromCoat("nonsense"), null);
});

test("catReading — เคมีเจ้าของตรง wuXingScore · Productive Clash · ธาตุสะพานเมื่อพิฆาต · caveat ครบ", () => {
  // เจ้าของไฟ ขาดน้ำ + แมวดำ (น้ำ) → clash พลิกเป็นยา +2
  const r = catReading({ coat: "black_solid", eye: "green", owner: { dominant: "Fire", missing: ["Water"] } });
  assert.equal(r.titleTh.startsWith("โกญจา"), true);
  assert.equal(r.chemistry?.final_score, wuXingScore("Fire", "Water", ["Water"]).final_score);
  assert.ok(r.chemistry!.final_score > 0);
  assert.ok(r.colorTipTh?.includes("เสริมธาตุน้ำ"));
  // เจ้าของไฟ ไม่ขาดน้ำ + แมวดำ → พิฆาต → สีธาตุสะพาน (ไม้: น้ำให้กำเนิดไม้ ไม้ให้กำเนิดไฟ)
  const r2 = catReading({ coat: "black_solid", owner: { dominant: "Fire", missing: [] } });
  assert.ok(r2.chemistry!.final_score < 0);
  assert.ok(r2.colorTipTh?.includes("ธาตุสะพาน"));
  // ไม่มีเจ้าของ → ไม่มีเคมี แต่ยังอ่านตำรา + ธาตุได้
  const r3 = catReading({ coat: "cream_points", eye: "blue" });
  assert.equal(r3.chemistry, null);
  assert.equal(r3.element?.elementTh, "ดิน");
  assert.ok(r3.inTamra);
  assert.deepEqual(r3.caveats.slice(0, 1), [CAT_TAMRA_CAVEAT]);
  // ชื่อแมว → ชั้นเสริม
  const r4 = catReading({ coat: "orange", catName: "สมชาย", owner: { dominant: "Earth", missing: ["Water"] } });
  assert.ok(r4.nameLayer && r4.nameLayer.elementTh.length > 0);
  assert.equal(r4.match.breed, null);
  assert.ok(r4.titleTh.includes("แมวทั่วไป"));
});

test("🔴 ไม่มีคำตัดสินร้าย/สุขภาพสัตว์ ในทุก string ที่ผู้ใช้เห็น (ผู้ใช้เคาะ: เล่าเฉพาะด้านมงคล)", () => {
  const banned = /แมวร้าย|อัปมงคล|ให้โทษ|เสนียด|ไม่ควรเลี้ยง|ทิ้ง|โรค|ป่วย|รักษา/;
  const strings: string[] = [CAT_TAMRA_CAVEAT];
  for (const b of CAT_TAMRA) strings.push(b.traitsTh, b.boonTh, b.eyeTh);
  for (const c of Object.keys(CAT_COATS)) {
    for (const owner of [null, { dominant: "Fire" as const, missing: [] as ("Water")[] }]) {
      const r = catReading({ coat: c, owner });
      strings.push(r.titleTh, r.boonTh, r.traitsTh, r.colorTipTh ?? "");
    }
  }
  for (const s of strings) assert.ok(!banned.test(s), `พบคำต้องห้าม: ${s.slice(0, 60)}`);
});
