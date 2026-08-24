// เทสต์ยุคชีวิต Vimshottari (รอบ 2 แผน Jyotish — 24 ส.ค. 2569) — ล็อกกฎจากงานวิจัย
import { test } from "node:test";
import assert from "node:assert";
import {
  MD_THEME_TH, maitriView, HARMONY_TH, lifeDasha, LIFE_DASHA_CAVEAT, SANDHI_CAVEAT,
} from "../lib/engine/life-dasha";
import { moonEclipticLongitude } from "../lib/engine/daily";
import { lahiriAyanamsa } from "../lib/engine/ascendant";

test("ธีมมหาทศาครบ 9 ดาว + ไม่มีคำต้องห้าม (กรอบห้าม maraka — เทสต์ล็อกทุก string)", () => {
  assert.equal(Object.keys(MD_THEME_TH).length, 9);
  const banned = /ตาย|มรณ|อายุขัย|โรคร้าย|เสียชีวิต|วินาศ|หายนะ/;
  const all = [
    ...Object.values(MD_THEME_TH).flatMap((t) => [t.areasTh, t.upTh, t.careTh]),
    ...Object.values(HARMONY_TH),
    LIFE_DASHA_CAVEAT, SANDHI_CAVEAT,
  ];
  for (const s of all) assert.ok(!banned.test(s), `พบคำต้องห้าม: ${s.slice(0, 40)}`);
  // เสาร์/ราหูต้องมีด้านโอกาส (anti-doom framing)
  assert.ok(MD_THEME_TH.saturn.upTh.includes("ความเพียร") || MD_THEME_TH.saturn.upTh.length > 20);
  assert.ok(MD_THEME_TH.saturn.careTh.includes("ไม่ปฏิเสธ"), "เสาร์เฟรม 'ให้ช้าแต่ไม่ปฏิเสธ'");
});

test("Naisargika Maitri — ทิศทางไม่สมมาตรตามตาราง BPHS (จันทร์มองพุธ=มิตร แต่พุธมองจันทร์=ศัตรู)", () => {
  assert.equal(maitriView("moon", "mercury"), "friend");
  assert.equal(maitriView("mercury", "moon"), "enemy");
  assert.equal(maitriView("sun", "venus"), "enemy");
  assert.equal(maitriView("venus", "saturn"), "friend");
  assert.equal(maitriView("saturn", "mars"), "enemy");
  assert.equal(maitriView("jupiter", "saturn"), "neutral");
  assert.equal(maitriView("rahu", "jupiter"), "friend", "แถวราหู = ธรรมเนียมยุคหลัง (มี caveat)");
  assert.equal(maitriView("mars", "mars"), "self");
});

test("lifeDasha — ดวงจริง 7 ต.ค. 2529 (จันทร์วิศาขา): ยุคเกตุ/ช่วงย่อยจันทร์ ณ ส.ค. 2569 ตรงกับ E2E เนื้อคู่", () => {
  const birthUtcMs = Date.UTC(1986, 9, 6, 23, 28);
  const jd = birthUtcMs / 86400000 + 2440587.5;
  const moonLon = (((moonEclipticLongitude(jd) - lahiriAyanamsa(jd)) % 360) + 360) % 360;
  const ld = lifeDasha(moonLon, birthUtcMs, Date.UTC(2026, 7, 24))!;
  assert.equal(ld.nakshatraTh, "วิศาขา");
  assert.equal(ld.current.lordTh, "เกตุ");
  assert.equal(ld.sub.lordTh, "จันทร์");
  assert.ok(ld.current.progressPct >= 0 && ld.current.progressPct <= 100);
  assert.equal(ld.next.lordTh, "ศุกร์", "ยุคถัดจากเกตุ = ศุกร์ (ลำดับ Vimshottari)");
  assert.equal(ld.sub.harmony, maitriView("ketu", "moon"));
  assert.ok(ld.caveats.includes(LIFE_DASHA_CAVEAT), "caveat บังคับ");
  // อายุเกินรอบ 120 ปี → null ไม่เดา
  assert.equal(lifeDasha(moonLon, birthUtcMs, Date.UTC(2150, 0, 1)), null);
});

test("รอยต่อยุค (sandhi) — อันตรสุดท้าย/แรกติดธง + SANDHI_CAVEAT เฉพาะตอนอยู่ในรอยต่อ", () => {
  // จันทร์กลางอัศวินี → เกตุเหลือ 3.5 ปีจากเกิด — ช่วงท้ายยุคเกตุ = อันตรสุดท้าย
  const birth = Date.UTC(1990, 0, 1);
  const nearEnd = lifeDasha(360 / 27 / 2, birth, birth + 3.4 * 365.25 * 86400000)!;
  assert.ok(nearEnd.inSandhi, "ปลายยุค = รอยต่อ");
  assert.ok(nearEnd.caveats.includes(SANDHI_CAVEAT));
  // ต้นยุคศุกร์ (ยุคที่ 2) = อันตรแรกของยุคใหม่ → รอยต่อเช่นกัน
  const justAfter = lifeDasha(360 / 27 / 2, birth, birth + 3.6 * 365.25 * 86400000)!;
  assert.equal(justAfter.current.lordTh, "ศุกร์");
  assert.ok(justAfter.inSandhi);
  // กลางยุคศุกร์ = ไม่ใช่รอยต่อ
  const mid = lifeDasha(360 / 27 / 2, birth, birth + 13 * 365.25 * 86400000)!;
  assert.equal(mid.current.lordTh, "ศุกร์");
  assert.ok(!mid.inSandhi);
  assert.ok(!mid.caveats.includes(SANDHI_CAVEAT));
});
