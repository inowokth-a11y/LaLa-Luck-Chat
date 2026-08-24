/**
 * Ashtakoota (Guna Milan) — คะแนนคู่ 36 จากดวงจันทร์สองฝ่าย · รอบ 3 แผน Jyotish 4 โหมด (24 ส.ค. 2569)
 * ใช้กับโหมด match เนื้อคู่ + /compatibility ประเภทบุคคล — ชั้นเสริมสากล (ระบบเหนือ-อินเดีย)
 *
 * แหล่งกฎ (งานวิจัย cross-check ≥2 แหล่ง/ตาราง — รายงานเต็มในบทสนทนา): Drik Panchang ·
 * Saravali · mPanchang · JagannathHora · FindYourFate ฯลฯ — คะแนนเต็ม วรรณะ1 วัศยะ2 ตารา3
 * โยนิ4 คระหะไมตรี5 คณะ6 ภกูฏ7 นาฑี8 = 36 (ทุกแหล่งตรงกัน)
 *
 * 🔴 ทางที่ล็อกไว้ในจุดที่สำนักไม่ตรงกัน (ประกาศใน caveat — ห้ามแก้โดยไม่บันทึกเหตุผล):
 * - วัศยะ: mapping ราศีตาม Drik Panchang (ธนู/มังกร แบ่งครึ่งราศีที่ 15°) · matrix แบบ Saravali
 * - ตารา: กฎเศษ 3/5/7 = 0 (สายหลัก — ตรงชื่อตาราคลาสสิก) ไม่ใช่สายเศษคู่/คี่
 * - คณะ: ตาราง 6/5/1/0 แบบไม่ผูกทิศทาง (สำนักที่ผูกเพศให้ค่ากลับด้านกันเอง — เลือกแบบกลาง)
 * - คระหะไมตรี: สเกล 5/4/3/1/0.5/0 (มาตรฐานซอฟต์แวร์) · matrix 7×7 ตรวจแล้วตรงสูตร BPHS
 * - โยนิ: matrix 14×14 ฉบับ consensus (2 แหล่งเต็มต่างกัน 3 ช่อง — ซ่อมด้วยสมมาตร) ·
 *   คู่ศัตรู 7 คู่ทุกแหล่งตรงกัน
 * - นาฑี: 0/8 ไม่ทำกฎยกเว้น (cancellation) — บอกใน caveat
 * - วรรณะ/วัศยะ เป็นเกณฑ์มีทิศทางตามธรรมเนียม: รู้บทบาท → ใช้ทิศทางคลาสสิก ·
 *   ไม่รู้ → ใช้ค่าเฉลี่ยสองทิศทาง (การรวมที่ประกาศ ไม่ใช่ตารางใหม่)
 *
 * 🔴 กรอบการเล่า: ห้ามใช้ชื่อชั้นวรรณะเชิงสังคม (เก็บเป็นกลุ่มธาตุ) · นาฑี = "ความเข้ากันเชิง
 * พลังชีวิต" ห้ามคำแพทย์/บุตร · เป็นชั้นคัดกรองจากดวงจันทร์เท่านั้น ไม่ใช่คำตัดสินความสัมพันธ์
 *
 * ✅ ดาราศาสตร์: ใช้ลองจิจูดจันทร์นิรายนะที่ verify แล้ว (นักษัตรตรง Swiss Ephemeris 324/324)
 */

import { NAKSHATRA_TH } from "./jyotish";

const pymod = (a: number, n: number) => ((a % n) + n) % n;
const NAK_W = 360 / 27;

// ---------------------------------------------------------------------------
// ตาราง mapping (นักษัตร index 0-26 · ราศี index 0-11 เมษ=0)
// ---------------------------------------------------------------------------

/** โยนิ 14 สัตว์ — ลำดับ: ม้า ช้าง แพะ งู สุนัข แมว หนู โค กระบือ เสือ กวาง วานร พังพอน สิงห์ */
export const YONI_TH = [
  "ม้า", "ช้าง", "แพะ", "งู", "สุนัข", "แมว", "หนู", "โค", "กระบือ", "เสือ", "กวาง", "วานร", "พังพอน", "สิงห์",
] as const;

/** นักษัตรที่ i (0-26) → โยนิ index */
const NAK_YONI = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];

/** matrix โยนิ 14×14 (สมมาตร — consensus จาก Saravali + Mohit Mrinal) */
const YONI_MATRIX = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 2],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [1, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 2, 4],
];

