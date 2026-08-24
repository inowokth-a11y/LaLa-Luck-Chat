// เทสต์ชั้น Jyotish สากล (งานวิจัย 24 ส.ค. 2569) — ล็อกกฎที่ค้น+ยืนยันจากแหล่งเผยแพร่จริง
// ดาราศาสตร์ verify กับ Swiss Ephemeris แยกแล้ว (scripts/verify-planets-swisseph.py — 205 เคส PASS)
import { test } from "node:test";
import assert from "node:assert";
import {
  PLANET_APPEARANCE, dignityInSign, soulmateConvergence, overlapWindows, type SoulmateJyotish,
  navamsaIdx, arudhaOfHouse, upapadaLagna, charaKarakas, darakaraka,
  moonNakshatra, vimshottariMahadashas, antardashas, buildJyotishChart,
  soulmateJyotish, SIGN_LORD, GRAHA_TH, JYOTISH_CAVEAT, JYOTISH_TIMING_CAVEAT,
  type JyotishChart, type Graha,
} from "../lib/engine/jyotish";
import { ZODIAC_ORDER } from "../lib/engine/ascendant";

const jdUtc = (y: number, mo: number, d: number, h: number, mi: number) =>
  Date.UTC(y, mo - 1, d, h, mi, 0) / 86400000 + 2440587.5;

test("D9 navamsa — ตรงตัวอย่างคลาสสิก (พฤษภช่องแรก=มังกร · มิถุนช่องแรก=ตุลย์ · จร=ราศีเดิม)", () => {
  assert.equal(navamsaIdx(30 + 1), 9, "พฤษภ (คงที่) navamsa แรก = ราศีที่ 9 = มังกร");
  assert.equal(navamsaIdx(60 + 0.5), 6, "มิถุน (อุภย) navamsa แรก = ราศีที่ 5 = ตุลย์");
  assert.equal(navamsaIdx(0.1), 0, "เมษ (จร) navamsa แรก = เมษเอง");
  assert.equal(navamsaIdx(90 + 0.1), 3, "กรกฎ (จร) navamsa แรก = กรกฎเอง");
  // เดินตามลำดับราศีในช่องถัดไป
  assert.equal(navamsaIdx(30 + 4), 10, "พฤษภช่องที่ 2 = กุมภ์");
});

test("Arudha — กฎนับ + ข้อยกเว้น (ตัวอย่างจริงจากแหล่ง: เจ้าเรือนอยู่ภพ 4 → arudha = ภพ 4)", () => {
  // สร้าง chart ปลอมเฉพาะตำแหน่งที่ใช้: ลัคนาเมษ เจ้าเรือน (อังคาร) อยู่กรกฎ (ภพ 4)
  const fake = (lagnaIdx: number, lordSign: Record<string, number>): JyotishChart => {
    const positions: Record<string, { graha: string; lon: number; signIdx: number; degInSign: number; house: number }> = {};
    for (const g of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]) {
      const si = lordSign[g] ?? 0;
      positions[g] = { graha: g, lon: si * 30 + 15, signIdx: si, degInSign: 15, house: ((si - lagnaIdx + 12) % 12) + 1 };
    }
    return { jd: 0, lagnaIdx, positions } as unknown as JyotishChart;
  };
  // เมษ (H=0) เจ้าเรือน mars ใน กรกฎ (idx 3, d=3) → naive = 0+2*3=6 (ตุลย์ = ภพ 7) → ข้อยกเว้น → ภพ 4 (กรกฎ)
  assert.equal(arudhaOfHouse(fake(0, { mars: 3 }), 1), 3, "เจ้าเรือนภพ 4 → arudha ตกภพ 7 → เลื่อนเป็นภพ 4");
  // เจ้าเรือนอยู่ภพเดิม (d=0) → naive = ภพเดิม → ข้อยกเว้น → ภพ 10 (+9)
  assert.equal(arudhaOfHouse(fake(0, { mars: 0 }), 1), 9, "เจ้าเรือนอยู่ภพเดิม → arudha = ภพ 10");
  // กรณีปกติ: เจ้าเรือนภพ 2 (d=1) → arudha = ภพ 3
  assert.equal(arudhaOfHouse(fake(0, { mars: 1 }), 1), 2, "เจ้าเรือนภพ 2 → arudha = ภพ 3");
  // Upapada = arudha ของภพ 12 (ลัคนาเมษ → ภพ 12 = มีน เจ้าเรือน jupiter)
  const ch = fake(0, { jupiter: 1 }); // มีน(11) → พฤหัสในพฤษภ(1): d=2 → naive = 11+4=3 (กรกฎ)
  assert.equal(upapadaLagna(ch), 3);
});

