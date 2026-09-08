// ปฏิทินจันทรคติจีน — verify กับวันตรุษจีน 36 ปี + เดือนอธิกมาสที่ทราบ (ข้อมูลสาธารณะ HKO/Wikipedia)
import { test } from "node:test";
import assert from "node:assert";
import { chineseNewYear, leapMonthOfYear, chineseLunarDate, yearBranchIndex } from "../lib/engine/chinese-lunar";

// วันตรุษจีน ค.ศ. 2000-2035 (en.wikipedia.org/wiki/Chinese_New_Year)
const CNY: Record<number, string> = {
  2000: "02-05", 2001: "01-24", 2002: "02-12", 2003: "02-01", 2004: "01-22", 2005: "02-09",
  2006: "01-29", 2007: "02-18", 2008: "02-07", 2009: "01-26", 2010: "02-14", 2011: "02-03",
  2012: "01-23", 2013: "02-10", 2014: "01-31", 2015: "02-19", 2016: "02-08", 2017: "01-28",
  2018: "02-16", 2019: "02-05", 2020: "01-25", 2021: "02-12", 2022: "02-01", 2023: "01-22",
  2024: "02-10", 2025: "01-29", 2026: "02-17", 2027: "02-06", 2028: "01-26", 2029: "02-13",
  2030: "02-03", 2031: "01-23", 2032: "02-11", 2033: "01-31", 2034: "02-19", 2035: "02-08",
};

test("🔴 ตรุษจีน 2000-2035 ตรงทั้ง 36 ปี (พิสูจน์จันทร์ดับ + กฎเดือน 11/เหมายัน)", () => {
  const miss: string[] = [];
  for (const [y, md] of Object.entries(CNY)) {
    const c = chineseNewYear(Number(y));
    const got = `${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
    if (got !== md) miss.push(`${y}: got ${got} want ${md}`);
  }
  assert.deepEqual(miss, []);
});

test("🔴 เดือนอธิกมาส 2000-2036 ตรงกับปฏิทินทางการ (閏月)", () => {
  const LEAP: Record<number, number | null> = {
    2000: null, 2001: 4, 2002: null, 2003: null, 2004: 2, 2005: null, 2006: 7, 2007: null, 2008: null,
    2009: 5, 2010: null, 2011: null, 2012: 4, 2013: null, 2014: 9, 2015: null, 2016: null, 2017: 6,
    2018: null, 2019: null, 2020: 4, 2021: null, 2022: null, 2023: 2, 2024: null, 2025: 6, 2026: null,
    2027: null, 2028: 5, 2029: null, 2030: null, 2031: 3, 2032: null, 2033: 11, 2034: null, 2035: null, 2036: 6,
  };
  const miss: string[] = [];
  for (const [y, lm] of Object.entries(LEAP)) {
    const got = leapMonthOfYear(Number(y));
    if (got !== lm) miss.push(`${y}: got ${got} want ${lm}`);
  }
  assert.deepEqual(miss, []);
});

test("chineseLunarDate — ตรุษจีน = เดือน 1 วัน 1 · วันก่อนตรุษจีน = เดือน 12 ปีก่อน · วันต่อเนื่อง · 2033 ปีอธิกมาส 11", () => {
  assert.deepEqual(chineseLunarDate(2026, 2, 17), { lunarYear: 2026, month: 1, isLeap: false, day: 1 });
  assert.deepEqual(chineseLunarDate(2026, 2, 16), { lunarYear: 2025, month: 12, isLeap: false, day: 29 });
  // 8 ก.ย. 2569 = 2026-09-08 → ปีมะเมีย เดือน 7 (ตรวจว่าเลขวันเดินต่อเนื่อง 1..29/30)
  const d1 = chineseLunarDate(2026, 9, 8);
  const d2 = chineseLunarDate(2026, 9, 9);
  assert.equal(d1.lunarYear, 2026);
  assert.ok(d2.day === d1.day + 1 || d2.day === 1);
  // ปี 2033: มีเดือน 11 อธิกมาส → 2033-12-22 ควรอยู่ในเดือน 閏11 (ตรุษจีน 2034 = 19 ก.พ. ช้าผิดปกติ)
  const lm = chineseLunarDate(2033, 12, 22);
  assert.equal(lm.month, 11);
  assert.equal(lm.isLeap, true);
  // ไหว้พระจันทร์ (เดือน 8 วัน 15): 2025-10-06 · 2026-09-25 (ปฏิทินสาธารณะ)
  assert.deepEqual(chineseLunarDate(2025, 10, 6), { lunarYear: 2025, month: 8, isLeap: false, day: 15 });
  assert.deepEqual(chineseLunarDate(2026, 9, 25), { lunarYear: 2026, month: 8, isLeap: false, day: 15 });
});

test("yearBranchIndex — 1984 子 · 2026 午 (มะเมีย) · 2025 巳", () => {
  assert.equal(yearBranchIndex(1984), 0);
  assert.equal(yearBranchIndex(2026), 6);
  assert.equal(yearBranchIndex(2025), 5);
});
