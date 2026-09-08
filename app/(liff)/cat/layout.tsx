// metadata ของหน้า /cat (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดูดวงแมว ตำราแมวมงคล 17 ชนิด — แมวของคุณเป็นแมวศุภลักษณ์ไหม",
  description:
    "ดูดวงแมวจากตำราแมวศุภลักษณ์ (สมุดข่อยโบราณ) เลือกสีขน ลาย สีตา รู้ทันทีว่าเป็นแมวมงคลชนิดไหน ให้คุณด้านใด พร้อมความเข้ากันของธาตุแมวกับดวงเจ้าของ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
