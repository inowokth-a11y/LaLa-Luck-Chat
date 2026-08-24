/**
 * ทักษาปกรณ์ตั้งชื่อ (อักษรวรรค 8 ภูมิตามวันเกิด) — รอบ 4 แผนแม่บท Jyotish (24 ส.ค. 2569)
 * เสริมชั้นเลขศาสตร์ (ตาราง ทาง ค ที่ยืนยันแล้ว) — **คนละระบบกัน อ่านแยกชั้น ห้ามปนตาราง**
 *
 * แหล่งกฎ (งานวิจัย cross-check 4 แหล่งไทย: บุญบารมี · TheLuckyName · Sanook · MThai):
 * - อักษร 8 วรรคตามดาวเจ้าของวรรค (ตารางล่าง — ทุกแหล่งตรงกัน)
 * - กฎหมุนมหาทักษาตามเข็ม: อาทิตย์→จันทร์→อังคาร→พุธ→เสาร์→พฤหัส→ราหู→ศุกร์ วน ·
 *   บริวาร = วรรคของดาววันเกิดเอง แล้วไล่ อายุ เดช ศรี มูละ อุตสาหะ มนตรี กาลกิณี
 * - ✅ ตาราง 8×8 ที่ generate จากกฎนี้ ตรงกับตารางเผยแพร่คำต่อคำ และช่องกาลกิณีตรงกับ
 *   ลิสต์กาลกิณีอิสระของ Sanook ครบ 8/8 (validation ไขว้)
 * - กฎเหล็กสากล: ห้ามอักษรวรรคกาลกิณีในชื่อ · ธรรมเนียม: ชายเน้นเดชนำ หญิงเน้นศรีนำ
 *
 * 🔴 ธรรมเนียมที่เลือก (สำนักไม่ตรงกัน — ประกาศใน caveat):
 * - ไม้หันอากาศ (ั) การันต์ (์) วรรณยุกต์: ไม่นับทักษา (ตามบุญบารมีที่ระบุชัด)
 * - ฤ นับกลุ่มอาทิตย์ (ตาม Sanook — บางแหล่งไม่กล่าวถึง)
 * - พุธกลางคืน = เกิดวันพุธ เวลา ≥18:00 (สำนักต่างกันเรื่องนาที) · ก่อนรุ่งเช้าวันพฤหัสระบบนับ
 *   เป็นพฤหัสตามวันปฏิทิน เพื่อความสอดคล้องกับทุกชั้นเดิมของระบบ (ธรรมเนียมโหรนับเป็นคืนพุธ)
 * - ⚠️ "อ" อยู่กลุ่มสระ (อาทิตย์) ในทักษา แต่อยู่กลุ่ม 6 ในตารางเลขศาสตร์ — คนละระบบ ห้าม cross-wire
 */

export type TaksaPlanet = "sun" | "moon" | "mars" | "mercury" | "saturn" | "jupiter" | "rahu" | "venus";

export const TAKSA_PLANET_TH: Record<TaksaPlanet, string> = {
  sun: "อาทิตย์", moon: "จันทร์", mars: "อังคาร", mercury: "พุธ",
  saturn: "เสาร์", jupiter: "พฤหัสบดี", rahu: "ราหู (พุธกลางคืน)", venus: "ศุกร์",
};

/** อักษรประจำวรรค (อาทิตย์ = อ + สระ — ไม่รวม ั ์ วรรณยุกต์ ตามธรรมเนียมที่เลือก) */
export const TAKSA_LETTERS: Record<TaksaPlanet, string> = {
  sun: "อะาำิีึืุูเแโใไฤ",
  moon: "กขคฆง",
  mars: "จฉชซฌญ",
  mercury: "ฎฏฐฑฒณ",
  saturn: "ดตถทธน",
  jupiter: "บปผฝพฟภม",
  rahu: "ยรลว",
  venus: "ศษสหฬฮ",
};

/** วงมหาทักษาตามเข็ม (ตำแหน่งบริวาร→กาลกิณี) */
const CIRCLE: TaksaPlanet[] = ["sun", "moon", "mars", "mercury", "saturn", "jupiter", "rahu", "venus"];

