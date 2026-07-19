// เทสต์ตรรกะเลือกแคช AI-1 (lib/dream/discovery-cache.ts)
// เทสต์เฉพาะส่วน pure — ส่วนที่ต่อ Supabase ทดสอบด้วยการยิง route จริง
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBestMatch, thaiBaseLength, type CachedDiscovery } from "../lib/dream/discovery-cache";

const row = (dream_object: string, extra: Partial<CachedDiscovery> = {}): CachedDiscovery => ({
  dream_object,
  element: "น้ำ",
  reviewed: false,
  ...extra,
});

test("ไม่มีแถวไหนอยู่ในข้อความฝัน → null (ต้องไปเรียก AI-1 จริง)", () => {
  assert.equal(pickBestMatch("ฝันว่าเห็นภูเขาไฟ", [row("โดรน"), row("รถไฟฟ้า")]), null);
});

test("เจอสัญลักษณ์ที่เคยค้นแล้ว → คืนแถวนั้น", () => {
  const hit = pickBestMatch("ฝันว่ามีโดรนบินอยู่เหนือบ้าน", [row("โดรน")]);
  assert.equal(hit?.dream_object, "โดรน");
});

test("match ได้หลายคำ → เลือกคำที่ยาวที่สุด (เจาะจงกว่า)", () => {
  const hit = pickBestMatch("ฝันว่านั่งรถไฟฟ้าใต้ดิน", [row("รถไฟฟ้า"), row("รถไฟฟ้าใต้ดิน")]);
  assert.equal(hit?.dream_object, "รถไฟฟ้าใต้ดิน");
});

test("คำสั้นกว่า 3 ตัวอักษรไม่ใช้เป็นกุญแจแคช (ลดโอกาส over-match)", () => {
  // "ข้า" โผล่กลาง "เข้ามา" ได้ — ถ้าไม่กันจะคืนสัญลักษณ์ผิด
  assert.equal(pickBestMatch("ฝันว่างูเลื้อยเข้ามาในบ้าน", [row("ข้า")]), null);
});

test("นับความยาวคำไทยโดยไม่รวมวรรณยุกต์/สระบน-ล่าง (.length ใช้ไม่ได้)", () => {
  assert.equal(thaiBaseLength("ข้า"), 2); // .length = 3
  assert.equal(thaiBaseLength("โดรน"), 4);
  assert.equal(thaiBaseLength("น้ำ"), 2); // .length = 4
});

test("ช่องว่างหัวท้ายไม่ทำให้พลาด", () => {
  const hit = pickBestMatch("ฝันเห็นโดรนสีดำ", [row("  โดรน  ")]);
  assert.equal(hit?.dream_object.trim(), "โดรน");
});

test("แถวที่รีวิวแล้วก็ใช้เป็นแคชได้ และติดธง reviewed มาด้วย", () => {
  const hit = pickBestMatch("ฝันว่าเห็นโดรน", [row("โดรน", { reviewed: true })]);
  assert.equal(hit?.reviewed, true);
});
