// metadata ของหน้า /compatibility (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดูดวงความเข้ากัน — คน บ้าน รถ เบอร์โทร องค์กร",
  description: "คำนวณความเข้ากันของธาตุระหว่างคุณกับคนรอบตัว บ้าน รถ เบอร์โทร และองค์กร ตามหลักเบญจธาตุ — ฟรี",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
