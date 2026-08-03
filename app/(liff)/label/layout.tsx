// metadata ของหน้า /label (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ออกแบบฉลากสินค้าตามหลักธาตุ — ไฟล์พิมพ์จริง",
  description: "ประกอบฉลากสินค้าขนาดพิมพ์ 300 DPI ลวดลายและสีตามธาตุมงคล พร้อมไฟล์ PDF สำหรับโรงพิมพ์",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