/** คณะ: 0=เทพ 1=มนุษย์ 2=รากษส (นักษัตร index 0-26) */
const NAK_GANA = [
  0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0,
];
export const GANA_TH = ["เทพ", "มนุษย์", "รากษส"] as const;
const GANA_MATRIX = [
  [6, 5, 1],
  [5, 6, 0],
  [1, 0, 6],
];

/** นาฑี: 0=อาทิ 1=มัธยะ 2=อันตยะ */
const NAK_NADI = [
  0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2,
];
export const NADI_TH = ["อาทิ", "มัธยะ", "อันตยะ"] as const;

/** วรรณะ: rank 4-1 ตามราศีจันทร์ (เล่าเป็น "กลุ่มธาตุจิตใจ" ห้ามใช้ชื่อชั้นวรรณะเชิงสังคม) */
const SIGN_VARNA_RANK = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]; // เมษ→มีน
const VARNA_GROUP_TH = ["", "สายลม (ความคิด)", "สายดิน (การลงมือ)", "สายไฟ (พลังนำ)", "สายน้ำ (ความลึกซึ้ง)"];

/** วัศยะ: 0=จตุบาท 1=มนุษย์ 2=สัตว์น้ำ 3=สัตว์ป่า 4=แมลง (ธนู/มังกรแบ่งครึ่งราศี) */
export function vashyaGroup(signIdx: number, degInSign: number): number {
  switch (signIdx) {
    case 0: case 1: return 0;
    case 8: return degInSign < 15 ? 1 : 0;
    case 9: return degInSign < 15 ? 0 : 2;
    case 2: case 5: case 6: case 10: return 1;
    case 3: case 11: return 2;
    case 4: return 3;
    case 7: return 4;
    default: return 1;
  }
}
export const VASHYA_TH = ["จตุบาท", "มนุษย์", "สัตว์น้ำ", "สัตว์ป่า", "แมลง"] as const;
/** matrix วัศยะ (แถว=ฝ่ายหญิง คอลัมน์=ฝ่ายชาย — แบบ Saravali) */
const VASHYA_MATRIX = [
  [2, 0, 0, 0.5, 0],
  [1, 2, 1, 0.5, 1],
  [0.5, 1, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];

/** เจ้าเรือนราศี (index ดาว: 0อาทิตย์ 1จันทร์ 2อังคาร 3พุธ 4พฤหัส 5ศุกร์ 6เสาร์) */
const SIGN_LORD7 = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
/** matrix คระหะไมตรี 7×7 (ตรวจแล้วตรงสูตร BPHS + สเกล 5/4/3/1/0.5/0) */
const MAITRI_MATRIX = [
  [5, 5, 5, 4, 5, 0, 0],
  [5, 5, 4, 1, 4, 0.5, 0.5],
  [5, 4, 5, 0.5, 5, 3, 0.5],
  [4, 1, 0.5, 5, 0.5, 5, 4],
  [5, 4, 5, 0.5, 5, 0.5, 3],
  [0, 0.5, 3, 5, 0.5, 5, 5],
  [0, 0.5, 0.5, 4, 3, 5, 5],
];

// ---------------------------------------------------------------------------
// ผลลัพธ์
// ---------------------------------------------------------------------------

export interface KootaScore {
  key: string;
  nameTh: string;
  got: number;
  max: number;
  noteTh: string;
}

export interface AshtakootaResult {
  total: number;
  max: 36;
  bandTh: string;
  kootas: KootaScore[];
  /** โทษที่ธรรมเนียมให้ธงแยกแม้คะแนนรวมผ่าน (นาฑี=0 / ภกูฏ=0) */
  doshaFlags: string[];
  aNakshatraTh: string;
  bNakshatraTh: string;
  caveats: string[];
}

export const ASHTAKOOTA_CAVEAT =
  "คะแนนคู่ 36 (Ashtakoota) เป็นชั้น Jyotish สากลระบบเหนือ-อินเดีย — ชั้นคัดกรองจากตำแหน่ง" +
  "ดวงจันทร์สองฝ่ายเท่านั้น ไม่ใช่คำตัดสินความสัมพันธ์จริง (ธรรมเนียมเดิมใช้ประกอบการดูดวงเต็มใบ" +
  "หลายชั้น ซึ่งระบบไม่ได้ทำทั้งหมด) · บางกูฏสำนักให้คะแนนย่อยต่างกัน — ระบบล็อกทางที่ประกาศไว้" +
  "ทางเดียว · ไม่เฉลี่ยรวมกับคะแนนธาตุ/5 ด้านของระบบเดิม (คนละระบบ อ่านแยกชั้น)";

export const ASHTAKOOTA_NO_TIME_CAVEAT =
  "ไม่มีเวลาเกิด — ใช้ตำแหน่งดวงจันทร์ ณ เที่ยงวัน: วันที่ดวงจันทร์ย้ายนักษัตร ผลอาจคลาดได้";

function band(total: number): string {
  if (total < 18) return "ต่ำกว่าเกณฑ์ดั้งเดิม (ตำราเดิมถือว่าต้องดูแลกันมากเป็นพิเศษ — ไม่ใช่คำตัดสิน)";
  if (total <= 24) return "พอใช้ — อยู่ในเกณฑ์ยอมรับได้ ต้องอาศัยความเข้าใจกัน";
  if (total <= 32) return "ดีมาก — พลังงานสองฝ่ายเกื้อกันหลายชั้น";
  return "ดีเยี่ยม — เข้ากันสูงเป็นพิเศษตามเกณฑ์ดั้งเดิม";
}

/**
 * คะแนนคู่ 36 จากลองจิจูดจันทร์นิรายนะสองฝ่าย
 * @param opts.aIsGroom true = A เป็นฝ่ายชาย · false = A เป็นฝ่ายหญิง · null/undefined =
 *        ไม่ทราบบทบาท → กูฏมีทิศทาง (วรรณะ/วัศยะ) ใช้ค่าเฉลี่ยสองทิศทาง (ประกาศใน caveat)
 */
export function ashtakoota(
  moonLonA: number,
  moonLonB: number,
  opts?: { aIsGroom?: boolean | null; noBirthTime?: boolean }
): AshtakootaResult {
  const lonA = pymod(moonLonA, 360);
  const lonB = pymod(moonLonB, 360);
  const nakA = Math.floor(lonA / NAK_W);
  const nakB = Math.floor(lonB / NAK_W);
  const signA = Math.floor(lonA / 30);
  const signB = Math.floor(lonB / 30);
  const degA = lonA - signA * 30;
  const degB = lonB - signB * 30;
  const role = opts?.aIsGroom ?? null;

  // 1. วรรณะ (1) — ทิศทาง: เจ้าบ่าว rank ≥ เจ้าสาว
  const rA = SIGN_VARNA_RANK[signA];
  const rB = SIGN_VARNA_RANK[signB];
  const varnaDir = (groomRank: number, brideRank: number) => (groomRank >= brideRank ? 1 : 0);
  const varna =
    role === true ? varnaDir(rA, rB) : role === false ? varnaDir(rB, rA) : (varnaDir(rA, rB) + varnaDir(rB, rA)) / 2;

  // 2. วัศยะ (2) — matrix แถว=หญิง คอลัมน์=ชาย
  const vA = vashyaGroup(signA, degA);
  const vB = vashyaGroup(signB, degB);
  const vashya =
    role === true ? VASHYA_MATRIX[vB][vA] : role === false ? VASHYA_MATRIX[vA][vB] : (VASHYA_MATRIX[vB][vA] + VASHYA_MATRIX[vA][vB]) / 2;

  // 3. ตารา (3) — นับรวมสองทิศ เศษ 3/5/7 = 0
  const taraDir = (from: number, to: number) => {
    const d = pymod(to - from, 27) + 1;
    const r = d % 9;
    return r === 3 || r === 5 || r === 7 ? 0 : 1.5;
  };
  const tara = taraDir(nakA, nakB) + taraDir(nakB, nakA);

  // 4. โยนิ (4)
  const yA = NAK_YONI[nakA];
  const yB = NAK_YONI[nakB];
  const yoni = YONI_MATRIX[yA][yB];

  // 5. คระหะไมตรี (5)
  const lA = SIGN_LORD7[signA];
  const lB = SIGN_LORD7[signB];
  const maitri = MAITRI_MATRIX[lA][lB];

  // 6. คณะ (6) — แบบไม่ผูกทิศทาง
  const gA = NAK_GANA[nakA];
  const gB = NAK_GANA[nakB];
  const gana = GANA_MATRIX[gA][gB];

  // 7. ภกูฏ (7) — binary: ตำแหน่งร่วม 2/12, 5/9, 6/8 = 0
  const dist = pymod(signB - signA, 12) + 1;
  const bhakootBad = [2, 12, 5, 9, 6, 8].includes(dist);
  const bhakoot = bhakootBad ? 0 : 7;

  // 8. นาฑี (8) — นาฑีเดียวกัน = 0
  const nA = NAK_NADI[nakA];
  const nB = NAK_NADI[nakB];
  const nadi = nA === nB ? 0 : 8;

  const kootas: KootaScore[] = [
    {
      key: "varna", nameTh: "วรรณะ (แนวทางจิตใจ)", got: varna, max: 1,
      noteTh: `${VARNA_GROUP_TH[rA]} ↔ ${VARNA_GROUP_TH[rB]}`,
    },
    {
      key: "vashya", nameTh: "วัศยะ (แรงดึงดูดต่อกัน)", got: vashya, max: 2,
      noteTh: `${VASHYA_TH[vA]} ↔ ${VASHYA_TH[vB]}`,
    },
    {
      key: "tara", nameTh: "ตารา (จังหวะดวงเกื้อกัน)", got: tara, max: 3,
      noteTh: tara === 3 ? "จังหวะนักษัตรเกื้อกันทั้งสองทาง" : tara === 0 ? "จังหวะนักษัตรต้องอาศัยการปรับตัวทั้งสองทาง" : "เกื้อกันทางเดียว อีกทางต้องปรับตัว",
    },
    {
      key: "yoni", nameTh: "โยนิ (เคมีสัญชาตญาณ)", got: yoni, max: 4,
      noteTh: `${YONI_TH[yA]} ↔ ${YONI_TH[yB]}${yoni === 0 ? " (คู่ธาตุสัตว์ที่ตำราว่าต้องดูแลกันมาก)" : ""}`,
    },
    {
      key: "maitri", nameTh: "คระหะไมตรี (มิตรภาพดาวเจ้าราศี)", got: maitri, max: 5,
      noteTh: `เจ้าเรือนจันทร์สองฝ่าย${maitri >= 4 ? "เป็นมิตรกัน" : maitri >= 3 ? "โทนกลาง" : "ต่างขั้ว — ต้องอาศัยความเข้าใจ"}`,
    },
    {
      key: "gana", nameTh: "คณะ (จริตพื้นฐาน)", got: gana, max: 6,
      noteTh: `${GANA_TH[gA]} ↔ ${GANA_TH[gB]}`,
    },
    {
      key: "bhakoot", nameTh: "ภกูฏ (ตำแหน่งราศีร่วม)", got: bhakoot, max: 7,
      noteTh: bhakootBad ? `ราศีร่วมตำแหน่ง ${dist}/${14 - dist} — ตำราถือเป็นจุดต้องดูแล (ภกูฏโทษ)` : "ตำแหน่งราศีเกื้อกัน",
    },
    {
      key: "nadi", nameTh: "นาฑี (พลังชีวิต)", got: nadi, max: 8,
      noteTh: nA === nB ? `นาฑี${NADI_TH[nA]}เหมือนกัน — ตำราถือเป็นจุดต้องดูแล (นาฑีโทษ)` : `นาฑี${NADI_TH[nA]} ↔ ${NADI_TH[nB]} เสริมกัน`,
    },
  ];

  const total = kootas.reduce((s, k) => s + k.got, 0);
  const doshaFlags: string[] = [];
  if (nadi === 0) doshaFlags.push("นาฑีโทษ — ความเข้ากันเชิงพลังชีวิตเป็นจุดต้องดูแล (ตำราเดิมมีกฎยกเว้นหลายข้อที่ระบบไม่ได้ตรวจ)");
  if (bhakootBad) doshaFlags.push("ภกูฏโทษ — ตำแหน่งราศีร่วมเป็นจุดต้องดูแล");

  const caveats = [ASHTAKOOTA_CAVEAT];
  if (role === null) caveats.push("ไม่ทราบบทบาทสองฝ่าย — กูฏที่มีทิศทาง (วรรณะ/วัศยะ) ใช้ค่าเฉลี่ยสองทิศทาง");
  if (opts?.noBirthTime) caveats.push(ASHTAKOOTA_NO_TIME_CAVEAT);

  return {
    total, max: 36, bandTh: band(total), kootas, doshaFlags,
    aNakshatraTh: NAKSHATRA_TH[nakA], bNakshatraTh: NAKSHATRA_TH[nakB],
    caveats,
  };
}
