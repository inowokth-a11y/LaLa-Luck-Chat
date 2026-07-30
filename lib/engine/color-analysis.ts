// วิเคราะห์ "สีจริงในภาพ" → สัดส่วนธาตุ — deterministic ล้วน ไม่ใช้ AI (฿0)
//
// หลักการ (ตกลงกับผู้ใช้ 30 ก.ค. 2569): การอ่านภาพแบ่ง 2 ชั้น —
//   ชั้นสี = คณิตศาสตร์ล้วน (ไฟล์นี้: histogram พิกเซล → สีไทยที่ใกล้สุด → COLOR_TO_ELEMENT)
//   ชั้นลวดลาย/รูปทรง = ต้องใช้ vision AI (งานแยก — ผ่าน lib/ai ไม่ใช่ไฟล์นี้)
// ตัวคำนวณธาตุคือตาราง COLOR_TO_ELEMENT ของฮวงจุ้ย (แหล่งเดียวกับฟอร์ม) — ไม่มีตารางซ้ำ
//
// ⚠️ ข้อจำกัดโดยธรรมชาติ: สีทองเมทัลลิก (ทอง=Metal) กับเหลืองทอง (เหลืองทอง=Earth) ใกล้กันมาก
//    ใน RGB — ผลแยกสองธาตุนี้จึงเป็นการประมาณ ควรแสดงเป็นสัดส่วน ไม่ฟันธงธาตุเดียว

import { COLOR_TO_ELEMENT } from "./fengshui";
import { THAI_LABEL_5, type Element5 } from "./element";

/** จุดยึด RGB ต่อชื่อสีไทยใน COLOR_TO_ELEMENT — ธาตุอ่านจากตารางจริง ไม่เขียนซ้ำที่นี่ */
export const COLOR_ANCHORS: ReadonlyArray<{ name: string; rgb: [number, number, number] }> = [
  // ไฟ
  { name: "แดง", rgb: [220, 40, 50] },
  { name: "แดงเข้ม", rgb: [139, 10, 20] },
  { name: "ส้ม", rgb: [255, 140, 30] },
  { name: "ชมพูร้อน", rgb: [255, 90, 160] },
  { name: "แดงส้ม", rgb: [250, 80, 40] },
  { name: "ทับทิม", rgb: [160, 20, 50] },
  // ดิน
  { name: "เหลือง", rgb: [250, 220, 60] },
  { name: "เหลืองทอง", rgb: [235, 180, 50] },
  { name: "น้ำตาล", rgb: [120, 85, 60] },
  { name: "ครีม", rgb: [246, 238, 216] },
  { name: "เบจ", rgb: [222, 205, 175] },
  // ไม้
  { name: "เขียว", rgb: [70, 160, 80] },
  { name: "เขียวอ่อน", rgb: [150, 215, 140] },
  { name: "เขียวเข้ม", rgb: [30, 95, 45] },
  { name: "เขียวมิ้นท์", rgb: [150, 222, 200] },
  { name: "ม่วง", rgb: [130, 60, 160] },
  // น้ำ
  { name: "น้ำเงิน", rgb: [30, 60, 150] },
  { name: "ฟ้า", rgb: [100, 180, 245] },
  { name: "ดำ", rgb: [22, 22, 26] },
  { name: "เทาเข้ม", rgb: [70, 70, 75] },
  { name: "ม่วงน้ำเงิน", rgb: [70, 55, 160] },
  { name: "ชมพูอ่อน", rgb: [246, 195, 205] },
  // ทอง (โลหะ)
  { name: "ขาว", rgb: [252, 252, 252] },
  { name: "เงิน", rgb: [195, 198, 205] },
  { name: "ทอง", rgb: [205, 170, 80] },
  { name: "เทา", rgb: [130, 130, 132] },
  { name: "เทาอ่อน", rgb: [200, 200, 200] },
];

