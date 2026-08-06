// metadata หน้า SEO "ดูดวงทะเบียนรถ/เบอร์โทร" (เฟส 1 SEO — 6 ส.ค. 2569)
// คีย์เวิร์ดเป้า: ดูดวงทะเบียนรถ (15.9k/เดือน KD 2) · ดูดวงเบอร์มือถือ/เบอร์โทรศัพท์ (~19.6k)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดูดวงทะเบียนรถ เบอร์โทร บ้านเลขที่ ฟรี — คะแนน 5 ด้านทันที",
  description:
    "ดูดวงทะเบียนรถ เบอร์มือถือ บ้านเลขที่ ฟรีไม่ต้องสมัคร — คำนวณคะแนน 5 ด้าน (การเงิน ความรัก สุขภาพ โชค บารมี) จากเลขศาสตร์และหลักธาตุ พร้อมจุดเด่นและข้อควรระวังของเลขคุณ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
