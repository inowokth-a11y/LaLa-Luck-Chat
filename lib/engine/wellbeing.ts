// แบบประเมินสุขภาวะ "LaLa Wellbeing Check" (สไลซ์ C — 2 ส.ค. 2569 ผู้ใช้อนุมัติ)
//
// 🔴 ที่มา: Satiya_KWI_KB.xlsx + Satiya_KWI_Scoring_Rules.json ของผู้ใช้ (KRUTH Wellbeing Index)
//    — คำถาม 25 ข้อ 5 มิติ ฐาน PERMA-V/SDT/PsyCap/Hope Theory · สูตรคะแนน/จำแนก pattern
//    ตรงต้นฉบับ · **เสียงบทพูดปรับจาก "ครับ/ผม" (Satiya) เป็นแม่หมอลาลา (ค่ะ/คะ)** เนื้อหาเดิม
//    · แบรนด์ตามผู้ใช้ตัดสิน: LaLa = สุขภาพใจที่มีความสุข · Lucky = โหราศาสตร์
//
// ⚠️ ไม่ใช่เครื่องมือวินิจฉัยทางการแพทย์ — เป็นแบบสำรวจเพื่อการดูแลตัวเอง (WELLBEING_CAVEAT
//    ต้องแสดงทุกจุด) · ห้ามคำคลินิกในทุกข้อความ (กติกา KB: โรค/ผิดปกติ/วินิจฉัย/อาการ)
// ⚠️ คะแนนดิบไม่แสดงผู้ใช้ — แสดงเป็น % และ badge (display_rules ต้นฉบับ)

export const KWI_DIMENSIONS = ["VITALITY", "MEANING", "CONNECTION", "MASTERY", "RESILIENCE"] as const;
export type KwiDimension = (typeof KWI_DIMENSIONS)[number];

export const KWI_DIMENSION_TH: Record<KwiDimension, string> = {
  VITALITY: "พลังชีวิต",
  MEANING: "ความหมาย",
  CONNECTION: "ความสัมพันธ์",
  MASTERY: "ความเชี่ยวชาญ",
  RESILIENCE: "ความยืดหยุ่น",
};

/** น้ำหนักมิติ (จาก dimensions.weight ต้นฉบับ) — ใช้ตอนรวม kwi_total */
export const KWI_DIMENSION_WEIGHT: Record<KwiDimension, number> = {
  VITALITY: 1.0,
  MEANING: 1.2,
  CONNECTION: 1.1,
  MASTERY: 1.1,
  RESILIENCE: 1.2,
};

export interface KwiQuestion {
  id: string;
  dimension: KwiDimension;
  text: string;
  /** ตัวเลือกเรียงตามลำดับ — likert = ป้าย 1..5 · choice = ตามต้นฉบับ */
  options: string[];
  /** คะแนนต่อตัวเลือก (index ตรงกับ options) · null = เก็บข้อมูลอย่างเดียว ไม่คิดคะแนน (V3) */
  scores: number[] | null;
  weight: number;
}

const L5 = (l1: string, l2: string, l3: string, l4: string, l5: string) => [l1, l2, l3, l4, l5];
const DIRECT = [1, 2, 3, 4, 5];
const REVERSE = [5, 4, 3, 2, 1];

