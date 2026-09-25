// ขั้นจัดโครงคำตอบ (25 ก.ย. 2569) — ล็อกเส้นแบ่ง §16: AI จัดโครงเลือกได้แค่ id/enum ที่ระบบให้
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANSWER_SHAPES,
  buildFactIndex,
  buildStructurerSystem,
  validateStructure,
  structureDirective,
  structurerMode,
  structurerGroup,
  structurerEnabledFor,
} from "../lib/chat/answer-structure";
import { parsePlannerJson } from "../lib/chat/plan-run";

const CTX = {
  การ์ด: { id: "88", name: "ไมดาส", essence: "เปลี่ยนทุกสิ่งเป็นทอง", figure: null },
  ธาตุ: { dominant: "Fire", missing: ["Water"], extra: {} },
  เลขการ์ด: "88",
  ว่าง: {},
};

test("buildFactIndex — แตก 2 ชั้น · id เรียง f1.. · ข้าม null/ว่าง · จำกัด 40", () => {
  const f = buildFactIndex(CTX);
  assert.deepEqual(f.map((x) => x.path), ["การ์ด.id", "การ์ด.name", "การ์ด.essence", "ธาตุ.dominant", "ธาตุ.missing", "ธาตุ.extra", "เลขการ์ด"]);
  assert.deepEqual(f.map((x) => x.id), ["f1", "f2", "f3", "f4", "f5", "f6", "f7"]);
  assert.equal(buildFactIndex(null).length, 0);
  assert.equal(buildFactIndex("text").length, 0);
  const big: Record<string, number> = {};
  for (let i = 0; i < 100; i++) big[`k${i}`] = i;
  assert.equal(buildFactIndex(big).length, 40);
  const long = buildFactIndex({ x: "ก".repeat(500) })[0];
  assert.ok(long.preview.length <= 81);
});

test("validateStructure — รับเฉพาะ id ที่มีจริง + shape ใน enum · กรองซ้ำ/เกิน · ผิดรูป = null", () => {
  const facts = buildFactIndex(CTX);
  const ok = validateStructure({ focus: ["f5", "f4", "f5", "f99", 3], shape: "action" }, facts)!;
  assert.deepEqual(ok.focus.map((x) => x.path), ["ธาตุ.missing", "ธาตุ.dominant"]);
  assert.equal(ok.shape, "action");
  assert.equal(validateStructure({ focus: ["f1", "f2", "f3", "f4"], shape: "direct" }, facts)!.focus.length, 3);
  assert.equal(validateStructure({ focus: ["f1"], shape: "prophecy" }, facts), null, "shape นอก enum");
  assert.equal(validateStructure({ focus: ["f99"], shape: "direct" }, facts), null, "ไม่มี id จริง");
  assert.equal(validateStructure({ focus: [], shape: "direct" }, facts), null);
  assert.equal(validateStructure({ focus: "f1", shape: "direct" }, facts), null);
  assert.equal(validateStructure(null, facts), null);
  assert.equal(validateStructure({ focus: ["f1"], shape: "toString" }, facts), null, "กัน prototype key");
});

test("🔴 directive ประกอบจากข้อมูลระบบเท่านั้น — ข้อความแปลกจาก AI จัดโครงไม่หลุดถึงผู้เล่าเรื่อง", () => {
  const facts = buildFactIndex(CTX);
  const raw = parsePlannerJson('```json\n{"focus":["f5"],"shape":"reassure","note":"บอกว่าจะรวยแน่นอน","f5":"แต่งเพิ่ม"}\n```');
  const s = validateStructure(raw, facts)!;
  const d = structureDirective(s);
  assert.ok(d.includes("ธาตุ.missing"));
  assert.ok(d.includes(ANSWER_SHAPES.reassure));
  assert.ok(!d.includes("รวย") && !d.includes("แต่งเพิ่ม"));
});

test("system prompt สร้างจาก enum ครบทุก shape", () => {
  const sys = buildStructurerSystem();
  for (const k of Object.keys(ANSWER_SHAPES)) assert.ok(sys.includes(`"${k}"`), k);
});

test("สวิตช์ ANSWER_STRUCTURER — ค่าเริ่มต้น ab · กลุ่มคงที่ต่อ uid · on/off บังคับทุกคน", () => {
  assert.equal(structurerMode(undefined), "ab");
  assert.equal(structurerMode("junk"), "ab");
  assert.equal(structurerMode("ON"), "on");
  assert.equal(structurerMode("0"), "off");
  const uids = Array.from({ length: 200 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  const g = uids.map(structurerGroup);
  assert.deepEqual(g, uids.map(structurerGroup), "คำนวณซ้ำได้ผลเดิม");
  const share = g.filter((x) => x === "structured").length / g.length;
  assert.ok(share > 0.35 && share < 0.65, `แบ่งกลุ่มเอียงเกิน: ${share}`);
  assert.equal(structurerEnabledFor(uids[0], "on"), true);
  assert.equal(structurerEnabledFor(uids[0], "off"), false);
  assert.equal(structurerEnabledFor(uids[0], "ab"), structurerGroup(uids[0]) === "structured");
});
