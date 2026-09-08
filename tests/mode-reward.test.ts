// เทสต์เครดิตทดลองจากความเห็นรายโหมด (ผู้ใช้เคาะ 6 ก.ย. 2569) — ส่วน pure
import { test } from "node:test";
import assert from "node:assert";
import {
  FEEDBACK_MODES,
  MODE_FEEDBACK_REWARD,
  MIN_REWARD_TEXT,
  feedbackModeById,
  untriedModes,
  decideModeReward,
} from "../lib/feedback/mode-reward";

test("registry — 11 โหมด เพดานรวม 220 เครดิต/บัญชี + โหมด verifiable ครบตัวที่มีหลักฐาน server", () => {
  assert.equal(FEEDBACK_MODES.length, 11);
  assert.equal(FEEDBACK_MODES.length * MODE_FEEDBACK_REWARD, 220);
  // มีหลักฐานฝั่ง server เฉพาะโหมดที่ bump chat_usage_e จริง (ฝัน/เสี่ยงทาย/เนื้อคู่)
  const verifiable = FEEDBACK_MODES.filter((m) => m.verifiable).map((m) => m.logicId).sort((a, b) => a - b);
  assert.deepEqual(verifiable, [4, 17, 21, 22]);
  // path ต้องขึ้นต้น / และไม่ซ้ำ
  const paths = FEEDBACK_MODES.map((m) => m.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const p of paths) assert.ok(p.startsWith("/"));
  assert.equal(feedbackModeById(4)?.path, "/dream");
  assert.equal(feedbackModeById(999), null);
});

test("untriedModes — ตัดโหมดที่เคลมแล้ว + โหมดปัจจุบันออก", () => {
  const all = untriedModes([], undefined);
  assert.equal(all.length, 11);
  const some = untriedModes([4, 21], 17);
  assert.equal(some.length, 8);
  assert.ok(!some.some((m) => [4, 21, 17].includes(m.logicId)));
});

test("decideModeReward — กันฟาร์มครบชั้น: ล็อกอิน/บัญชีถาวร/ครั้งเดียว/ความยาว/ใช้จริง", () => {
  const base = { isLoggedIn: true, isAnonymous: false, textLength: 50, alreadyClaimed: false, usageOk: true };
  assert.ok(decideModeReward(base).eligible);
  assert.ok(!decideModeReward({ ...base, isLoggedIn: false }).eligible);
  assert.ok(!decideModeReward({ ...base, isAnonymous: true }).eligible, "guest ต้องผูกบัญชีก่อน");
  assert.ok(!decideModeReward({ ...base, alreadyClaimed: true }).eligible, "ครั้งเดียวต่อโหมด");
  assert.ok(!decideModeReward({ ...base, textLength: MIN_REWARD_TEXT - 1 }).eligible, "ความเห็นสั้นเกิน");
  assert.ok(decideModeReward({ ...base, textLength: MIN_REWARD_TEXT }).eligible);
  assert.ok(!decideModeReward({ ...base, usageOk: false }).eligible, "โหมด verifiable ต้องใช้จริงก่อน");
  // เหตุผลปฏิเสธเป็นภาษาผู้ใช้ ไม่ใช่ศัพท์ภายใน
  const r = decideModeReward({ ...base, isAnonymous: true });
  assert.ok(!r.eligible && !/anon|guest|uid/i.test(r.reasonTh));
});
