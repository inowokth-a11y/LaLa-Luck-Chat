// Golden parity test — lib/engine/dream.ts เทียบกับ dream_interpretation_engine.py (Logic 4)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  interpretDream,
  checkDreamRecurring,
  getRecurringThemeSuggestion,
  getAi1SystemPrompt,
  variants,
  type DreamLogEntry,
} from "../lib/engine/dream";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "dream.fixture.json"), "utf-8"));

const USER = "test_user_001";
const THEME = "ถูกไล่ล่า / วิ่งหนี";
const recurringLog: DreamLogEntry[] = [
  { user_id: USER, theme: THEME, year_month: "2026-05", count: 4 },
  { user_id: USER, theme: THEME, year_month: "2026-06", count: 3 },
];
const nonRecurringLog: DreamLogEntry[] = [
  { user_id: USER, theme: THEME, year_month: "2026-05", count: 4 },
];

test("interpret — crisis intercepted (safety gate first)", () => {
  assert.deepEqual(interpretDream("ฝันเห็นแม่ แต่ช่วงนี้ทนไม่ไหวแล้ว อยากตาย", "จันทร์"), fx.interpret_crisis);
});
test("interpret — symbol match (mother)", () => {
  assert.deepEqual(interpretDream("ฝันเห็นแม่มายืนอยู่หน้าบ้าน", "จันทร์"), fx.interpret_symbol_mother);
});
test("interpret — theme match (chase)", () => {
  assert.deepEqual(interpretDream("เมื่อคืนฝันว่าถูกไล่ล่า วิ่งหนีไม่ทัน", "อังคาร"), fx.interpret_theme_chase);
});
test("interpret — no explicit day", () => {
  assert.deepEqual(interpretDream("ฝันเห็นยานอวกาศสีม่วงบินอยู่เหนือตึกระฟ้า"), fx.interpret_no_match);
});
test("interpret — deep reading (no principle note)", () => {
  assert.deepEqual(interpretDream("ฝันเห็นแม่มายืนอยู่หน้าบ้าน", "จันทร์", true), fx.interpret_deep);
});

test("recurring — check (2 consecutive months)", () => {
  assert.deepEqual(checkDreamRecurring(recurringLog, USER, THEME), fx.recurring_check);
});
test("recurring — suggestion triggered (with wellness)", () => {
  assert.deepEqual(getRecurringThemeSuggestion(recurringLog, USER, THEME), fx.recurring_suggestion);
});
test("recurring — suggestion not triggered (single month)", () => {
  assert.deepEqual(getRecurringThemeSuggestion(nonRecurringLog, USER, THEME), fx.non_recurring_suggestion);
});

test("ai1 system prompt matches exactly", () => {
  assert.equal(getAi1SystemPrompt(), fx.ai1_prompt);
});
test("variants split", () => {
  assert.deepEqual(variants("พ่อ / บิดา, ปู่"), fx.variants_sample);
});
