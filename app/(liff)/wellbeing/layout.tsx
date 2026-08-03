// metadata ของหน้า /wellbeing (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LaLa Wellbeing Check — เช็คสุขภาวะใจ 25 ข้อ ฟรี",
  description: "แบบประเมินสุขภาวะ 5 มิติ พร้อมกราฟ จุดแข็ง และคำแนะนำดูแลใจสไตล์แม่หมอลาลา — ฟรี ไม่จำกัด",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
