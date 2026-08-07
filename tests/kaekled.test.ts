// ตำราแก้เคล็ดความฝัน (Unified_Kaekled_DB) — เปิดใช้ครั้งแรกในเฟส 2 (7 ส.ค. 2569)
import test from "node:test";
import assert from "node:assert/strict";
import {
  KAEKLED_ROWS,
  KAEKLED_CAVEAT,
  bridgingElement,
  findKaekledRow,
  kaekledFor,
  kaekledForSymbols,
} from "../lib/engine/kaekled";

test("🔴 กฎธาตุเชื่อม = ธาตุที่สัญลักษณ์ให้กำเนิด — ตรงกับตำราทั้ง 8 แถว", () => {
  assert.equal(KAEKLED_ROWS.length, 8);
  for (const row of KAEKLED_ROWS) {
    assert.equal(
      bridgingElement(row.elements[0]),
      row.bridging_element,
      `${row.object}: ธาตุ ${row.elements[0]} ควรเชื่อมด้วย ${bridgingElement(row.elements[0])}`
    );
  }
  // วงจรกำเนิดครบวง (กันแก้ตารางแล้วหลุด)
  assert.equal(bridgingElement("Water"), "Wood");
  assert.equal(bridgingElement("Metal"), "Water");
});

test("สัญลักษณ์ในตำราคืนแนวทางครบ 3 ศาสตร์ + บทสวด (คัดตรง ไม่แต่งเพิ่ม)", () => {
  const g = kaekledFor("งู / พญานาค", "ไฟ")!;
  assert.equal(g.source, "ตำราแก้เคล็ด");
  assert.equal(g.ธาตุเชื่อม, "ดิน"); // ไฟให้กำเนิดดิน
  assert.ok(g.แนวทางไทย?.includes("ปลาไหล"), "แนวทางไทยต้องเป็นข้อความจากตำราจริง");
  assert.ok(g.แนวทางจีน && g.แนวทางฮินดู);
  assert.ok(g.บทสวด?.ชื่อ.includes("วิรูปักเข"));
  assert.ok(g.สีเสริมธาตุเชื่อม.length > 0);
  // เทียบชื่อข้ามฐานได้ (ฐานความฝันเขียน "ฟันหัก / ฟันหลุด" ตำราเขียน "ฟันหัก")
  assert.equal(findKaekledRow("ฟันหัก / ฟันหลุด")?.object, "ฟันหัก");
  assert.equal(findKaekledRow("คนตาย / ศพ")?.object, "ศพ / คนตาย");
});

test("สัญลักษณ์นอกตำรา → อนุมานด้วยกฎธาตุเดียวกัน และ **ประกาศที่มาต่างกัน**", () => {
  const g = kaekledFor("แมงมุม", "ไม้")!;
  assert.equal(g.source, "หลักธาตุ");
  assert.equal(g.ธาตุเชื่อม, "ไฟ"); // ไม้ให้กำเนิดไฟ
  assert.equal(g.แนวทางไทย, undefined, "ห้ามแต่งวิธีแก้เคล็ดให้สัญลักษณ์ที่ตำราไม่มี");
  assert.ok(g.กิจกรรมเปลี่ยนพลัง.length > 0);
  // "ลม" ของฐานความฝัน = ไม้ในระบบ 5 ธาตุ
  assert.equal(kaekledFor("ปีก", "ลม")?.ธาตุเชื่อม, "ไฟ");
  assert.equal(kaekledFor("อะไรก็ไม่รู้", "ไม่มีธาตุ"), null);
});

test("รวมหลายสัญลักษณ์: ตำรามาก่อนหลักธาตุ · ไม่ซ้ำ · จำกัด 3 · caveat ติดเสมอ", () => {
  const r = kaekledForSymbols([
    { dream_object: "แมงมุม", element: "ไม้" },
    { dream_object: "งู / พญานาค", element: "ไฟ" },
    { dream_object: "แมงมุม", element: "ไม้" },
    { dream_object: "เลือด", element: "น้ำ" },
    { dream_object: "มด", element: "ดิน" },
  ]);
  assert.equal(r.รายการ.length, 3);
  assert.deepEqual(r.รายการ.slice(0, 2).map((x) => x.source), ["ตำราแก้เคล็ด", "ตำราแก้เคล็ด"]);
  assert.equal(r.หมายเหตุ, KAEKLED_CAVEAT);
  assert.ok(/ไม่ใช่คำรับประกันผล/.test(KAEKLED_CAVEAT), "ต้องบอกตรงๆ ว่าไม่รับประกันผล");
});

test("หน้า SEO ทำนายฝัน: ดัชนีครบ ไม่ซ้ำ + ข้อความความสัมพันธ์รายวันเป็นมุม 'วัน ↔ สัญลักษณ์'", async () => {
  const { dreamSeoEntries, dreamSeoEntry, dayRelationText } = await import("../lib/dream/seo");
  const all = dreamSeoEntries();
  assert.ok(all.length > 350, `ควรมีสัญลักษณ์หลายร้อย ได้ ${all.length}`);
  assert.equal(new Set(all.map((e) => e.slug)).size, all.length, "slug ต้องไม่ซ้ำ");
  // งู มาจากตำราแก้เคล็ด (ฐาน 457 ไม่มี) — ต้องมีหน้าและมีแนวทางจากตำรา
  const snake = dreamSeoEntry("งู")!;
  assert.equal(snake.kangxiStrokes, 11);
  assert.equal(snake.remedy?.source, "ตำราแก้เคล็ด");
  // ข้อความรายวันต้องไม่ยืมสำนวนจากบริบท "ผู้ใช้ ↔ สิ่งของ" (เคยหลุดมาแล้วตอนทำหน้านี้)
  const texts = (["Fire", "Earth", "Metal", "Water", "Wood"] as const).map((d) => dayRelationText(d, "Fire"));
  assert.ok(texts.every((t) => !t.includes("เรา")), "ห้ามมีคำว่า 'เรา' — หน้านี้เทียบวันกับสัญลักษณ์");
  assert.equal(dayRelationText("Fire", "Fire"), "ธาตุตรงกัน — พลังของสัญลักษณ์นี้เข้มข้นเป็นพิเศษ");
  assert.equal(new Set(texts).size, 5, "ทั้ง 5 ความสัมพันธ์ต้องให้ข้อความต่างกัน");
});