export const BHUMI_TH = ["บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี"] as const;
export type Bhumi = (typeof BHUMI_TH)[number];

export const BHUMI_MEANING_TH: Record<Bhumi, string> = {
  บริวาร: "บุตร คู่ครอง มิตรบริวาร ผู้ใต้บังคับบัญชา",
  อายุ: "ความเป็นอยู่ ความราบรื่นของชีวิต",
  เดช: "อำนาจวาสนา บารมี เกียรติยศ ชื่อเสียง",
  ศรี: "สิริมงคล โชคลาภ ทรัพย์ เสน่ห์เมตตา",
  มูละ: "หลักทรัพย์ มรดก ฐานะความมั่นคง",
  อุตสาหะ: "ความเพียร ความคิดริเริ่ม ความอดทน",
  มนตรี: "ผู้อุปถัมภ์ ผู้ใหญ่เมตตา ความสำเร็จโดยมีผู้หนุน",
  กาลกิณี: "อุปสรรค ศัตรู สิ่งไม่เป็นมงคล — วรรคที่ห้ามใช้ในชื่อ",
};

/** วันเกิดไทย → ดาวทักษา (พุธ + เวลา ≥18:00 → ราหู) */
export function taksaDayPlanet(dayTh: string, birthTime?: string | null): TaksaPlanet | null {
  const base: Record<string, TaksaPlanet> = {
    อาทิตย์: "sun", จันทร์: "moon", อังคาร: "mars", พุธ: "mercury",
    พฤหัสบดี: "jupiter", ศุกร์: "venus", เสาร์: "saturn",
  };
  const p = base[dayTh];
  if (!p) return null;
  if (p === "mercury" && birthTime && /^\d{2}:\d{2}/.test(birthTime)) {
    const h = Number(birthTime.slice(0, 2));
    if (h >= 18) return "rahu";
  }
  return p;
}

/** ผังทักษาของวันเกิด: ภูมิ → ดาวเจ้าวรรค (generate จากกฎหมุน — validate ไขว้ 8/8 แล้ว) */
export function taksaChart(dayPlanet: TaksaPlanet): Record<Bhumi, TaksaPlanet> {
  const start = CIRCLE.indexOf(dayPlanet);
  const out = {} as Record<Bhumi, TaksaPlanet>;
  BHUMI_TH.forEach((b, i) => {
    out[b] = CIRCLE[(start + i) % 8];
  });
  return out;
}

export const TAKSA_CAVEAT =
  "ทักษาปกรณ์เป็นชั้นอักษรวรรคตามวันเกิด (คนละระบบกับชั้นเลขศาสตร์/ธาตุชื่อ — อ่านแยกชั้น) · " +
  "ธรรมเนียมที่ระบบเลือก: ไม้หันอากาศ/การันต์/วรรณยุกต์ไม่นับทักษา · ฤ นับกลุ่มสระ · " +
  "พุธกลางคืนเริ่ม 18:00 (สำนักต่างกันเรื่องนาที)";

export interface TaksaNameResult {
  dayPlanetTh: string;
  /** วรรคกาลกิณีของวันเกิด (อักษรห้ามใช้) */
  kalakini: { planetTh: string; letters: string };
  /** อักษรในชื่อที่ตกวรรคกาลกิณี — มี = ตำราถือว่าควรปรับชื่อ */
  kalakiniChars: string[];
  /** ภูมิ → อักษรของชื่อที่ตกในวรรคนั้น (เฉพาะภูมิที่พบ) */
  breakdown: { bhumi: Bhumi; planetTh: string; chars: string[]; meaningTh: string }[];
  /** ภูมิของอักษรนำชื่อ (อักษรตัวแรกที่จำแนกได้) */
  leadBhumi: Bhumi | null;
  /** คำแนะนำอักษรนำตามเพศ (ธรรมเนียม: ชายเน้นเดช หญิงเน้นศรี) — ให้เมื่อระบุเพศ */
  leadAdviceTh: string | null;
  verdictTh: string;
  /** อักษรแนะนำ: วรรคเดช/ศรี/มนตรี ของวันเกิดนี้ (ใช้ประกอบตั้งชื่อใหม่) */
  suggestLetters: { bhumi: Bhumi; letters: string }[];
  caveats: string[];
}

