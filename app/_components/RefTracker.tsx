"use client";

// จับ ?ref=CODE จากลิงก์แอฟฟิลิเอต (ทุกหน้า — อยู่ใน root layout) → POST /api/affiliate/visit
// server เป็นคนนับ visit + ตั้ง cookie first-touch (httpOnly) — ฝั่งนี้แค่ส่งสัญญาณ ไม่แตะ cookie เอง
// อ่านจาก window.location ตรงๆ (ไม่ใช้ useSearchParams — ไม่ต้องห่อ Suspense ใน layout)

import { useEffect } from "react";
import { isValidCode } from "@/lib/affiliate/code";

export default function RefTracker() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (!isValidCode(code)) return;
      // กันยิงซ้ำตอน navigate ไปมาใน SPA — ครั้งเดียวต่อแท็บต่อรหัส
      const key = `kruth_ref_sent:${code}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      void fetch("/api/affiliate/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch(() => {});
    } catch {
      // sessionStorage/URL พังในบาง browser mode — ไม่ใช่เหตุให้หน้าเว็บพัง
    }
  }, []);
  return null;
}
