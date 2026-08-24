// เทสต์ฤกษ์บน (นพเคราะห์ฤกษ์ทั้ง 9) — ล็อกกฎจากงานวิจัย 24 ส.ค. 2569 (cross-check ≥3 แหล่ง)
import { test } from "node:test";
import assert from "node:assert";
import { RERK_GROUPS, RERK_NAK_TH, RERK_CAVEAT, moonRerkForDay } from "../lib/engine/rerk";
import { moonNakshatra } from "../lib/engine/jyotish";
import { moonEclipticLongitude } from "../lib/engine/daily";
import { lahiriAyanamsa } from "../lib/engine/ascendant";
import { rankAuspiciousDays } from "../lib/engine/timing";

test("โครงตาราง — 27 นักษัตร + 9 กลุ่มวงจรตามลำดับตำรา (ทลิทโท→…→สมโณ)", () => {
  assert.equal(RERK_NAK_TH.length, 27);
  assert.equal(RERK_GROUPS.length, 9);
  const order = ["ทลิทโทฤกษ์", "มหัทธโนฤกษ์", "โจโรฤกษ์", "ภูมิปาโลฤกษ์", "เทศาตรีฤกษ์", "เทวีฤกษ์", "เพชฌฆาตฤกษ์", "ราชาฤกษ์", "สมโณฤกษ์"];
  assert.deepEqual(RERK_GROUPS.map((g) => g.nameTh), order, "ลำดับกลุ่มต้องตรงตำรา — กลุ่ม k = ฤกษ์ k, k+9, k+18");
  // ตัวอย่างยึดจากแหล่ง: ฤกษ์ 1,10,19 = ทลิทโท (อัศวินี มาฆะ มูละ) · 8,17,26 = ราชา (ปุษยะ อนุราธะ อุตรภัทรบท)
  assert.equal(RERK_NAK_TH[0], "อัศวินี");
  assert.equal(RERK_NAK_TH[9], "มาฆะ");
  assert.equal(RERK_NAK_TH[18], "มูละ");
  assert.equal(RERK_NAK_TH[7], "ปุษยะ");
  assert.equal(RERK_NAK_TH[16], "อนุราธะ");
  assert.equal(RERK_NAK_TH[25], "อุตรภัทรบท");
});

test("ความเหมาะรายหมวด — ฉินทฤกษ์/พินทุฤกษ์เลี่ยงงานมงคล · มหัทธโน/ภูมิปาโลหนุนงานหลัก", () => {
  const g = Object.fromEntries(RERK_GROUPS.map((x) => [x.key, x]));
  // โจโร + เพชฌฆาต: ห้ามงานมงคลทุกหมวดหลัก (Sanook ระบุตรง)
  for (const k of ["choro", "phetchakhat"]) {
    for (const act of ["open_company", "car_registration", "housewarming", "general"]) {
      assert.equal(g[k].fits[act], "avoid", `${k} ต้อง avoid ${act}`);
    }
  }
  // เพชฌฆาต avoid เจรจาด้วย · โจโร conditional (เจรจาแตกหัก/คดี)
  assert.equal(g.phetchakhat.fits.negotiation, "avoid");
  assert.equal(g.choro.fits.negotiation, "conditional");
  // มหัทธโน + ภูมิปาโล: หนุนทุกหมวดหลัก
  for (const k of ["mahatthano", "bhumipalo"]) {
    for (const act of ["open_company", "car_registration", "housewarming", "negotiation", "general"]) {
      assert.equal(g[k].fits[act], "good", `${k} ต้อง good ${act}`);
    }
  }
  // เทศาตรี: เปิดกิจการแบบมีเงื่อนไข (ธุรกิจบริการ/บันเทิง) · เลี่ยงขึ้นบ้าน
  assert.equal(g.thesatri.fits.open_company, "conditional");
  assert.equal(g.thesatri.fits.housewarming, "avoid");
  // ราชาฤกษ์มีหมายเหตุ "สามัญชนควรเว้น" ตามบางตำรา
  assert.ok(g.racha.cautionTh?.includes("สามัญชน"));
  // hardAvoid: เฉพาะฉินทฤกษ์ (ทุกแหล่งตรงกัน "ห้ามงานมงคล") — เทศาตรีไม่ผลัก verdict (จูน 24 ส.ค. 2569)
  assert.ok(g.choro.hardAvoid && g.phetchakhat.hardAvoid);
  assert.ok(!g.thesatri.hardAvoid && !g.mahatthano.hardAvoid);
});