/** วิเคราะห์ชื่อตามทักษาปกรณ์ของวันเกิด */
export function analyzeNameTaksa(
  name: string,
  dayTh: string,
  opts?: { birthTime?: string | null; gender?: string | null }
): TaksaNameResult | null {
  const dp = taksaDayPlanet(dayTh, opts?.birthTime);
  if (!dp) return null;
  const chart = taksaChart(dp);
  const planetOfChar = (ch: string): TaksaPlanet | null => {
    for (const p of CIRCLE) if (TAKSA_LETTERS[p].includes(ch)) return p;
    return null;
  };
  const bhumiOfPlanet = new Map<TaksaPlanet, Bhumi>();
  (Object.entries(chart) as [Bhumi, TaksaPlanet][]).forEach(([b, p]) => bhumiOfPlanet.set(p, b));

  const byBhumi = new Map<Bhumi, string[]>();
  const kalakiniChars: string[] = [];
  let leadBhumi: Bhumi | null = null;
  for (const ch of name.replace(/\s/g, "")) {
    const p = planetOfChar(ch);
    if (!p) continue; // ั ์ วรรณยุกต์ อักษรนอกระบบ — ไม่นับ (ธรรมเนียมที่เลือก)
    const b = bhumiOfPlanet.get(p)!;
    if (leadBhumi === null) leadBhumi = b;
    if (b === "กาลกิณี") kalakiniChars.push(ch);
    byBhumi.set(b, [...(byBhumi.get(b) ?? []), ch]);
  }

  const breakdown = BHUMI_TH.filter((b) => byBhumi.has(b)).map((b) => ({
    bhumi: b,
    planetTh: TAKSA_PLANET_TH[chart[b]],
    chars: byBhumi.get(b)!,
    meaningTh: BHUMI_MEANING_TH[b],
  }));

  const gender = opts?.gender ?? null;
  const leadTarget: Bhumi | null = gender === "male" ? "เดช" : gender === "female" ? "ศรี" : null;
  const leadAdviceTh = leadTarget
    ? leadBhumi === leadTarget
      ? `อักษรนำชื่ออยู่ภูมิ${leadTarget}ตรงตามธรรมเนียม (${gender === "male" ? "ชายเน้นเดช" : "หญิงเน้นศรี"})`
      : `ธรรมเนียมนิยม${gender === "male" ? "ชายขึ้นต้นด้วยอักษรภูมิเดช" : "หญิงขึ้นต้นด้วยอักษรภูมิศรี"} (${TAKSA_LETTERS[chart[leadTarget]]}) — ชื่อนี้ขึ้นต้นภูมิ${leadBhumi ?? "-"} (ไม่ใช่ข้อห้าม เป็นความนิยม)`
    : null;

  const verdictTh =
    kalakiniChars.length > 0
      ? `พบอักษรวรรคกาลกิณี ${kalakiniChars.join(" ")} — ตำราทักษาถือเป็นวรรคห้ามใช้สำหรับคนเกิดวัน${dayTh} ควรพิจารณาปรับ`
      : `ไม่มีอักษรกาลกิณี — ผ่านกฎหลักของทักษาปกรณ์${breakdown.length ? ` · ภูมิเด่นในชื่อ: ${breakdown.map((x) => x.bhumi).join("/")}` : ""}`;

  return {
    dayPlanetTh: TAKSA_PLANET_TH[dp],
    kalakini: { planetTh: TAKSA_PLANET_TH[chart.กาลกิณี], letters: TAKSA_LETTERS[chart.กาลกิณี] },
    kalakiniChars,
    breakdown,
    leadBhumi,
    leadAdviceTh,
    verdictTh,
    suggestLetters: (["เดช", "ศรี", "มนตรี"] as Bhumi[]).map((b) => ({ bhumi: b, letters: TAKSA_LETTERS[chart[b]] })),
    caveats: [TAKSA_CAVEAT],
  };
}