/** คำถาม 25 ข้อ — ข้อความ/ตัวเลือก/คะแนน/น้ำหนัก ตรงต้นฉบับ (Questions sheet + choice_scoring) */
export const KWI_QUESTIONS: KwiQuestion[] = [
  { id: "V1", dimension: "VITALITY", text: "ในช่วง 2 สัปดาห์ที่ผ่านมา คุณรู้สึกมีพลังงานในการทำกิจกรรมที่สำคัญมากแค่ไหน?", options: L5("แทบไม่มีเลย", "น้อย", "ปานกลาง", "มาก", "มีล้นเหลือ"), scores: DIRECT, weight: 1.0 },
  { id: "V2", dimension: "VITALITY", text: "คุณนอนหลับแล้วตื่นมารู้สึกพักผ่อนเพียงพอบ่อยแค่ไหนในช่วงนี้?", options: L5("แทบไม่เคย", "บางครั้ง", "ครึ่งหนึ่ง", "บ่อย", "เกือบทุกวัน"), scores: DIRECT, weight: 1.0 },
  { id: "V3", dimension: "VITALITY", text: "ช่วงเวลาไหนของวันที่คุณรู้สึก 'เป็นตัวเอง' และมีพลังมากที่สุด?", options: ["เช้า (05-09น.)", "สาย (09-12น.)", "บ่าย (12-17น.)", "เย็น (17-20น.)", "กลางคืน (20น.+)"], scores: null, weight: 0 }, // เก็บข้อมูลเวลา ไม่คิดคะแนน (ต้นฉบับ: store_as_temporal_data_only)
  { id: "V4", dimension: "VITALITY", text: "ร่างกายของคุณ 'บ่น' อะไรบ่อยที่สุดช่วงนี้?", options: ["ปวดหัว", "เหนื่อยง่าย", "นอนไม่หลับ", "ปวดกล้ามเนื้อ", "ย่อยไม่ดี", "ไม่มีอะไรบ่น"], scores: [2.0, 2.0, 2.5, 2.5, 2.5, 5.0], weight: 0.8 },
  { id: "V5", dimension: "VITALITY", text: "เมื่อเทียบกับ 3 เดือนที่แล้ว พลังงานโดยรวมของคุณเป็นอย่างไร?", options: L5("แย่ลงมาก", "แย่ลงนิดหน่อย", "เหมือนเดิม", "ดีขึ้นนิดหน่อย", "ดีขึ้นมาก"), scores: DIRECT, weight: 1.2 },
  { id: "M1", dimension: "MEANING", text: "งานหรือกิจกรรมหลักของคุณให้ความรู้สึก 'มีความหมาย' มากแค่ไหน?", options: L5("ไม่รู้สึกเลย", "น้อย", "บ้าง", "มาก", "ลึกมาก"), scores: DIRECT, weight: 1.2 },
  { id: "M2", dimension: "MEANING", text: "คุณรู้ชัดเจนไหมว่า 'ทำไม' ถึงทำสิ่งที่ทำอยู่ทุกวัน?", options: L5("ไม่รู้เลย", "รู้บ้าง", "รู้พอสมควร", "รู้ชัด", "รู้ชัดมาก"), scores: DIRECT, weight: 1.2 },
  { id: "M3", dimension: "MEANING", text: "ในช่วงสัปดาห์ที่ผ่านมา มีกิจกรรมไหนที่ทำแล้วลืมเวลาบ้างไหม?", options: ["ไม่มีเลย", "1-2 ครั้ง", "3-5 ครั้ง", "เกือบทุกวัน", "ทุกวัน"], scores: [1.0, 2.5, 3.5, 4.5, 5.0], weight: 1.0 },
  { id: "M4", dimension: "MEANING", text: "สิ่งที่คุณทำอยู่ตอนนี้สอดคล้องกับค่านิยมที่แท้จริงของคุณมากแค่ไหน?", options: L5("ขัดแย้งกันมาก", "ขัดแย้งบ้าง", "กลางๆ", "สอดคล้อง", "สอดคล้องมาก"), scores: DIRECT, weight: 1.3 },
  { id: "M5", dimension: "MEANING", text: "ถ้ามองย้อนหลัง 1 ปีที่ผ่านมา คุณภูมิใจกับสิ่งที่ทำมาแค่ไหน?", options: L5("ไม่ภูมิใจเลย", "น้อย", "พอใจ", "ภูมิใจ", "ภูมิใจมาก"), scores: DIRECT, weight: 1.0 },
  { id: "C1", dimension: "CONNECTION", text: "คุณมีคนที่ 'โทรหาได้ทันที' เมื่อมีปัญหาหนักๆ กี่คน?", options: ["ไม่มีเลย", "1 คน", "2-3 คน", "4-5 คน", "6 คนขึ้นไป"], scores: [1.0, 2.0, 3.5, 4.5, 5.0], weight: 1.2 },
  { id: "C2", dimension: "CONNECTION", text: "ในสัปดาห์ที่ผ่านมา คุณได้พูดคุยกับคนอื่นแล้วรู้สึก 'ดีขึ้น' บ่อยแค่ไหน?", options: L5("แทบไม่มีเลย", "บางครั้ง", "พอมีบ้าง", "บ่อย", "ทุกวัน"), scores: DIRECT, weight: 1.0 },
  { id: "C3", dimension: "CONNECTION", text: "คุณรู้สึก 'เป็นส่วนหนึ่ง' ของกลุ่มหรือชุมชนที่มีความหมายสำหรับคุณมากแค่ไหน?", options: L5("ไม่รู้สึกเลย", "น้อย", "บ้าง", "มาก", "รู้สึกมาก"), scores: DIRECT, weight: 1.0 },
  { id: "C4", dimension: "CONNECTION", text: "ความสัมพันธ์ที่สำคัญที่สุดในชีวิตตอนนี้ทำให้คุณรู้สึกอย่างไร?", options: ["เติมพลัง", "ดีพอกัน", "ไม่แน่ใจ", "ดูดพลัง", "เครียดมาก"], scores: [5.0, 3.5, 2.5, 1.5, 1.0], weight: 1.3 },
  { id: "C5", dimension: "CONNECTION", text: "คุณรู้สึกโดดเดี่ยวบ่อยแค่ไหน แม้จะอยู่กับคนอื่น?", options: L5("บ่อยมาก", "บ่อยพอสมควร", "บางครั้ง", "นานๆ ครั้ง", "แทบไม่เคย"), scores: DIRECT, weight: 1.2 }, // ป้ายเรียงจากแย่→ดีอยู่แล้ว (ต้นฉบับ mark reverse เพราะเรียงป้ายกลับด้าน)
  { id: "A1", dimension: "MASTERY", text: "คุณรู้สึกว่าตัวเองกำลัง 'เติบโต' ในด้านที่สำคัญสำหรับคุณมากแค่ไหน?", options: L5("ไม่เติบโตเลย", "น้อยมาก", "บ้าง", "มาก", "เติบโตมาก"), scores: DIRECT, weight: 1.2 },
  { id: "A2", dimension: "MASTERY", text: "เมื่อเจองานที่ท้าทาย คุณมักรู้สึกอย่างไร?", options: ["ตื่นเต้น อยากลอง", "กังวลแต่ก็ลองดู", "กังวลมาก", "พยายามหลีกเลี่ยง", "ขึ้นอยู่กับสถานการณ์"], scores: [5.0, 3.5, 2.0, 1.0, 3.0], weight: 1.0 },
  { id: "A3", dimension: "MASTERY", text: "ในช่วงเดือนที่ผ่านมา คุณ 'เก่งขึ้น' ในเรื่องอะไรบ้างที่เห็นได้ชัด?", options: ["ไม่มีเลย", "1 เรื่อง", "2-3 เรื่อง", "4-5 เรื่อง", "มากกว่านั้น"], scores: [1.0, 2.5, 3.5, 4.5, 5.0], weight: 1.0 },
  { id: "A4", dimension: "MASTERY", text: "คุณรู้สึกว่าตัวเองมี 'ความสามารถที่ซ่อนอยู่' ที่ยังไม่ได้ใช้มากแค่ไหน?", options: L5("ใช้เต็มที่แล้ว", "เกือบหมด", "ยังมีบ้าง", "มีอีกมาก", "มีมากที่ยังไม่ได้ใช้"), scores: DIRECT, weight: 1.3 },
  { id: "A5", dimension: "MASTERY", text: "เมื่อทำงานหรือกิจกรรมที่ชอบ คุณมั่นใจในความสามารถตัวเองมากแค่ไหน?", options: L5("ไม่มั่นใจเลย", "น้อย", "พอมี", "มั่นใจ", "มั่นใจมาก"), scores: DIRECT, weight: 1.0 },
  { id: "R1", dimension: "RESILIENCE", text: "เมื่อเกิดเรื่องไม่ดี คุณฟื้นตัวกลับมาได้เร็วแค่ไหนโดยเฉลี่ย?", options: ["นานมาก (หลายสัปดาห์ขึ้นไป)", "นาน (ราว 1 สัปดาห์)", "ปานกลาง (หลายวัน)", "เร็ว (1-2 วัน)", "เร็วมาก (ภายในวัน)"], scores: DIRECT, weight: 1.2 },
  { id: "R2", dimension: "RESILIENCE", text: "คุณเชื่อมั่นแค่ไหนว่าตัวเองจะ 'ผ่านพ้น' ความท้าทายที่กำลังเผชิญอยู่ได้?", options: L5("ไม่เชื่อเลย", "น้อย", "พอมี", "เชื่อมั่น", "เชื่อมั่นมาก"), scores: DIRECT, weight: 1.3 },
  { id: "R3", dimension: "RESILIENCE", text: "ในช่วงที่ยากลำบาก คุณมักทำอะไรเป็นอย่างแรก?", options: ["หาคนคุย", "คิดหาทางออก", "ออกกำลังกาย/เดิน", "พักผ่อน", "หมกตัวคนเดียว", "ไม่รู้จะทำอะไร"], scores: [4.5, 4.0, 4.5, 3.5, 2.0, 1.0], weight: 0.8 },
  { id: "R4", dimension: "RESILIENCE", text: "ความผิดพลาดในอดีตทำให้คุณรู้สึกอย่างไรตอนนี้?", options: ["ยังกังวลอยู่มาก", "บางครั้งยังคิดถึง", "เรียนรู้แล้วปล่อยวาง", "ลืมไปแล้ว", "ภูมิใจที่ผ่านมาได้"], scores: [1.5, 3.0, 4.5, 3.5, 5.0], weight: 1.0 },
  { id: "R5", dimension: "RESILIENCE", text: "คุณมีความหวังเกี่ยวกับอนาคตมากแค่ไหน?", options: L5("ไม่มีความหวังเลย", "น้อย", "พอมีบ้าง", "มีความหวัง", "มีความหวังมาก"), scores: DIRECT, weight: 1.2 },
];