test("moonRerkForDay — นักษัตรตรงกับ moonNakshatra ของ jyotish (แหล่งดาราศาสตร์เดียวกัน)", () => {
  for (const [y, m, d] of [[2026, 8, 24], [2026, 12, 5], [2027, 3, 14]] as const) {
    const r = moonRerkForDay(y, m, d);
    const jd = Date.UTC(y, m - 1, d, 5) / 86400000 + 2440587.5;
    const lon = ((moonEclipticLongitude(jd) - lahiriAyanamsa(jd)) % 360 + 360) % 360;
    assert.equal(r.no, moonNakshatra(lon).idx + 1, "เลขฤกษ์ต้องตรงนักษัตร jyotish");
    assert.equal(r.group, RERK_GROUPS[(r.no - 1) % 9], "กลุ่ม = (ฤกษ์-1) mod 9");
    assert.ok(r.fitNoteTh.length > 10);
  }
});

test("จันทร์เสวย ~1 ฤกษ์/วัน — เดินหน้าไม่ข้ามเกิน 2 และครบรอบ ~27 วัน", () => {
  let prev = moonRerkForDay(2026, 9, 1).no;
  const seen = new Set([prev]);
  for (let i = 1; i <= 28; i++) {
    const d = new Date(Date.UTC(2026, 8, 1 + i));
    const cur = moonRerkForDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).no;
    const step = ((cur - prev) % 27 + 27) % 27;
    assert.ok(step >= 0 && step <= 2, `ก้าวต่อวันต้อง 0-2 ฤกษ์ (ได้ ${step})`);
    seen.add(cur);
    prev = cur;
  }
  assert.ok(seen.size >= 25, `28 วันควรเห็นเกือบครบ 27 ฤกษ์ (ได้ ${seen.size})`);
});

test("รวมเข้า rankAuspiciousDays — ทุกวันมี rerk · fit=avoid ลดคะแนน · caveat ฤกษ์บนติดเสมอ", () => {
  const { days, caveat } = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-30", emphasis: "thanchai", activityKey: "housewarming" });
  assert.equal(days.length, 30);
  for (const d of days) {
    assert.ok(d.rerk.no >= 1 && d.rerk.no <= 27);
    assert.ok(d.rerk.groupTh.endsWith("ฤกษ์"));
  }
  assert.ok(caveat.includes("ฤกษ์บน"), "caveat ประกาศชั้นฤกษ์บน");
  // คะแนน: เทียบวันเดียวกันสองหมวด — วันที่ฤกษ์ good สำหรับ housewarming แต่ avoid อีกหมวด ต้องต่างกัน
  const a = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-30", emphasis: "any", activityKey: "general" }).days;
  const b = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-30", emphasis: "any", activityKey: "open_company" }).days;
  const byIsoA = new Map(a.map((d) => [d.dateISO, d]));
  let diff = 0;
  for (const d of b) {
    const other = byIsoA.get(d.dateISO)!;
    if (d.score !== other.score) diff++;
  }
  assert.ok(diff > 0, "หมวดต่างกันต้องให้คะแนนบางวันต่างกัน (ฤกษ์เหมาะคนละหมวด)");
  assert.ok(RERK_CAVEAT.includes("เที่ยงวันไทย"));
});