test("Chara Karaka 8 ดวง — ราหูใช้ 30°−องศา · DK = องศาน้อยสุด", () => {
  const jd = jdUtc(1986, 10, 6, 23, 28); // 7 ต.ค. 2529 06:28 ไทย
  const chart = buildJyotishChart(jd, "กันย์");
  const ranked = charaKarakas(chart);
  assert.equal(ranked.length, 8, "8 karaka รวมราหู");
  const rahuRow = ranked.find((r) => r.graha === "rahu")!;
  assert.ok(Math.abs(rahuRow.effDeg - (30 - chart.positions.rahu.degInSign)) < 1e-9, "ราหูกลับด้านองศา");
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].effDeg >= ranked[i].effDeg, "เรียงมาก→น้อย");
  assert.equal(darakaraka(chart), ranked[7].graha, "DK = ตัวสุดท้าย");
});

test("Vimshottari — นักษัตร→เจ้าทศา (อัศวินี→เกตุ) · เศษทศาแรก · อันตรทศาเริ่มที่เจ้ามหาทศา รวม 120 ปี", () => {
  // ดวงจันทร์กลางอัศวินี (6°40′) → เกตุเหลือครึ่ง = 3.5 ปี
  const nak = moonNakshatra(360 / 27 / 2);
  assert.equal(nak.idx, 0);
  assert.ok(Math.abs(nak.frac - 0.5) < 1e-9);
  const birth = Date.UTC(1990, 0, 1);
  const mds = vimshottariMahadashas(360 / 27 / 2, birth);
  assert.equal(mds[0].lord, "ketu");
  assert.ok(Math.abs((mds[0].toMs - mds[0].fromMs) / (365.25 * 86400000) - 3.5) < 1e-6, "เกตุเหลือ 3.5 ปี");
  assert.equal(mds[1].lord, "venus");
  assert.ok(Math.abs((mds[1].toMs - mds[1].fromMs) / (365.25 * 86400000) - 20) < 1e-6);
  // มาฆะ (idx 9) → เกตุเช่นกัน (mod 9)
  assert.equal(vimshottariMahadashas(9 * (360 / 27) + 1, birth)[0].lord, "ketu");
  // อันตรทศาในมหาทศาเต็ม: เริ่มที่เจ้าเอง · ผลรวม = ปีมหาทศา
  const full = mds[1]; // ศุกร์เต็ม 20 ปี
  const ads = antardashas(full);
  assert.equal(ads[0].lord, "venus", "อันตรแรก = เจ้ามหาทศาเอง");
  assert.ok(Math.abs(ads[0].toMs - ads[0].fromMs - (20 / 120) * 20 * 365.25 * 86400000) < 1000, "ศุกร์-ศุกร์ = 20×20/120 ปี");
  const total = ads.reduce((s, a) => s + (a.toMs - a.fromMs), 0);
  assert.ok(Math.abs(total - 20 * 365.25 * 86400000) < 1000, "รวมอันตร = มหาทศาเต็ม");
});

