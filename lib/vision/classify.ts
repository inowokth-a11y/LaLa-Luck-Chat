// จำแนกลวดลาย/รูปทรงจากภาพ → enum ของระบบ — ตรรกะล้วน ไม่แตะ AI/DB (เทสต์ตรงๆ ได้)
//
// 🔴 เส้นแบ่ง §16 ใช้กับภาพด้วย (ผู้ใช้ยืนยัน 30 ก.ค. 2569):
//    vision "จำแนก" ว่าในภาพมีอะไร → คืน key จากตาราง MOTIF/SHAPE_TO_ELEMENT เท่านั้น
//    ตัวคำนวณธาตุ/คะแนนคือ engine (scoreLabelComposition) — AI ห้ามตัดสินธาตุเอง
// prompt สร้างจากตารางจริงแบบ describeAllowlistForPrompt (§16) — drift จากตารางไม่ได้
//
// 🔴 นโยบายใบหน้า: ภาพที่มีใบหน้าคนจริง = ปฏิเสธการวิเคราะห์ (PDPA ข้อมูลชีวมิติ —
//    การอ่านใบหน้าเป็น Logic 5/6 ที่ต้องมี consent ชั้นของตัวเอง ไม่ใช่ฟีเจอร์นี้)

import { MOTIF_TO_ELEMENT, scoreLabelComposition, type LabelCompositionResult } from "@/lib/engine/label";
import { SHAPE_TO_ELEMENT } from "@/lib/engine/fengshui";
import type { Element5 } from "@/lib/engine/element";

export const MOTIF_KEYS: readonly string[] = Object.keys(MOTIF_TO_ELEMENT);
export const SHAPE_KEYS: readonly string[] = Object.keys(SHAPE_TO_ELEMENT);

/** system prompt ของ vision — สร้างจากตารางจริง ห้าม AI ตอบนอก enum */
export function buildVisionSystemPrompt(): string {
  return `คุณคือตัวจำแนกภาพของระบบออกแบบฉลาก/โลโก้ หน้าที่เดียว: บอกว่าในภาพมีลวดลาย/รูปทรงใดจากรายการที่กำหนด

ตอบเป็น JSON เท่านั้น รูปแบบ:
{"face_detected": boolean, "motifs": string[], "shape": string|null, "confidence": number}

กฎเหล็ก:
1. "motifs" เลือกได้เฉพาะจากรายการนี้เท่านั้น (เลือกทุกอันที่เห็นชัด สูงสุด 5): ${MOTIF_KEYS.join(", ")}
2. "shape" เลือกได้เฉพาะจากรายการนี้ (รูปทรงเด่นของภาพ/องค์ประกอบหลัก 1 อัน หรือ null): ${SHAPE_KEYS.join(", ")}
3. ถ้าภาพมี "ใบหน้าคนจริง" (ภาพถ่ายบุคคล) → {"face_detected": true, "motifs": [], "shape": null, "confidence": 1}
   (ภาพวาด/เทวรูป/การ์ตูนที่ไม่ใช่บุคคลจริง ไม่นับ)
4. ไม่แน่ใจ/ไม่มีในรายการ → ไม่ต้องใส่ ห้ามเดา ห้ามสร้างคำใหม่นอกรายการ
5. "confidence" 0-1 = ความมั่นใจโดยรวมของการจำแนก
6. ห้ามตัดสิน "ธาตุ" เอง — หน้าที่คุณคือจำแนกลวดลาย ระบบจะคำนวณธาตุจากตารางเอง`;
}

export interface VisionClassification {
  faceDetected: boolean;
  /** key ที่ผ่านการตรวจกับตารางแล้วเท่านั้น (ตัวที่ AI ตอบนอก enum ถูกทิ้ง ไม่เดา) */
  motifs: string[];
  shape: string | null;
  confidence: number;
  /** จำนวนค่าที่ AI ตอบมาแต่ไม่อยู่ใน enum (ตัวชี้คุณภาพ prompt) */
  droppedCount: number;
}

export type VisionValidation =
  | { ok: true; result: VisionClassification }
  | { ok: false; reason: "invalid_json" | "face" };

/** ตรวจคำตอบ AI กับ enum จริง — ค่าแปลกถูกทิ้ง ไม่ใช่ถูกเดาให้ */
export function validateVisionResult(raw: unknown): VisionValidation {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "invalid_json" };
  }
  const o = raw as Record<string, unknown>;

  if (o.face_detected === true) return { ok: false, reason: "face" };

  const motifsRaw = Array.isArray(o.motifs) ? o.motifs : [];
  let dropped = 0;
  const motifs: string[] = [];
  for (const m of motifsRaw.slice(0, 10)) {
    const key = typeof m === "string" ? m.trim() : "";
    if (key && MOTIF_KEYS.includes(key)) {
      if (!motifs.includes(key)) motifs.push(key);
    } else {
      dropped++;
    }
  }

  let shape: string | null = null;
  if (typeof o.shape === "string" && o.shape.trim()) {
    const s = o.shape.trim();
    if (SHAPE_KEYS.includes(s)) shape = s;
    else dropped++;
  }

  const confRaw = typeof o.confidence === "number" ? o.confidence : 0;
  const confidence = Number.isFinite(confRaw) ? Math.min(1, Math.max(0, confRaw)) : 0;

  return {
    ok: true,
    result: { faceDetected: false, motifs: motifs.slice(0, 5), shape, confidence, droppedCount: dropped },
  };
}

/** แปลงผลจำแนก → คะแนนองค์ประกอบด้วย engine จริง (ตัวเลขไม่ได้มาจาก AI) */
export function visionComposition(
  cls: VisionClassification,
  brandElement: Element5,
  brandMissing: Element5[] = []
): LabelCompositionResult | null {
  const components = [
    ...cls.motifs.map((m) => ({ kind: "ลวดลาย" as const, label: m, element: MOTIF_TO_ELEMENT[m] })),
    ...(cls.shape ? [{ kind: "รูปทรง" as const, label: cls.shape, element: SHAPE_TO_ELEMENT[cls.shape] }] : []),
  ];
  if (components.length === 0) return null;
  return scoreLabelComposition({ brandElement, brandMissing, components });
}

export const VISION_CAVEAT =
  "AI อ่านภาพเพื่อ 'จำแนกลวดลาย/รูปทรง' เท่านั้น — ธาตุและคะแนนคำนวณจากตารางของระบบ " +
  "· ภาพถูกส่งประมวลผลครั้งเดียว ระบบเก็บเฉพาะผลจำแนก ไม่เก็บตัวภาพ";