export interface KwiPattern {
  id: string;
  nameTh: string;
  description: string;
  strength: string;
  challenge: string;
  /** บทเปิดของแม่หมอ (เสียงลาลา — เนื้อความจาก chatbot_opening ต้นฉบับ) */
  opening: string;
  shortTermAction: string;
  longTerm: string;
}

export const KWI_PATTERNS: Record<string, KwiPattern> = {
  P001: {
    id: "P001", nameTh: "ผู้เบ่งบาน",
    description: "ทุกมิติสมดุล เติบโต และมีความหมาย — สภาวะที่นักจิตวิทยาเรียกว่า 'ชีวิตที่ดี' (Flourishing)",
    strength: "สมดุลรอบด้าน · พลังงานดี · ความสัมพันธ์แน่น · กำลังเติบโต",
    challenge: "อาจชะล่าใจ · ต้องท้าทายตัวเองต่อไป",
    opening: "สุดยอดเลยค่ะ! คุณอยู่ใน 'สภาวะเบ่งบาน' ที่นักจิตวิทยาเรียกว่า Flourishing — ตอนนี้อยากต่อยอดไปทิศทางไหนคะ ลาลา~",
    shortTermAction: "ท้าทายตัวเองด้วยเป้าหมายที่ใหญ่ขึ้น · หาคนที่จะเติบโตไปด้วยกัน",
    longTerm: "ส่งต่อและสร้างคุณค่าให้คนรอบข้าง",
  },
  P002: {
    id: "P002", nameTh: "นักแสวงหาความหมาย",
    description: "ทำสิ่งต่างๆ ได้ดี มีความสามารถชัดเจน แต่บางทีทำไปโดยไม่รู้ว่า 'เพื่ออะไร'",
    strength: "เก่งและมีความสามารถ · ผลลัพธ์ดี · วินัยสูง",
    challenge: "ขาด 'ทำไม' ที่ชัดเจน · อาจรู้สึกว่าชีวิตซ้ำซาก · เหนื่อยสะสมได้ในระยะยาว",
    opening: "คุณมีความสามารถชัดเจนมากเลยค่ะ แต่แม่หมออยากถามว่า... ทั้งหมดที่ทำอยู่ มันตอบโจทย์อะไรในชีวิตของคุณคะ?",
    shortTermAction: "เขียนคุณค่า 3 ข้อที่สำคัญที่สุด · ตรวจว่าสิ่งที่ทำอยู่สอดคล้องไหม",
    longTerm: "หาจุดที่ชอบ เก่ง และโลกต้องการ มาบรรจบกัน",
  },
  P003: {
    id: "P003", nameTh: "ผู้ประสบความสำเร็จที่โดดเดี่ยว",
    description: "ผลงานดีเยี่ยม แต่ข้างในอาจรู้สึกว่า 'ไม่มีใครเข้าใจจริงๆ' — ความสำเร็จที่ไม่มีคนแบ่งปันยังไม่สมบูรณ์",
    strength: "เก่งมาก · เป็นระบบ · ผลลัพธ์วัดได้",
    challenge: "ความสัมพันธ์บางเบา · เสี่ยงโดดเดี่ยวระยะยาว · ขาดคนร่วมฉลอง",
    opening: "ความสามารถของคุณชัดมากค่ะ แต่แม่หมออยากถามว่า... มีใครที่คุณได้แบ่งปันความสำเร็จเหล่านี้ด้วยบ้างไหมคะ?",
    shortTermAction: "นัดคุยลึกๆ ตัวต่อตัวกับคนที่ไว้ใจ สัปดาห์ละ 1 คน",
    longTerm: "สร้างสายสัมพันธ์ที่จริงใจ ไม่ใช่แค่คนรู้จัก",
  },
  P004: {
    id: "P004", nameTh: "ผู้ให้ที่กำลังหมดแรง",
    description: "เติมพลังให้คนอื่นได้ดีมาก แต่ถังพลังของตัวเองกำลังใกล้หมด",
    strength: "ดูแลคนอื่นเก่ง · ความสัมพันธ์ดี · เป็นที่รักของทีม",
    challenge: "พลังงานตัวเองต่ำ · เหนื่อยจากการให้มากเกินไป · ขาดเวลาดูแลตัวเอง",
    opening: "คุณดูแลคนอื่นได้ดีมากเลยค่ะ แต่แม่หมออยากถามตรงๆ ว่า... แล้วใครดูแลคุณบ้างคะ?",
    shortTermAction: "จองเวลา 'ชั่วโมงคืนพลัง' ให้ตัวเองอย่างน้อยวันละ 1 ชั่วโมง",
    longTerm: "ให้แบบยั่งยืน — เติมตัวเองก่อน เพื่อให้ได้นานขึ้น",
  },
  P005: {
    id: "P005", nameTh: "ผู้กำลังสร้างใหม่",
    description: "คุณกำลังอยู่ในช่วงที่หนัก แต่การที่ยังมาตอบคำถามชุดนี้ได้ แปลว่าคุณยังสู้อยู่ — ช่วงนี้คือการ 'รื้อเพื่อสร้างใหม่'",
    strength: "มีความกล้าลึกๆ · ยังไม่ยอมแพ้ · กำลังเรียนรู้",
    challenge: "พลังงานต่ำ · ความหวังริบหรี่ · ต้องการคนเคียงข้าง",
    opening: "ขอบคุณที่ไว้วางใจมาตอบนะคะ แม่หมออยากให้รู้ว่าสิ่งที่คุณรู้สึกอยู่นั้น...สมเหตุสมผลมากเลยค่ะ อยากเล่าให้ฟังไหมคะว่าช่วงนี้เป็นอย่างไรบ้าง 🐾",
    shortTermAction: "โฟกัสแค่ 'วันนี้' — หนึ่งสิ่งเล็กๆ ที่ทำให้ดีขึ้นได้",
    longTerm: "วิกฤตที่ผ่านพ้นได้ คือรากฐานที่แข็งแกร่งที่สุด",
  },
  P006: {
    id: "P006", nameTh: "นักเดินทางช่วงราบเรียบ",
    description: "ชีวิตโอเค ปลอดภัย แต่อาจรู้สึกว่า 'มีบางอย่างขาดหายไป' โดยบอกไม่ได้ว่าคืออะไร — ไม่แย่ แต่ก็ยังไม่เบ่งบาน",
    strength: "มั่นคง · ปรับตัวได้ · ไม่ค่อยมีวิกฤต",
    challenge: "ไม่ค่อยตื่นเต้นกับชีวิต · ไม่เติบโต · รู้สึกเฉยๆ กับทุกอย่าง",
    opening: "ฟังดู 'โอเค' ทุกด้านนะคะ แต่บางทีความโอเคก็คือสัญญาณว่ามีบางอย่างที่เรายังไม่ได้ค้นพบ — คุณรู้สึกแบบนั้นบ้างไหมคะ?",
    shortTermAction: "ลองทำสิ่งที่ 'ไม่เคยลอง' อย่างน้อย 1 อย่างภายใน 14 วัน",
    longTerm: "เพิ่มความตื่นเต้นและการค้นหาตัวเองใหม่",
  },
};