test("soulmateJyotish — ประกอบครบ + caveat บังคับ 2 ตัว + เจ้าเรือน 7 ตรงตารางคลาสสิก", () => {
  const jd = jdUtc(1986, 10, 6, 23, 28);
  const birth = Date.UTC(1986, 9, 6, 23, 28);
  const j = soulmateJyotish(jd, birth, "กันย์", Date.UTC(2026, 7, 24), "male");
  assert.equal(j.seventhSign, "มีน", "กันย์ → ภพ 7 = มีน");
  assert.equal(j.seventhLord.grahaTh, "พฤหัสบดี", "เจ้าเรือนมีน = พฤหัส (ระบบคลาสสิก)");
  assert.ok(j.seventhLord.house >= 1 && j.seventhLord.house <= 12);
  assert.ok(j.seventhLord.arenaTh.length > 10, "มีคำอธิบายบริบทพบคู่");
  assert.ok(GRAHA_TH[darakaraka(buildJyotishChart(jd, "กันย์"))] === j.darakaraka.grahaTh);
  assert.ok(ZODIAC_ORDER.includes(j.upapada.signTh));
  assert.ok(j.upapada.second.toneTh.length > 5);
  assert.ok(j.nakshatra.idx >= 1 && j.nakshatra.idx <= 27);
  assert.ok(j.currentDasha, "ต้องหามหาทศาปัจจุบันเจอ (อายุ < 120 ปี)");
  assert.ok(j.caveats.includes(JYOTISH_CAVEAT) && j.caveats.includes(JYOTISH_TIMING_CAVEAT), "caveat ครบ");
  // ทุก window อยู่ในอนาคต (จาก nowMs) และมีเหตุผล
  for (const w of j.windows) assert.ok(w.reasonTh.includes("ทศา"));
});

test("PLANET_APPEARANCE — ครบ 9 ดาว + appearance เข้าใน soulmateJyotish", () => {
  assert.equal(Object.keys(PLANET_APPEARANCE).length, 9);
  for (const v of Object.values(PLANET_APPEARANCE)) {
    assert.ok(v.th.length > 5 && v.en.length > 5);
  }
  const jd = jdUtc(1986, 10, 6, 23, 28);
  const j = soulmateJyotish(jd, Date.UTC(1986, 9, 6, 23, 28), "กันย์", Date.UTC(2026, 7, 24), "male");
  // ดวงนี้ราหูอยู่ภพ 7 (ตรง Swiss Ephemeris) → appearance ต้องมีวลีราหู
  assert.ok(j.appearance.th.some((t) => t.includes("ราหู")), "ราหูในภพ 7 ต้องขึ้นใน appearance");
  assert.equal(j.appearance.en.length, j.planetsIn7th.slice(0, 3).length);
});

test("ราศีนิจ (debilitation) = ตรงข้ามอุจ — จูนจากการทดลอง 5 ดวง ให้ D9 ชี้ลบได้จริง", () => {
  assert.equal(dignityInSign("venus", 11), "exalted", "ศุกร์อุจมีน");
  assert.equal(dignityInSign("venus", 5), "debilitated", "ศุกร์นิจกันย์ (ตรงข้ามมีน)");
  assert.equal(dignityInSign("jupiter", 9), "debilitated", "พฤหัสนิจมังกร");
  assert.equal(dignityInSign("sun", 6), "debilitated", "อาทิตย์นิจตุลย์");
  assert.equal(dignityInSign("moon", 7), "debilitated", "จันทร์นิจพิจิก");
  assert.equal(dignityInSign("rahu", 0), "neutral", "ราหูไม่มีอุจ/นิจในตารางเรา (สำนักไม่ตรงกัน)");
});

test("soulmateConvergence — ครบ 4 กิ่ง + กรณีชั้นสากลเงียบต้องประกาศตำราเป็นเสียงหลัก (จูนข้อ 1)", () => {
  const fakeJ = (tone: string, strength: string) =>
    ({ upapada: { second: { tone } }, d9: { strength } } as unknown as SoulmateJyotish);
  // ✅ สอดคล้องบวก
  const a = soulmateConvergence(2, fakeJ("benefic", "strong"));
  assert.ok(a.label.includes("หลายชั้นชี้ทางเดียวกัน"));
  assert.deepEqual(a.signals, { tamraChemistry: 1, upapada: 1, d9: 1 });
  // ⚠️ สอดคล้องลบ (เคมี −2 + D9 นิจ)
  const b = soulmateConvergence(-2, fakeJ("neutral", "weak"));
  assert.ok(b.label.includes("จุดต้องดูแลตรงกัน"));
  // 🔀 ต่างมุม
  const c = soulmateConvergence(2, fakeJ("malefic", "neutral"));
  assert.ok(c.label.includes("ต่างมุม"));
  assert.ok(c.detailTh.includes("ตำราเป็นแกนหลัก"), "กติกาลำดับชั้น: ตำราเป็นแกน");
  // ชั้นสากลเงียบ → ตำราเป็นเสียงหลัก (ห้ามบอกว่า "ไม่มีชั้นไหนชี้แรง")
  const d = soulmateConvergence(2, fakeJ("neutral", "neutral"));
  assert.ok(d.label.includes("ชั้นตำราเป็นเสียงหลัก (เกื้อหนุน)"));
  const e = soulmateConvergence(-2, fakeJ("neutral", "neutral"));
  assert.ok(e.label.includes("ชั้นตำราเป็นเสียงหลัก (ต้องดูแล)"));
  // lord_strong นับเป็นบวก (JS 1.4.8)
  const f = soulmateConvergence(1, fakeJ("lord_strong", "neutral"));
  assert.ok(f.label.includes("หลายชั้นชี้ทางเดียวกัน"));
});

