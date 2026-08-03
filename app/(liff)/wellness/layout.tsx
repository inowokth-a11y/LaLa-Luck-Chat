// metadata ของหน้า /wellness (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "อาหารและกิจกรรมเสริมดวงตามธาตุ",
  description: "รส อาหาร สี และกิจวัตรที่ช่วยเติมธาตุที่ขาด ตามหลักแพทย์แผนไทยประยุกต์ พร้อมงานวิจัยอ้างอิง",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
