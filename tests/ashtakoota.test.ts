// เทสต์ Ashtakoota 36 คะแนน (รอบ 3 แผน Jyotish — 24 ส.ค. 2569) — ล็อกตารางจากงานวิจัย
import { test } from "node:test";
import assert from "node:assert";
import { ashtakoota, vashyaGroup, ASHTAKOOTA_CAVEAT } from "../lib/engine/ashtakoota";

const NAK_W = 360 / 27;
const nakMid = (no: number) => (no - 1) * NAK_W + NAK_W / 2; // กลางนักษัตรที่ no (1-27)

test("นักษัตรเดียวกัน = 28/36 (ผลอ้างอิงที่รู้กันทั่วไป: ทุกกูฏเต็มยกเว้นนาฑีโทษ 0)", () => {
  const r = ashtakoota(nakMid(1), nakMid(1)); // อัศวินีคู่อัศวินี
  assert.equal(r.total, 28);
  const byKey = Object.fromEntries(r.kootas.map((k) => [k.key, k.got]));
  assert.deepEqual(byKey, { varna: 1, vashya: 2, tara: 3, yoni: 4, maitri: 5, gana: 6, bhakoot: 7, nadi: 0 });
  assert.ok(r.doshaFlags.some((f) => f.includes("นาฑีโทษ")));
  assert.ok(r.caveats.includes(ASHTAKOOTA_CAVEAT));
});

test("ตารา — เศษ 3/5/7 = 0 ต่อทิศ · นับรวม (inclusive)", () => {
  // อัศวินี(1) → กฤติกา(3): d=3 r=3 → 0 · กลับทาง กฤติกา→อัศวินี: d=26 r=8 → 1.5
  const r = ashtakoota(nakMid(1), nakMid(3));
  assert.equal(r.kootas.find((k) => k.key === "tara")!.got, 1.5);
});

test("โยนิ — คู่ศัตรู 7 คู่ = 0 (ตรงทุกแหล่ง): ม้า-กระบือ · แมว-หนู · โค-เสือ", () => {
  // อัศวินี(ม้า) × หัสตะ(กระบือ 13)
  assert.equal(ashtakoota(nakMid(1), nakMid(13)).kootas.find((k) => k.key === "yoni")!.got, 0);
  // ปุนัพสุ(แมว 7) × มาฆะ(หนู 10)
  assert.equal(ashtakoota(nakMid(7), nakMid(10)).kootas.find((k) => k.key === "yoni")!.got, 0);
  // อุตรผลคุนี(โค 12) × จิตรา(เสือ 14)
  assert.equal(ashtakoota(nakMid(12), nakMid(14)).kootas.find((k) => k.key === "yoni")!.got, 0);
});

test("คระหะไมตรี — matrix ตรงสูตร BPHS: ศุกร์↔อาทิตย์=0 · อังคาร↔พฤหัส=5 · จันทร์↔พุธ=1", () => {
  // ราศีจันทร์: พฤษภ(ศุกร์) × สิงห์(อาทิตย์) — เลือกนักษัตรกลางราศี
  const lonTaurus = 30 + 15, lonLeo = 120 + 15;
  assert.equal(ashtakoota(lonTaurus, lonLeo).kootas.find((k) => k.key === "maitri")!.got, 0);
  // เมษ(อังคาร) × ธนู(พฤหัส)
  assert.equal(ashtakoota(15, 240 + 14).kootas.find((k) => k.key === "maitri")!.got, 5);
  // กรกฎ(จันทร์) × มิถุน(พุธ)
  assert.equal(ashtakoota(90 + 15, 60 + 15).kootas.find((k) => k.key === "maitri")!.got, 1);
});

