// เทสต์ face-card เฟส 1 — ล็อก prompt/ฉาก/token/consent ให้ตรงกติกาที่ตกลง
import { test } from "node:test";
import assert from "node:assert/strict";

import { CARD_ART_STYLE, faceCardPrompt, cardArtUrl } from "../lib/face-card/prompt";
import { newShareToken, isValidShareToken } from "../lib/face-card/store";
import { FACE_CONSENT_VERSION, FACE_CONSENT_CHECKBOX, FACE_CONSENT_DETAILS } from "../lib/face-card/consent";
import cardScenes from "../data/card_gen_scenes.json";

test("ฉากการ์ดครบ 100 ใบ (00-99) — ทุกใบมี name_en/name_th/scene", () => {
  const scenes = cardScenes as Record<string, { name_en: string; name_th: string; scene: string }>;
  assert.equal(Object.keys(scenes).length, 100);
  for (let i = 0; i < 100; i++) {
    const id = String(i).padStart(2, "0");
    const s = scenes[id];
    assert.ok(s, `ไม่มีฉากการ์ด ${id}`);
    assert.ok(s.scene.length > 20, `ฉากการ์ด ${id} สั้นผิดปกติ`);
  }
});

test("prompt: มีสูตรสไตล์ทางการ + ฉากรายใบ + กันตัวอักษร/ลายน้ำ + คงอัตลักษณ์ใบหน้า", () => {
  const p = faceCardPrompt("00");
  assert.ok(p.includes(CARD_ART_STYLE), "ต้องมีสูตรสไตล์ทางการครบถ้วน");
  assert.ok(p.includes("The Secluded One"), "ต้องมีชื่อตัวละครจากไฟล์ฉากจริง");
  assert.ok(/no text/i.test(p) && /no watermark/i.test(p));
  assert.ok(/facial identity/i.test(p), "ต้องสั่งคงอัตลักษณ์ใบหน้า");
  // การ์ดที่ไม่มีฉาก (id แปลก) — fallback ไม่พัง
  assert.ok(faceCardPrompt("xx").includes(CARD_ART_STYLE));
});

test("cardArtUrl ใช้สูตร bucket จริงตาม §1.5", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  assert.ok(cardArtUrl("37").endsWith("/master_energy_cards/37-removebg-preview.png"));
});

test("share token: สุ่มไม่ซ้ำ + ผ่าน validator + ค่าปลอมไม่ผ่าน", () => {
  const a = newShareToken();
  const b = newShareToken();
  assert.notEqual(a, b);
  assert.ok(isValidShareToken(a) && isValidShareToken(b));
  assert.equal(a.length, 22); // 16 ไบต์ base64url
  assert.ok(!isValidShareToken("short"));
  assert.ok(!isValidShareToken("../../etc/passwd"));
  assert.ok(!isValidShareToken("a".repeat(40)));
});

test("consent ชีวมิติ: เวอร์ชันมีรูปแบบวันที่ + ข้อความครบสาระบังคับ", () => {
  assert.match(FACE_CONSENT_VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/);
  assert.ok(FACE_CONSENT_CHECKBOX.includes("ยินยอมโดยชัดแจ้ง"), "PDPA ม.26 ต้อง explicit");
  assert.ok(FACE_CONSENT_CHECKBOX.includes("ไม่ถูกจัดเก็บ"), "ต้องบอกชะตากรรมรูปต้นฉบับ");
  const all = FACE_CONSENT_DETAILS.join("\n");
  for (const topic of ["ชีวมิติ", "fal.ai", "Anthropic", "ลบบัญชี", "ไม่ถูกใช้เทรน"]) {
    assert.ok(all.includes(topic), `รายละเอียด consent ต้องมี "${topic}"`);
  }
});
