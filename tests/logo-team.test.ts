// เทสต์คะแนนสไตล์โลโก้แบบทีม + ทิศสำนักงาน (22 ส.ค. 2569)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  teamMemberFromBirthDate,
  scoreStylesForTeam,
  directionOwnerAdvice,
  OFFICE_DIRECTIONS,
  OFFICE_DIRECTION_HELP,
  MAX_TEAM_MEMBERS,
  LOGO_STYLES,
} from "../lib/engine/logo-team";
import { wuXingScore } from "../lib/engine/element";
import { nameElement } from "../lib/engine/naming";
import { DIRECTION_TO_ELEMENT } from "../lib/engine/fengshui";

test("teamMemberFromBirthDate — สูตรคนจริง · พ.ศ./รูปแบบผิด = null", () => {
  const m = teamMemberFromBirthDate("เจ้าของ", "1986-10-07");
  assert.ok(m && ["Fire", "Earth", "Wood", "Water"].includes(m.dominant));
  assert.equal(teamMemberFromBirthDate("x", "2530-01-01"), null);
  assert.equal(teamMemberFromBirthDate("x", "07/10/1986"), null);
  assert.equal(MAX_TEAM_MEMBERS, 5);
});

test("scoreStylesForTeam — คนเดียว: คะแนนตรง wuXingScore ตัวจริงทุกสไตล์ (พฤติกรรมหน้าเดิม)", () => {
  const m = teamMemberFromBirthDate("เจ้าของ", "1986-10-07")!;
  const r = scoreStylesForTeam({ members: [m] });
  assert.equal(r.fits.length, 5);
  for (const f of r.fits) {
    const expect = wuXingScore(m.dominant, f.style, [...m.missing]).final_score;
    assert.equal(f.members[0].score, expect);
    assert.equal(f.teamMin, expect);
    assert.equal(f.brandScore, null);
    assert.equal(f.directionScore, null);
  }
  // แนะนำ = สไตล์ teamMin สูงสุด
  const best = Math.max(...r.fits.map((f) => f.teamMin!));
  assert.equal(r.fits.find((f) => f.style === r.recommended)!.teamMin, best);
});

test("scoreStylesForTeam — ทีม 2 คน: teamMin = ค่าต่ำสุดจริง + caveat สูตรทีมติดมา", () => {
  const a = teamMemberFromBirthDate("เจ้าของ", "1986-10-07")!;
  const b = teamMemberFromBirthDate("หุ้นส่วน 1", "1992-05-20")!;
  const r = scoreStylesForTeam({ members: [a, b] });
  for (const f of r.fits) {
    assert.equal(f.teamMin, Math.min(f.members[0].score, f.members[1].score));
  }
  assert.ok(r.caveats.some((c) => c.includes("ต่ำสุดของสมาชิก")));
});

test("scoreStylesForTeam — ธาตุชื่อแบรนด์ + ทิศ: คะแนนตรง engine + caveat ตารางชื่อ", () => {
  const r = scoreStylesForTeam({ members: [], brandName: "รุ่งเรือง", direction: "ตะวันตก" });
  const brandEl = nameElement("รุ่งเรือง")!;
  assert.equal(r.brandElement, brandEl);
  const dirEl = DIRECTION_TO_ELEMENT["ตะวันตก"];
  for (const f of r.fits) {
    assert.equal(f.brandScore, wuXingScore(brandEl, f.style, []).final_score);
    assert.equal(f.directionScore, wuXingScore(f.style, dirEl, []).final_score);
  }
  assert.ok(r.caveats.some((c) => c.includes("ตารางกลุ่มอักษร")));
  assert.ok(r.recommended !== null);
  // ไม่มีข้อมูลเลย = ไม่เดาคำแนะนำ
  assert.equal(scoreStylesForTeam({ members: [] }).recommended, null);
});

test("directionOwnerAdvice — พิฆาตแนะสีสะพาน · ธาตุที่ขาดพลิกเป็นยา", () => {
  // เจ้าของไฟ (ไม่ขาดทอง) + ตะวันตก (ทอง): ไฟพิฆาตทอง → สะพานคือดิน
  const advice = directionOwnerAdvice("Fire", ["Water"], "ตะวันตก");
  assert.ok(advice.includes("พิฆาต") && advice.includes("ดิน"), advice);
  // เจ้าของไฟ ขาดน้ำ + เหนือ (น้ำ): Productive Clash — ต้องไม่ใช่คำเตือน
  const clash = directionOwnerAdvice("Fire", ["Water"], "เหนือ");
  assert.ok(!clash.includes("แนะนำแทรกสี"), clash);
});

test("ทิศ 8 ตัว (ไม่มี 'กลาง') + วิธีดูทิศครบเครื่องมือจริง", () => {
  assert.equal(OFFICE_DIRECTIONS.length, 8);
  assert.ok(!OFFICE_DIRECTIONS.includes("กลาง" as never));
  const help = OFFICE_DIRECTION_HELP.join("\n");
  assert.ok(help.includes("เข็มทิศ") && help.includes("Google Maps") && help.includes("ประตู"));
  assert.equal(LOGO_STYLES.length, 5);
});

// ---- prompt ภายนอก (23 ส.ค. 2569 — feedback ผู้ใช้: ตัวภายในเรียบเกิน/สีเดียว/ห้ามตัวอักษร) ----
import { logoExternalPrompt, logoImagePrompt } from "../lib/engine/naming";

test("logoExternalPrompt — มีชื่อแบรนด์เป็นตัวอักษร + หลายสี + ไม่แบน · ตัวภายในยัง no-text เหมือนเดิม", () => {
  const ext = logoExternalPrompt("Fire", "รุ่งเรืองกาแฟ", "มีรูปแก้วกาแฟ");
  assert.ok(ext.includes('brand name "รุ่งเรืองกาแฟ"'), "ต้องสั่งใส่ชื่อแบรนด์ในภาพ");
  assert.ok(/typography/i.test(ext), "ต้องมีคำสั่งตัวอักษร");
  assert.ok(!/no text|no letters/i.test(ext), "เวอร์ชันภายนอกห้ามแบนตัวอักษร");
  assert.ok(/accents/i.test(ext), "ต้องเป็นพาเลตหลายสี (มีสีเน้น)");
  assert.ok(/not flat|layered|depth/i.test(ext), "ต้องกันดีไซน์เรียบเกิน");
  assert.ok(ext.includes("มีรูปแก้วกาแฟ"), "extra requirements ต้องติดไป");
  // ตัวภายใน (fal pipeline) ต้องไม่เปลี่ยน — no-text เพื่อ font-overlay ไทยสะกดถูก
  const internal = logoImagePrompt("Fire", "รุ่งเรืองกาแฟ");
  assert.ok(/no text/i.test(internal) && /minimalist/i.test(internal));
  // ทุกธาตุมีพาเลตของตัวเอง (fallback ไม่พัง)
  for (const el of ["Wood", "Fire", "Earth", "Metal", "Water", "Unknown"]) {
    assert.ok(logoExternalPrompt(el, "X").length > 100);
  }
});
