// metadata ของหน้า /oracle (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เสี่ยงทายการ์ดพลังงาน — ถามเรื่องที่คาใจ",
  description: "หมุนวงแหวนเสี่ยงทายด้วยมือคุณเอง เปิดการ์ดพลังงาน 2 ใบ ตีความด้วยหลักธาตุและ AI แม่หมอลาลา",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
