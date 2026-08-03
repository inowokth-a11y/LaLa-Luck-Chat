// metadata ของหน้า /fengshui (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ฮวงจุ้ยห้องและโต๊ะทำงาน ตามธาตุประจำตัว",
  description: "วิเคราะห์ทิศ สี และรูปทรงของห้องตามธาตุประจำตัวคุณ พร้อมคำแนะนำแก้เคล็ดตามวงจรธาตุ — ฟรี",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
