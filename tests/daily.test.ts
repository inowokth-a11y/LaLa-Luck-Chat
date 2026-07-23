// Golden parity test — lib/engine/daily.ts เทียบกับ daily_prediction_engine.py

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  getKalakiniPlanet,
  moonEclipticLongitude,
  getMoonSign,
  dailyPrediction,
} from "../lib/engine/daily";
import { julianDay } from "../lib/engine/lagna";
import { lahiriAyanamsa } from "../lib/engine/ascendant";
const MOON_SIGN_THAI = ["เมษ","พฤษภ","มิถุน","กรกฎ","สิงห์","กันย์","ตุลย์","พิจิก","ธนู","มังกร","กุมภ์","มีน"];

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "daily.fixture.json"), "utf-8"));

// map planet number -> Thai name (mirror ของ engine เพื่อเทียบตาราง)
const PLANET_NAME_TH: Record<number, string> = {
  1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ", 5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู",
};

test("kalakini table by day + rahu + unknown", () => {
  const got: Record<string, string | number | null> = {};
  for (const day of ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]) {
    got[day] = PLANET_NAME_TH[getKalakiniPlanet(day)!];
  }
  got["ราหู_8"] = PLANET_NAME_TH[getKalakiniPlanet(8)!];
  got["unknown_day"] = getKalakiniPlanet("ไม่มี");
  assert.deepEqual(got, fx.kalakini_by_day);
});

const moonCases: Array<[string, { year: number; month: number; day: number; hour: number; minute: number }]> = [
  ["j2000_epoch", { year: 2000, month: 1, day: 1, hour: 12, minute: 0 }],
  ["y2026_07_16", { year: 2026, month: 7, day: 16, hour: 0, minute: 0 }],
  ["y1990_08_15_1130", { year: 1990, month: 8, day: 15, hour: 11, minute: 30 }],
];
for (const [label, dt] of moonCases) {
  test(`moon longitude+sign — ${label}`, () => {
    const ms = Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, 0);
    const lon = moonEclipticLongitude(julianDay(ms));
    // ลองจิจูดยังต้องตรงกับ Python เป๊ะ — นี่คือ "คณิตศาสตร์ที่พอร์ตมา" ซึ่งไม่ได้เปลี่ยน
    assert.ok(Math.abs(lon - fx.moon_cases[label].moon_longitude) <= 1e-6, `${label} longitude`);

    // 🔴 ราศี **จงใจไม่ตรงกับ Python** — Python ไม่ลบอายนางศะ (ให้ราศีสายนะแบบตะวันตก)
    //    ส่วนเราลบแล้วเพื่อให้เป็นนิรายนะตามโหราศาสตร์ไทย (ดู CLAUDE.md §5.3)
    //    เทสต์จึงเทียบกับ "ราศีที่คำนวณจากลองจิจูดของ Python ลบอายนางศะ" แทน
    const jd = julianDay(ms);
    const siderealLon = ((fx.moon_cases[label].moon_longitude - lahiriAyanamsa(jd)) % 360 + 360) % 360;
    const expectedSign = MOON_SIGN_THAI[Math.floor(siderealLon / 30)];
    assert.equal(getMoonSign(dt), expectedSign, `${label} ราศีนิรายนะ`);
  });
}

const dailyCases: Array<[string, ReturnType<typeof dailyPrediction>]> = [
  ["no_birthday", dailyPrediction("ธนู", "เมษ")],
  ["kalakini_not_triggered", dailyPrediction("ธนู", "กรกฎ", "จันทร์")],
  ["kalakini_triggered", dailyPrediction("ธนู", "สิงห์", "จันทร์")],
  ["rahu_uncheckable", dailyPrediction("ธนู", "เมษ", "ศุกร์")],
  ["opposition", dailyPrediction("เมษ", "ตุลย์")],
  ["conjunct", dailyPrediction("เมษ", "เมษ")],
];
for (const [label, result] of dailyCases) {
  test(`daily_prediction — ${label}`, () => {
    assert.deepEqual(result, fx.daily_cases[label]);
  });
}
