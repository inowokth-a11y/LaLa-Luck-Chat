// metadata ของหน้า /logo (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ออกแบบโลโก้ตามธาตุมงคล",
  description: "สร้างโลโก้ที่สไตล์และสีตรงกับธาตุของคุณหรือแบรนด์ ด้วย AI พร้อมคะแนนความเข้ากันตามหลักเบญจธาตุ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
