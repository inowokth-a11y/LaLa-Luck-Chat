// metadata ของหน้า /profile (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดูดวงแม่นๆ จากวันเดือนปีเกิด — เปิดการ์ดพลังงานฟรี",
  description: "คำนวณธาตุประจำตัวและการ์ดพลังงาน 100 แบบจากวันเกิดจริง พร้อมบุคคลต้นแบบในตำนานและประวัติศาสตร์ — ฟรี ไม่จำกัด",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
