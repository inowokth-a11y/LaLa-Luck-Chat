// เทสต์ Preference Overlap (24 ส.ค. 2569) — ความชอบ = ข้อมูลผู้ใช้ ไม่ใช่คำทำนาย
import { test } from "node:test";
import assert from "node:assert";
import { preferenceOverlap, BODY_PREF, FACE_PREF, PERSONA_PREF, PREFERENCE_CAVEAT } from "../lib/engine/preference-match";
import { soulmateCollagePrompt } from "../lib/engine/soulmate";

const SRC = {
  // ดวงกันย์ 2529: คู่มีน (น้ำ) · เจ้าเรือน 7 = พฤหัส · ราหูในภพ 7 · DK จันทร์ · ผู้ใช้ไฟขาดน้ำ
  partnerElement: "Water" as const,
  seventhLord: "jupiter" as const,
  planetsIn7th: ["rahu" as const],
  darakaraka: "moon" as const,
  userDominant: "Fire" as const,
  userMissing: ["Water" as const],
};

test("เคสจริงของผู้ใช้: สเปกตรง 2-3 ชั้น + จุดต่างเฟรมร่างมีเคมี +2 (ไม้บำรุงไฟ)", () => {
  const r = preferenceOverlap({ body: "tall_lean", face: "long_defined", persona: ["calm_mature", "deep_charming"] }, SRC)!;
  assert.equal(r.total, 4);
  const by = Object.fromEntries(r.items.map((i) => [i.tagTh, i]));
  // ใจเย็นเป็นผู้ใหญ่ → พฤหัสเจ้าเรือน 7 ชี้ตรง
  assert.ok(by[PERSONA_PREF.calm_mature.th].matchedByTh.some((m) => m.includes("เจ้าเรือนภพ 7")));
  // เสน่ห์ลึกล้ำ → ราหูในภพ 7 ชี้ตรง
  assert.ok(by[PERSONA_PREF.deep_charming.th].matchedByTh.some((m) => m.includes("ดาวในภพ 7")));
  // สูงโปร่ง (ไม้) → จุดต่าง แต่เคมี +2 印
  const body = by[BODY_PREF.tall_lean.th];
  assert.equal(body.matchedByTh.length, 0, "ไม้ ≠ น้ำ = จุดต่าง");
  assert.ok(body.chemistryTh!.includes("+2"), "ไม้ให้กำเนิดไฟ = +2 ต้องโชว์");
  assert.ok(r.summaryTh.includes("ไม่ใช่ความขัดแย้ง"));
  assert.ok(r.caveats.includes(PREFERENCE_CAVEAT));
});

test("แท็กตรงธาตุคู่ = ตรงนรลักษณ์ ค.1 · ค่านอก enum ถูกเพิกเฉย · ไม่เลือกเลย = null", () => {
  const r = preferenceOverlap({ body: "soft_curvy" }, SRC)!;
  assert.ok(r.items[0].matchedByTh.some((m) => m.includes("ค.1")), "น้ำ = ธาตุคู่ → ตรง");
  const evil = preferenceOverlap({ body: "Kim Soo-hyun", face: "<script>", persona: ["hack"] }, SRC);
  assert.equal(evil, null, "ค่านอก enum ทั้งหมด = ไม่มีชั้นนี้");
  assert.equal(preferenceOverlap({}, SRC), null);
});

test("prompt ภาพ — เลือกความชอบ = แทนโครง ค.1 · ไม่เลือก = prompt เดิมเป๊ะ (backward compat)", () => {
  const plain = soulmateCollagePrompt({ gender: "female", element: "Water", look: "thai" });
  const withPref = soulmateCollagePrompt({
    gender: "female", element: "Water", look: "thai",
    preferenceEn: [BODY_PREF.tall_lean.promptEn, FACE_PREF.long_defined.promptEn],
  });
  assert.ok(withPref.includes("tall lean healthy"), "วลีความชอบเข้า prompt");
  assert.ok(withPref.includes("angular jawline"));
  assert.ok(!withPref.includes("soft round full face"), "โครง ค.1 น้ำถูกแทนเมื่อผู้ใช้เลือกเอง");
  assert.equal(soulmateCollagePrompt({ gender: "female", element: "Water", look: "thai", preferenceEn: [] }), plain);
});