export interface KwiResult {
  dimensions: Record<KwiDimension, number>; // 1.0-5.0
  total: number;
  pattern: KwiPattern;
  badge: { label: string; emoji: string };
  /** มิติที่ต่ำสุด/สูงสุด (ใช้ทำการ์ด insight — display_rules: highlight ทั้งคู่) */
  lowest: KwiDimension;
  highest: KwiDimension;
  /** true = ควรแสดงข้อความชวนคุยผู้เชี่ยวชาญ (badge ต่ำสุดตาม display_rules) */
  showReferral: boolean;
  caveat: string;
}

export const WELLBEING_CAVEAT =
  "แบบสำรวจนี้เป็นเครื่องมือชวนสังเกตตัวเองเพื่อการดูแลใจ ไม่ใช่เครื่องมือวินิจฉัยทางการแพทย์ — หากมีความรู้สึกหนักต่อเนื่อง ควรคุยกับผู้เชี่ยวชาญโดยตรง (สายด่วนสุขภาพจิต 1323)";

/** ตรวจว่าคำตอบครบและอยู่ในช่วง — answers = index ของตัวเลือกต่อข้อ (0-based) */
export function validateKwiAnswers(answers: Record<string, unknown>): string | null {
  for (const q of KWI_QUESTIONS) {
    const a = answers[q.id];
    if (typeof a !== "number" || !Number.isInteger(a) || a < 0 || a >= q.options.length) {
      return `ข้อ ${q.id} ยังไม่ได้ตอบหรือค่าไม่ถูกต้อง`;
    }
  }
  return null;
}

