// แกนเรื่องของฝัน (10 ก.ย. 2569) — ผู้ใช้รายงาน "คำทำนายหลุดประเด็น" → ตรวจพบว่า engine ส่งบริบทผิดน้ำหนัก
// เทสต์นี้ล็อกกติกาใหม่: เรียงตามที่เล่า · ตัดคำซ้อน · กริยาทั่วไปท้ายสุด · ธีมในวงเล็บไม่จับมั่ว
import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretDream, PRODUCTION_DREAM_DB } from "../lib/engine/dream";
import { findSymbolMatchesSegmented, findThemeMatchesSegmented, themeVariants, coreSymbols } from "../lib/engine/dream-match";
import dreamPsych from "../data/dream_psychology_50.json";

const objs = (d: string) => findSymbolMatchesSegmented(d, PRODUCTION_DREAM_DB)!.map((m) => m.dream_object);
const themes = (d: string) => findThemeMatchesSegmented(d, dreamPsych as Parameters<typeof findThemeMatchesSegmented>[1])!.map((t) => t.dream_theme);

test("แกนเรื่องเรียงตามที่เล่า: แม่มาก่อนบ้าน/ประตู · 'ยิ้มให้' ไม่ใช่การบริจาค · กริยาประกอบอยู่ท้าย", () => {
  const d = "ฝันว่าแม่ที่เสียไปแล้วมาหาที่บ้าน ยิ้มให้แล้วเดินออกไปทางประตูหลัง ฉันวิ่งตามแต่ตามไม่ทัน";
  const got = objs(d);
  assert.equal(got[0], "แม่ / มารดา");
  assert.ok(got.indexOf("บ้าน / ที่อยู่อาศัย") < got.indexOf("ประตู / หน้าต่าง"));
  assert.ok(!got.includes("ให้ / บริจาค"), "ยิ้มให้ = คำเชื่อม ไม่ใช่สัญลักษณ์ให้");
  // กริยาทั่วไป (เดิน/ยิ้ม) ต้องอยู่ท้ายสุด — หลังทั้งคำนามและกริยาสำคัญ (วิ่ง/ไม่ทัน)
  const lastMain = Math.max(got.indexOf("ประตู / หน้าต่าง"), got.indexOf("วิ่ง / วิ่งหนี"), got.indexOf("มาสาย / ไม่ทัน"));
  for (const verb of ["เดิน", "ยิ้ม"]) assert.ok(got.indexOf(verb) > lastMain, `${verb} ต้องอยู่ท้าย`);
  const r = interpretDream(d, "จันทร์", false, true);
  assert.deepEqual(r.core_symbols, ["แม่ / มารดา", "บ้าน / ที่อยู่อาศัย"]);
  // เส้น parity กับ Python ต้องไม่มีฟิลด์นี้
  assert.equal(interpretDream(d, "จันทร์").core_symbols, undefined);
});

test("คำซ้อนในคำยาวกว่าถูกตัด: 'แฟนเก่า' ไม่ใช่คนรักปัจจุบัน · แม่น้ำสองแถวเหลือตัวเดียว", () => {
  const a = objs("ฝันว่าแฟนเก่ามาขอคืนดี ในงานแต่งงานของเพื่อน");
  assert.ok(a.includes("แฟนเก่า"));
  assert.ok(!a.includes("แฟน / คนรักปัจจุบัน"));
  const b = objs("ฝันว่ารถพุ่งลงไปในแม่น้ำ ฉันว่ายน้ำขึ้นฝั่งได้");
  assert.equal(b.filter((o) => o.startsWith("แม่น้ำ")).length, 1);
  // ของจริงที่ไม่ซ้อนกันยังจับได้ทั้งคู่
  const c = objs("ฝันว่าแฟนพาไปหาแฟนเก่า");
  assert.ok(c.includes("แฟนเก่า") && c.includes("แฟน / คนรักปัจจุบัน"));
});

test("กริยาทั่วไป (เดิน/ยิ้ม/กิน) ไม่เกิน 2 และไม่เป็นแกนเรื่อง · ไม่มีคำนาม → กริยาสำคัญเป็นแกน", () => {
  const got = objs("ฝันว่าเดินไปกินข้าว ยิ้มให้เพื่อน แล้วนั่งหัวเราะกับแมว ดื่มน้ำ");
  const low = got.filter((o) => ["เดิน", "ยิ้ม", "หัวเราะ", "กิน / ทานอาหาร", "ดื่มน้ำ", "นั่ง / นั่งสมาธิ"].includes(o));
  assert.ok(low.length <= 2, `กริยาทั่วไปเกิน: ${low.join(",")}`);
  assert.equal(got[0], "เพื่อน / มิตรสหาย");
  assert.deepEqual(coreSymbols(findSymbolMatchesSegmented("ฝันว่าถูกไล่ล่า", PRODUCTION_DREAM_DB)!), ["ถูกไล่ล่า / หนี"]);
  // แกนเรื่องตามที่เล่า ไม่ใช่คำนามอย่างเดียว: ฝันเรื่องสอบ แกนคือ "สอบ" ไม่ใช่ "บันได"
  const exam = interpretDream("ฝันว่าสอบไม่ทัน หาห้องสอบไม่เจอ วิ่งขึ้นบันไดวนไม่รู้จบ", "จันทร์", false, true);
  assert.deepEqual(exam.core_symbols, ["สอบ / สอบไล่", "มาสาย / ไม่ทัน"]);
});

test("ธีมในวงเล็บ: 'ลง' จาก 'ลิฟต์ (ขึ้น/ลง/ติด)' ห้ามจับ 'พุ่งลงแม่น้ำ' · 'ผีอำ' ยังจับได้ · reverse-check เฉพาะข้อความสั้น", () => {
  assert.deepEqual(themeVariants("ลิฟต์ (ขึ้น/ลง/ติด)"), ["ลิฟต์"]);
  assert.deepEqual(themeVariants("ขยับตัวไม่ได้ (ผีอำ)"), ["ขยับตัวไม่ได้", "ผีอำ"]);
  assert.ok(!themeVariants("การฆ่าคน (ในฝัน)").includes("ในฝัน"));
  assert.ok(!themes("ฝันว่ารถเบรกไม่อยู่ พุ่งลงไปในแม่น้ำ").some((t) => t.startsWith("ลิฟต์")));
  assert.ok(themes("ฝันว่าโดนผีอำ ขยับตัวไม่ได้").some((t) => t.startsWith("ขยับตัวไม่ได้")));
  assert.ok(themes("ผีอำ").some((t) => t.startsWith("ขยับตัวไม่ได้")), "ข้อความสั้นยังเทียบกลับได้");
  assert.ok(!themes("ฝันว่าไปติดต่อราชการ แล้วขึ้นรถกลับบ้าน").some((t) => t.startsWith("ลิฟต์")));
});
