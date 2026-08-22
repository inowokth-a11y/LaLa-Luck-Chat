// metadata ของหน้า /compatibility (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

// รับช่วงคีย์เวิร์ด ทะเบียนรถ/เบอร์โทร/บ้านเลขที่ จาก /lucky-number ที่ 301 มาที่นี่ (22 ส.ค. 2569)
export const metadata: Metadata = {
  title: "ทำนายแบบองค์รวม — ดูดวงบ้านเลขที่ ทะเบียนรถ เบอร์โทร เข้ากับดวงคุณ",
  description:
    "คะแนน 5 ด้านของบ้านเลขที่ ทะเบียนรถ เบอร์โทร และคนรอบตัว พร้อมความสอดคล้องกับธาตุประจำตัวคุณ — คำนวณจากเลขศาสตร์และหลักเบญจธาตุจริง ฟรี",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