// ตรวจตอนโหลดโมดูล: ทุก anchor ต้องมีธาตุใน COLOR_TO_ELEMENT — กันตารางสองไฟล์ drift
for (const a of COLOR_ANCHORS) {
  if (!COLOR_TO_ELEMENT[a.name]) {
    throw new Error(`COLOR_ANCHORS มีสี "${a.name}" ที่ไม่มีใน COLOR_TO_ELEMENT — ตารางไม่ตรงกัน`);
  }
}

/** ระยะสีแบบ "redmean" — ประมาณการรับรู้ของตามนุษย์ ดีกว่า euclidean ตรงๆ โดยไม่ต้องแปลง space */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
}

/** สีไทยที่ใกล้ RGB นี้ที่สุด (deterministic — เสมอกันเลือกตัวแรกในตาราง) */
export function nearestNamedColor(r: number, g: number, b: number): { name: string; element: Element5 } {
  let best = COLOR_ANCHORS[0];
  let bestD = Infinity;
  for (const a of COLOR_ANCHORS) {
    const d = colorDistance(r, g, b, a.rgb[0], a.rgb[1], a.rgb[2]);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return { name: best.name, element: COLOR_TO_ELEMENT[best.name] };
}

export interface ElementShare {
  element: Element5;
  element_th: string;
  share: number; // 0-1 ของพิกเซลทึบที่สุ่มได้
}

export interface ColorAnalysis {
  sampled: number; // จำนวนพิกเซลทึบที่นับจริง
  /** สีไทยเด่นเรียงตามสัดส่วน (ตัดที่ 5 อันดับ) */
  topColors: Array<{ name: string; element: Element5; share: number }>;
  /** สัดส่วนธาตุเรียงมาก→น้อย (รวม = 1) */
  elements: ElementShare[];
  dominant: Element5 | null; // null = ไม่มีพิกเซลทึบเลย
}

/**
 * วิเคราะห์ RGBA buffer (จาก canvas getImageData) → สัดส่วนธาตุ
 * caller ควรย่อภาพก่อน (แนะนำ ≤64×64) — ฟังก์ชันนี้สแกนทุกพิกเซลตรงๆ
 * พิกเซลโปร่งใส (alpha < alphaMin) ถูกข้าม — พื้นหลังโปร่งของโลโก้ต้องไม่ถูกนับเป็น "ขาว"
 */
export function analyzeImagePixels(
  rgba: Uint8ClampedArray | number[],
  opts: { alphaMin?: number } = {}
): ColorAnalysis {
  const alphaMin = opts.alphaMin ?? 16;
  const colorCount = new Map<string, number>();
  let sampled = 0;

  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < alphaMin) continue;
    const { name } = nearestNamedColor(rgba[i], rgba[i + 1], rgba[i + 2]);
    colorCount.set(name, (colorCount.get(name) ?? 0) + 1);
    sampled++;
  }

  if (sampled === 0) return { sampled: 0, topColors: [], elements: [], dominant: null };

  const topColors = [...colorCount.entries()]
    .map(([name, n]) => ({ name, element: COLOR_TO_ELEMENT[name], share: n / sampled }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);

  const byElement = new Map<Element5, number>();
  for (const [name, n] of colorCount.entries()) {
    const el = COLOR_TO_ELEMENT[name];
    byElement.set(el, (byElement.get(el) ?? 0) + n);
  }
  const elements: ElementShare[] = [...byElement.entries()]
    .map(([element, n]) => ({ element, element_th: THAI_LABEL_5[element], share: n / sampled }))
    .sort((a, b) => b.share - a.share);

  return { sampled, topColors, elements, dominant: elements[0].element };
}

export const COLOR_ANALYSIS_CAVEAT =
  "วิเคราะห์จาก 'สี' ในภาพเท่านั้น (คณิตศาสตร์ล้วน ไม่ใช้ AI) — ยังไม่รวมลวดลาย/รูปทรง " +
  "· โทนทองเมทัลลิกกับเหลืองทองใกล้กันมาก สัดส่วนธาตุทอง/ดินจึงเป็นการประมาณ";