test("Bhavat Bhavam — derived houses ราศีถูกตำแหน่ง (2จาก7=ภพ8 · 10จาก7=ภพ4 · 4จาก7=ภพ10)", () => {
  const jd = jdUtc(1986, 10, 6, 23, 28);
  const j = soulmateJyotish(jd, Date.UTC(1986, 9, 6, 23, 28), "กันย์", Date.UTC(2026, 7, 24), "male");
  // ลัคนากันย์ (idx 5): ภพ 8 = เมษ · ภพ 4 = ธนู · ภพ 10 = มิถุน
  assert.equal(j.derived.wealth.signTh, "เมษ", "ทรัพย์ฝั่งคู่ = ภพ 8");
  assert.equal(j.derived.career.signTh, "ธนู", "การงานคู่ = ภพ 4 (10th จากภพ 7)");
  assert.equal(j.derived.roots.signTh, "มิถุน", "รากฐานคู่ = ภพ 10 (4th จากภพ 7)");
  assert.equal(j.derived.career.lordTh, "พฤหัสบดี", "เจ้าเรือนธนู = พฤหัส");
  for (const d of [j.derived.wealth, j.derived.career, j.derived.roots]) assert.ok(d.toneTh.length > 3);
  // windows มี ms ให้คำนวณทับซ้อน
  for (const w of j.windows) assert.ok(w.toMs > w.fromMs);
});

test("overlapWindows — จุดตัดช่วงเวลา + รวมช่วงต่อเนื่อง + ไม่ทับ = ว่าง", () => {
  const A = [{ fromMs: 100, toMs: 200 }, { fromMs: 300, toMs: 400 }];
  const B = [{ fromMs: 150, toMs: 350 }];
  const ov = overlapWindows(A, B);
  assert.equal(ov.length, 2);
  assert.deepEqual([ov[0].fromMs, ov[0].toMs], [150, 200]);
  assert.deepEqual([ov[1].fromMs, ov[1].toMs], [300, 350]);
  assert.equal(overlapWindows([{ fromMs: 0, toMs: 10 }], [{ fromMs: 20, toMs: 30 }]).length, 0, "ไม่ทับ = ว่าง");
  // ช่วงซ้อนกันถูกรวมเป็นก้อนเดียว
  const merged = overlapWindows([{ fromMs: 0, toMs: 100 }, { fromMs: 50, toMs: 150 }], [{ fromMs: 0, toMs: 200 }]);
  assert.equal(merged.length, 1);
  assert.deepEqual([merged[0].fromMs, merged[0].toMs], [0, 150]);
});

test("SIGN_LORD คลาสสิก — กุมภ์=เสาร์ (ไม่ใช่ราหูแบบธรรมเนียมไทย — จงใจ ตามระบบ Jyotish)", () => {
  assert.equal(SIGN_LORD[10], "saturn");
  assert.equal(SIGN_LORD[0], "mars");
  assert.equal(SIGN_LORD[11], "jupiter");
  const lords = new Set(SIGN_LORD);
  assert.ok(!lords.has("rahu" as Graha) && !lords.has("ketu" as Graha), "ราหู/เกตุไม่เป็นเจ้าเรือนในระบบนี้");
});
