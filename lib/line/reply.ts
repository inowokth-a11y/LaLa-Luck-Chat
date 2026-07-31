// แปลงผลจาก Router (Logic 0) เป็นข้อความ LINE — pure ทั้งไฟล์ ไม่แตะ network
// แยกออกมาเพื่อให้เทสต์ "ผู้ใช้จะได้เห็นอะไร" ได้โดยไม่ต้องยิง LINE จริง

import { LOGIC_NAMES, type RouteResult } from "@/lib/engine/router";
import { liffButton, textMessage, type LineMessage } from "./client";

/** Logic ที่มีหน้า LIFF จริงแล้ว → path บนเว็บ */
export const LIFF_PATHS: Record<number, string> = {
  1: "/profile",
  7: "/fengshui",
  8: "/fortune",
  9: "/fortune",
  10: "/fortune",
  11: "/fortune",
  12: "/wellness", // อาหาร/สุขภาพ + กิจกรรม (หน้าเดียวกัน — 30 ก.ค. 2569)
  16: "/wellness",
  20: "/compatibility",
  21: "/oracle",
};

/** Logic ที่ตอบในแชทได้จริงแล้ว (มี pipeline รองรับ) */
export const CHAT_IMPLEMENTED: readonly number[] = [4];

const WELCOME =
  "สวัสดีค่ะ 🙏 นี่คือ KRUTH ELEMENT\n\n" +
  "ลองพิมพ์ได้เลย เช่น\n" +
  "• “เมื่อคืนฝันเห็นงู” — ทำนายฝัน\n" +
  "• “ดวงวันนี้” — ดวงรายวัน\n" +
  "• “รหัสชีวิตของฉัน” — ธาตุประจำตัว\n" +
  "• “ขอเลขเสี่ยงทาย” — เสี่ยงทาย";

/**
 * ข้อความสำหรับ Logic ที่ยังไม่เปิดให้บริการ — บอกตรงๆ ว่ายังไม่มี
 * ⚠️ ห้ามแต่งคำทำนายมั่วเพื่อไม่ให้ผู้ใช้ผิดหวัง (กฎเหล็กของ AI-2 ข้อ 1)
 */
function notReady(logicId: number): string {
  const name = LOGIC_NAMES[logicId] ?? "บริการนี้";
  return (
    `ตอนนี้ “${name}” ยังไม่เปิดให้บริการค่ะ 🙏\n\n` +
    "ระหว่างนี้ลองใช้บริการที่พร้อมแล้วได้เลย: ทำนายฝัน · ดวงรายวัน · รหัสชีวิต · เสี่ยงทาย"
  );
}

export function welcomeMessage(): LineMessage[] {
  return [textMessage(WELCOME)];
}

/**
 * ข้อความตอบรับสำหรับงานที่ใช้เวลานาน (ทำนายฝัน) — ส่งด้วย replyToken ทันที
 * แล้วค่อย push คำตอบจริงตามไป ไม่ให้ผู้ใช้เงียบหายไปเป็นนาที
 * ⚠️ ห้ามใส่คำทำนายใดๆ ที่นี่ — ยังไม่ได้คำนวณอะไรเลยตอนส่งข้อความนี้
 */
export function ackMessage(): LineMessage[] {
  return [textMessage("รับเรื่องแล้วค่ะ 🔮 กำลังตรวจสัญลักษณ์ในความฝันให้อยู่ สักครู่นะคะ")];
}

/**
 * สร้างข้อความตอบจากผลของ Router
 *
 * @param route ผลจาก routeByKeyword()/ชั้น AI
 * @param baseUrl origin ของเว็บ (สำหรับประกอบลิงก์ LIFF)
 * @returns null = ต้องประมวลผลต่อแบบ async (เช่น Logic 4 ต้องเรียก engine + AI ก่อน)
 */
export function buildReply(route: RouteResult, baseUrl: string): LineMessage[] | null {
  // Safety Gate — ตอบเฉพาะข้อความช่วยเหลือ ห้ามพ่วงการตลาด/ปุ่ม/คำทำนายใดๆ
  if (route.logic_id === -1) {
    return [textMessage(route.crisis_resource_message ?? "หากคุณกำลังทุกข์ใจ อยากให้ลองติดต่อสายด่วนสุขภาพจิต 1323 นะคะ")];
  }

  // ต้องทำงานต่อแบบ async — ผู้เรียกจัดการเอง
  if (CHAT_IMPLEMENTED.includes(route.logic_id)) return null;

  const path = LIFF_PATHS[route.logic_id];
  if (path) {
    const name = LOGIC_NAMES[route.logic_id] ?? "ผลการวิเคราะห์";
    return [
      liffButton(
        name,
        "แตะเพื่อกรอกข้อมูลและดูผลลัพธ์",
        "เปิดดูผลลัพธ์",
        `${baseUrl}${path}`
      ),
    ];
  }

  // Logic 18 = ปลายทาง fallback — ยังไม่มี pipeline ตอบทั่วไป จึงแนะนำเมนูแทน
  if (route.logic_id === 18) return welcomeMessage();

  return [textMessage(notReady(route.logic_id))];
}

/** ข้อความเมื่อระบบขัดข้อง — ต้องไม่หลุด stack trace ให้ผู้ใช้เห็น */
export function errorMessage(): LineMessage[] {
  return [
    textMessage("ขออภัยค่ะ ระบบขัดข้องชั่วคราว 🙏 รบกวนลองใหม่อีกครั้งในสักครู่นะคะ"),
  ];
}

/** ข้อความเมื่อผู้ใช้ส่งสิ่งที่ยังรับไม่ได้ (รูป/เสียง/สติกเกอร์) */
export function unsupportedMessage(kind: string): LineMessage[] {
  const map: Record<string, string> = {
    image: "ตอนนี้ยังอ่านรูปภาพไม่ได้ค่ะ 🙏 (ดูลายมือ/ฮวงจุ้ยจากภาพยังไม่เปิดให้บริการ)",
    sticker: "ขอบคุณสำหรับสติกเกอร์ค่ะ 😊 ลองพิมพ์คำถามมาได้เลยนะคะ",
    audio: "ตอนนี้ยังฟังเสียงไม่ได้ค่ะ 🙏 รบกวนพิมพ์เป็นข้อความแทนนะคะ",
  };
  return [textMessage(map[kind] ?? "ตอนนี้รองรับเฉพาะข้อความค่ะ 🙏 ลองพิมพ์คำถามมาได้เลยนะคะ")];
}
