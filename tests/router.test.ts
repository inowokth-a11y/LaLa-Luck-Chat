// Golden parity test — lib/engine/router.ts ต้องตรงเป๊ะกับ router_engine.py (Logic 0)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  routeByKeyword,
  validateAiClassification,
  getRouterSystemPrompt,
  KEYWORD_MAP,
  LOGIC_NAMES,
  RESPONSE_MODE,
  VALID_LOGIC_IDS,
} from "../lib/engine/router";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "router.fixture.json"), "utf-8"));

interface Case {
  input: string;
  expected: Record<string, unknown>;
}

/**
 * มี 2 ฟิลด์ที่จงใจไม่ตรงกัน — ตัดออกทั้งคู่ก่อนเทียบ เพราะ parity ที่ต้องการคือ
 * "ผลการตัดสินใจตรงกัน" ไม่ใช่ "ฟิลด์ประกอบตรงกัน":
 *
 *  - `matched_keyword` (มีเฉพาะ TS) — คำที่ทำให้ match ใส่ไว้ debug ว่าทำไมหลุดไป Logic นั้น
 *  - `note` (มีเฉพาะ Python) — ข้อความ "STUB: ควรเรียก Claude จริงตรงนี้" ซึ่งเป็น marker
 *    ของ claude_classify_stub() ฝั่ง TS ทำชั้น AI จริงแล้วใน app/api/logic/router/route.ts
 *    การพอร์ต note มาด้วยจะกลายเป็นคำโกหกในโค้ด
 */
function normalize(o: Record<string, unknown>): Record<string, unknown> {
  const { matched_keyword: _a, note: _b, ...rest } = o;
  return rest;
}

test("route parity — ทุกเคสตรงกับ Python", () => {
  for (const c of fx.cases as Case[]) {
    assert.deepEqual(
      normalize(routeByKeyword(c.input) as unknown as Record<string, unknown>),
      normalize(c.expected),
      `เคส: ${JSON.stringify(c.input)}`
    );
  }
});

/**
 * บันทึกข้อจำกัดที่เจอตอนพอร์ต ไม่ใช่บั๊ก — keyword ของ Logic 20 เป็นวลียาวตายตัว
 * ผู้ใช้จริงแทรกคำเดียวก็หลุดแล้ว ("เข้ากับบ้านฉันไหม" ไม่ match "เข้ากับบ้านไหม")
 * เทสต์นี้ล็อกพฤติกรรมไว้ ถ้าวันหนึ่งแก้ให้ฉลาดขึ้นจะได้รู้ตัวว่ากำลังเปลี่ยนอะไร
 */
test("ข้อจำกัดที่รู้ตัว — วลี keyword ยาวเกินไป แทรกคำเดียวก็หลุดไป fallback", () => {
  assert.equal(routeByKeyword("คนนี้เข้ากับบ้านไหม").logic_id, 20);
  assert.equal(routeByKeyword("คนนี้เข้ากับบ้านฉันไหม").method, "fallback_no_keyword_match");
});

test("ตาราง KEYWORD_MAP เรียงลำดับตรงกับ Python (ตัวแรกที่ match คือตัวที่ชนะ)", () => {
  const mine = KEYWORD_MAP.map(([id, kws]) => [id, [...kws]]);
  assert.deepEqual(mine, fx.keyword_map_order);
});

test("LOGIC_NAMES / RESPONSE_MODE ตรงกับ Python", () => {
  for (const [k, v] of Object.entries(fx.logic_names)) {
    assert.equal(LOGIC_NAMES[Number(k)], v, `logic ${k}`);
  }
  for (const [k, v] of Object.entries(fx.response_mode)) {
    assert.equal(RESPONSE_MODE[Number(k)], v, `mode ${k}`);
  }
});

test("Safety Gate ชนะ keyword เสมอ แม้ข้อความจะมี keyword ของ Logic อื่นปน", () => {
  const r = routeByKeyword("เมื่อคืนฝันเห็นงู แล้วตื่นมาอยากฆ่าตัวตาย");
  assert.equal(r.logic_id, -1);
  assert.equal(r.method, "safety_keyword");
  assert.equal(r.intercepted, true);
  assert.ok(r.crisis_resource_message);
});

test("matched_keyword บอกได้ว่าโดนคำไหน (ฟิลด์เสริมฝั่ง TS)", () => {
  assert.equal(routeByKeyword("เมื่อคืนฝันเห็นงู").matched_keyword, "ฝัน");
});

// ---- ชั้น AI classification (ไม่มีใน Python — ของใหม่ที่แทน claude_classify_stub) ----

test("validateAiClassification — รับผลที่ถูกต้อง", () => {
  assert.deepEqual(validateAiClassification({ logic_id: 4, confidence: 0.9 }), { logic_id: 4, confidence: 0.9 });
});

test("validateAiClassification — ปฏิเสธ logic_id ที่ไม่มีจริง", () => {
  assert.equal(validateAiClassification({ logic_id: 5, confidence: 0.9 }), null); // 5 = Vision ยังไม่ทำ
  assert.equal(validateAiClassification({ logic_id: 99, confidence: 0.9 }), null);
  assert.equal(validateAiClassification({ logic_id: -1, confidence: 1 }), null); // AI ห้ามสั่ง safety เอง
});

test("validateAiClassification — input พังรูปแบบต่างๆ คืน null ไม่ throw", () => {
  assert.equal(validateAiClassification(null), null);
  assert.equal(validateAiClassification("ไม่ใช่ object"), null);
  assert.equal(validateAiClassification({}), null);
  assert.equal(validateAiClassification({ logic_id: "สี่" }), null);
  assert.equal(validateAiClassification({ logic_id: 4.5, confidence: 1 }), null);
});

test("validateAiClassification — confidence เพี้ยนไม่ทิ้งคำตอบ แค่ถือว่าไม่มั่นใจ", () => {
  assert.deepEqual(validateAiClassification({ logic_id: 4 }), { logic_id: 4, confidence: 0.5 });
  assert.deepEqual(validateAiClassification({ logic_id: 4, confidence: 7 }), { logic_id: 4, confidence: 1 });
  assert.deepEqual(validateAiClassification({ logic_id: 4, confidence: -2 }), { logic_id: 4, confidence: 0 });
});

test("system prompt ของ Router มีรหัสครบทุกตัวที่อนุญาต และไม่มีตัวที่ยังไม่ทำ", () => {
  const p = getRouterSystemPrompt();
  for (const id of VALID_LOGIC_IDS) assert.ok(p.includes(`  ${id} = `), `ขาด logic ${id}`);
  for (const id of [5, 6, 13, 15]) assert.ok(!p.includes(`  ${id} = `), `ไม่ควรมี logic ${id}`);
});
