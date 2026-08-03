// metadata ของหน้า /fortune (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดูดวงรายวัน รายเดือน รายปี จากลัคนา",
  description: "ดูดวงวันนี้ ดวงรายเดือน ดวงรายปี คำนวณจากลัคนาและตำแหน่งดาวจริงตามโหราศาสตร์ไทย — ฟรี",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
