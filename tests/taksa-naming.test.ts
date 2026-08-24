// เทสต์ทักษาปกรณ์ (รอบ 4 แผน Jyotish — 24 ส.ค. 2569) — ล็อกตาราง+กฎหมุนจากงานวิจัย
import { test } from "node:test";
import assert from "node:assert";
import {
  TAKSA_LETTERS, taksaDayPlanet, taksaChart, analyzeNameTaksa, TAKSA_CAVEAT, BHUMI_TH,
} from "../lib/engine/taksa-naming";

test("กาลกิณีทั้ง 8 วัน — ตรงลิสต์อิสระของ Sanook ครบ 8/8 (validation ไขว้จากงานวิจัย)", () => {
  const expect: [string, string | null, string][] = [
    ["อาทิตย์", null, "ศษสหฬฮ"],
    ["จันทร์", null, "อะาำิีึืุูเแโใไฤ"],
    ["อังคาร", null, "กขคฆง"],
    ["พุธ", null, "จฉชซฌญ"],       // พุธกลางวัน
    ["พฤหัสบดี", null, "ดตถทธน"],
    ["ศุกร์", null, "ยรลว"],
    ["เสาร์", null, "ฎฏฐฑฒณ"],
    ["พุธ", "20:00", "บปผฝพฟภม"],  // พุธกลางคืน = ราหู
  ];
  for (const [day, time, letters] of expect) {
    const dp = taksaDayPlanet(day, time)!;
    const chart = taksaChart(dp);
    assert.equal(TAKSA_LETTERS[chart.กาลกิณี], letters, `กาลกิณีวัน${day}${time ? " กลางคืน" : ""}`);
  }
});

test("กฎหมุน — บริวาร = วรรคดาววันเกิดเอง · ครบ 8 ภูมิไม่ซ้ำดาว", () => {
  const chart = taksaChart("mars"); // อังคาร
  assert.equal(chart.บริวาร, "mars");
  assert.equal(chart.อายุ, "mercury");
  assert.equal(chart.เดช, "saturn"); // อังคาร→พุธ→เสาร์ ตามวงมหาทักษา
  assert.equal(new Set(Object.values(chart)).size, 8, "8 ภูมิ = 8 ดาวไม่ซ้ำ");
  assert.equal(BHUMI_TH.length, 8);
});

test("วิเคราะห์ชื่อ — กาลกิณีตรวจเจอจริง + ธรรมเนียมที่เลือก (ั ์ ไม่นับ)", () => {
  // คนเกิดอังคาร กาลกิณี = ก ข ค ฆ ง → "กมล" มี ก
  const r = analyzeNameTaksa("กมล", "อังคาร")!;
  assert.deepEqual(r.kalakiniChars, ["ก"]);
  assert.ok(r.verdictTh.includes("วรรคห้ามใช้"));
  // คนเกิดอาทิตย์ กาลกิณี = ศ ษ ส... → "สมชาย" มี ส
  const r2 = analyzeNameTaksa("สมชาย", "อาทิตย์")!;
  assert.deepEqual(r2.kalakiniChars, ["ส"]);
  // "สมชาย" กับคนเกิดพฤหัส (กาลกิณี ด ต ถ ท ธ น) → ผ่าน
  const r3 = analyzeNameTaksa("สมชาย", "พฤหัสบดี")!;
  assert.equal(r3.kalakiniChars.length, 0);
  assert.ok(r3.verdictTh.includes("ไม่มีอักษรกาลกิณี"));
  // ั และ ์ ไม่ถูกนับ (ธรรมเนียมที่เลือก): "วัฒน์" — ั ์ หาย เหลือ ว ฒ น
  const r4 = analyzeNameTaksa("วัฒน์", "อาทิตย์")!;
  const counted = r4.breakdown.flatMap((b) => b.chars).sort().join("");
  assert.equal(counted, ["ว", "ฒ", "น"].sort().join(""), "ั และ ์ ต้องไม่ถูกนับ เหลือ ว ฒ น");
  assert.ok(r4.caveats.includes(TAKSA_CAVEAT));
});

test("สระนับกลุ่มอาทิตย์ + อักษรนำ + คำแนะนำเพศ (ชายเดช/หญิงศรี — ความนิยมไม่ใช่ข้อห้าม)", () => {
  // คนเกิดจันทร์: กาลกิณี = อ+สระ → "อารีย์" โดนสระ
  const r = analyzeNameTaksa("อารี", "จันทร์")!;
  assert.ok(r.kalakiniChars.length >= 2, "อ และ า ตกกาลกิณีของคนเกิดจันทร์");
  // เพศชาย: อักษรนำควรภูมิเดช — ให้คำแนะนำเสมอเมื่อระบุเพศ
  const r2 = analyzeNameTaksa("สมชาย", "พฤหัสบดี", { gender: "male" })!;
  assert.ok(r2.leadAdviceTh && r2.leadAdviceTh.includes("เดช"));
  assert.ok(r2.suggestLetters.some((sug) => sug.bhumi === "เดช" && sug.letters.length > 0));
  // ไม่ระบุเพศ → ไม่มีคำแนะนำนำชื่อ (ไม่เดา)
  assert.equal(analyzeNameTaksa("สมชาย", "พฤหัสบดี")!.leadAdviceTh, null);
  // วันไม่รู้จัก → null ไม่เดา
  assert.equal(analyzeNameTaksa("สมชาย", "วันแปลก"), null);
});
