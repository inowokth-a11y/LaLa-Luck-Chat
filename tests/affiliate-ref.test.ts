// เลเยอร์การแชร์ — encode/parse ref cookie (ห้ามเดา via, code ผิดรูป = null)
import test from "node:test";
import assert from "node:assert/strict";
import { encodeRefCookie, parseRefCookie, toRefVia } from "../lib/affiliate/ref";

test("encode/parse round-trip ทั้งสองทาง", () => {
  assert.deepEqual(parseRefCookie(encodeRefCookie("page-a", "link")), { code: "page-a", via: "link" });
  assert.deepEqual(parseRefCookie(encodeRefCookie("page-a", "share")), { code: "page-a", via: "share" });
});

test("ค่าเดิมก่อน migration 039 (code ล้วน) = via 'link'", () => {
  assert.deepEqual(parseRefCookie("abc123"), { code: "abc123", via: "link" });
});

test("ค่าพัง/ผิดรูป = null ไม่เดา", () => {
  assert.equal(parseRefCookie(""), null);
  assert.equal(parseRefCookie(null), null);
  assert.equal(parseRefCookie("AB|s"), null); // ตัวใหญ่ผิดรูปแบบ code
  assert.equal(parseRefCookie("|s"), null);
});

test("toRefVia — เฉพาะ 'share' เท่านั้นที่เป็น share", () => {
  assert.equal(toRefVia("share"), "share");
  assert.equal(toRefVia("SHARE"), "link");
  assert.equal(toRefVia(undefined), "link");
  assert.equal(toRefVia(123), "link");
});
