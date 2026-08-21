// metadata ของหน้า /soulmate (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดูดวงเนื้อคู่จากวันเกิดและลัคนา",
  description:
    "คำทำนายความรักและเนื้อคู่จากการคำนวณจริง — ลัคนานิรายนะ ราศีคู่ครอง (ภพปัตนิ) ลักษณะนิสัยคู่ตามตำรา และเคมีธาตุของคุณ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
