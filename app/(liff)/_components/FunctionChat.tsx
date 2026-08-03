"use client";

// FunctionChat — ตัวส่ง context ของหน้าฟังก์ชันเข้าแชทลอย (2 ส.ค. 2569)
//
// เดิม component นี้เรนเดอร์กล่องแชทเอง → ตอนนี้ UI ทั้งหมดย้ายไป LalaFloat (root layout)
// ที่ลอยทุกหน้าแบบ Messenger/AssistiveTouch — ไฟล์นี้เหลือหน้าที่เดียว: publish ผลคำนวณ
// ของหน้าเข้า float-bus (API เดิมทุกอย่าง — 4 หน้าที่ใช้อยู่ไม่ต้องแก้)

import { useEffect, useRef } from "react";
import { publishChatContext } from "@/lib/chat/float-bus";

interface Props {
  logicId: number;
  /** ผลที่หน้าจอคำนวณได้ — ส่งให้ AI อ้างอิง ถ้าเป็น null = ยังไม่มีผล (แชทลอยตกเป็นโหมด plan) */
  context: unknown;
  placeholder?: string;
  /** ข้อความชวนจากแม่หมอตอน onboarding */
  invite?: string;
}

export default function FunctionChat({ logicId, context, placeholder, invite }: Props) {
  // หน้าส่ง context เป็น object literal สร้างใหม่ทุก render → เทียบด้วย JSON กัน publish รัว
  const lastJson = useRef<string | null>(null);

  useEffect(() => {
    const payload = context === null || context === undefined ? null : { logicId, context, placeholder, invite };
    const json = JSON.stringify(payload);
    if (json === lastJson.current) return;
    lastJson.current = json;
    publishChatContext(payload);
  }, [logicId, context, placeholder, invite]);

  // ออกจากหน้า → ล้าง context (แชทลอยกลับเป็นโหมด plan)
  // ต้องรีเซ็ต guard ด้วย — StrictMode (dev) จำลอง unmount แล้ว mount ใหม่ ถ้า guard ค้างค่าเดิม
  // effect รอบสองจะข้ามการ publish ทั้งที่ bus เพิ่งถูกล้างเป็น null → แชทลอยไม่เห็นผลบนหน้า
  useEffect(
    () => () => {
      lastJson.current = null;
      publishChatContext(null);
    },
    []
  );

  return null;
}
