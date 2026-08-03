// metadata ของหน้า /chat (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ถามอาจารย์ลาลา ลักกี้ — AI ดูดวงที่คำนวณจริง",
  description: "ถามดวง เลขมงคล ทะเบียนรถ เบอร์โทร คำปรึกษาชีวิต — ตอบจากการคำนวณจริง ไม่ใช่การเดา",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