test("คณะ — เทพ×มนุษย์=5 · เทพ×รากษส=1 · มนุษย์×รากษส=0 (แบบไม่ผูกทิศทาง)", () => {
  // อัศวินี(เทพ) × ภรณี(มนุษย์)
  assert.equal(ashtakoota(nakMid(1), nakMid(2)).kootas.find((k) => k.key === "gana")!.got, 5);
  // อัศวินี(เทพ) × กฤติกา(รากษส)
  assert.equal(ashtakoota(nakMid(1), nakMid(3)).kootas.find((k) => k.key === "gana")!.got, 1);
  // ภรณี(มนุษย์) × กฤติกา(รากษส) — สองทิศเท่ากัน
  assert.equal(ashtakoota(nakMid(2), nakMid(3)).kootas.find((k) => k.key === "gana")!.got, 0);
  assert.equal(ashtakoota(nakMid(3), nakMid(2)).kootas.find((k) => k.key === "gana")!.got, 0);
});

test("ภกูฏ — binary: 6/8 และ 2/12 = 0 + ธงโทษ · 1/7 = 7", () => {
  // เมษ × กันย์ = ตำแหน่ง 6 → 0
  const r68 = ashtakoota(15, 150 + 15);
  assert.equal(r68.kootas.find((k) => k.key === "bhakoot")!.got, 0);
  assert.ok(r68.doshaFlags.some((f) => f.includes("ภกูฏโทษ")));
  // เมษ × พฤษภ = 2/12 → 0
  assert.equal(ashtakoota(15, 30 + 15).kootas.find((k) => k.key === "bhakoot")!.got, 0);
  // เมษ × ตุลย์ = 7 → 7
  assert.equal(ashtakoota(15, 180 + 15).kootas.find((k) => k.key === "bhakoot")!.got, 7);
});

test("วัศยะ — ธนู/มังกรแบ่งครึ่งราศี + สิงห์(สัตว์ป่า)×อื่น = 0 ฝั่งตาราง", () => {
  assert.equal(vashyaGroup(8, 10), 1, "ธนูครึ่งแรก = มนุษย์");
  assert.equal(vashyaGroup(8, 20), 0, "ธนูครึ่งหลัง = จตุบาท");
  assert.equal(vashyaGroup(9, 10), 0, "มังกรครึ่งแรก = จตุบาท");
  assert.equal(vashyaGroup(9, 20), 2, "มังกรครึ่งหลัง = สัตว์น้ำ");
  assert.equal(vashyaGroup(4, 15), 3, "สิงห์ = สัตว์ป่า");
});

test("วรรณะ/วัศยะ มีทิศทาง — รู้บทบาทให้ผลต่างจากไม่รู้ (เฉลี่ยสองทิศ)", () => {
  // กรกฎ (วรรณะ rank 4) × เมษ (rank 3): ชาย=กรกฎ → ผ่าน 1 · ชาย=เมษ → 0 · ไม่รู้ → 0.5
  const lonCancer = 90 + 15, lonAries = 15;
  assert.equal(ashtakoota(lonCancer, lonAries, { aIsGroom: true }).kootas.find((k) => k.key === "varna")!.got, 1);
  assert.equal(ashtakoota(lonCancer, lonAries, { aIsGroom: false }).kootas.find((k) => k.key === "varna")!.got, 0);
  assert.equal(ashtakoota(lonCancer, lonAries).kootas.find((k) => k.key === "varna")!.got, 0.5);
  assert.ok(ashtakoota(lonCancer, lonAries).caveats.some((c) => c.includes("ค่าเฉลี่ยสองทิศทาง")));
});

test("กรอบการเล่า — ไม่มีคำแพทย์/บุตร/ชื่อชั้นวรรณะเชิงสังคมในทุก string", () => {
  const r = ashtakoota(nakMid(5), nakMid(20), { noBirthTime: true });
  const all = JSON.stringify(r);
  for (const w of ["พราหมณ์", "ศูทร", "กษัตริย์", "แพศย์", "บุตร", "สุขภาพ", "โรค", "ตาย"]) {
    assert.ok(!all.includes(w), `พบคำต้องห้าม: ${w}`);
  }
  assert.ok(r.caveats.some((c) => c.includes("เที่ยงวัน")), "caveat ไม่มีเวลาเกิด");
});