export function scoreKwi(answers: Record<string, number>): KwiResult {
  const sums: Record<KwiDimension, { s: number; w: number }> = {
    VITALITY: { s: 0, w: 0 }, MEANING: { s: 0, w: 0 }, CONNECTION: { s: 0, w: 0 },
    MASTERY: { s: 0, w: 0 }, RESILIENCE: { s: 0, w: 0 },
  };
  for (const q of KWI_QUESTIONS) {
    if (!q.scores) continue; // V3 เก็บข้อมูลอย่างเดียว
    const score = q.scores[answers[q.id]];
    sums[q.dimension].s += score * q.weight;
    sums[q.dimension].w += q.weight;
  }
  const dimensions = Object.fromEntries(
    KWI_DIMENSIONS.map((d) => [d, Math.round((sums[d].s / sums[d].w) * 100) / 100])
  ) as Record<KwiDimension, number>;

  // รวมด้วยน้ำหนักมิติ (MEANING/RESILIENCE 1.2 ฯลฯ ตามต้นฉบับ)
  let ts = 0, tw = 0;
  for (const d of KWI_DIMENSIONS) {
    ts += dimensions[d] * KWI_DIMENSION_WEIGHT[d];
    tw += KWI_DIMENSION_WEIGHT[d];
  }
  const total = Math.round((ts / tw) * 100) / 100;

  const { VITALITY: v, MEANING: m, CONNECTION: c, MASTERY: a, RESILIENCE: r } = dimensions;
  // จำแนกตามลำดับ priority ต้นฉบับ (P005 วิกฤตก่อน → P001 เบ่งบาน)
  let pid = "P006"; // ไม่เข้าเกณฑ์ไหน = ช่วงราบเรียบ (ปลอดภัยกว่าปล่อยเป็นเบ่งบานตาม default ต้นฉบับ)
  if (r < 3.0 && (v < 3.0 || m < 3.0)) pid = "P005";
  else if (c >= 3.5 && v < 3.0) pid = "P004";
  else if (a >= 3.5 && c < 3.0) pid = "P003";
  else if (m < 3.0 && a >= 3.5) pid = "P002";
  else if ([v, m, c].every((x) => x >= 2.5 && x <= 3.5)) pid = "P006";
  else if ([v, m, c, a, r].every((x) => x >= 3.5)) pid = "P001";

  const badge =
    total >= 4.0 ? { label: "สภาวะเบ่งบาน", emoji: "🌟" }
    : total >= 3.0 ? { label: "สุขภาวะดี", emoji: "✅" }
    : total >= 2.0 ? { label: "กำลังพัฒนา", emoji: "🌱" }
    : { label: "ต้องการดูแล", emoji: "💙" };

  const sorted = [...KWI_DIMENSIONS].sort((x, y) => dimensions[x] - dimensions[y]);
  return {
    dimensions,
    total,
    pattern: KWI_PATTERNS[pid],
    badge,
    lowest: sorted[0],
    highest: sorted[4],
    showReferral: total < 2.0 || pid === "P005",
    caveat: WELLBEING_CAVEAT,
  };
}
