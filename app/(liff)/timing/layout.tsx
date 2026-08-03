// metadata ของหน้า /timing (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "หาฤกษ์ดี วันมงคล — เปิดบริษัท ออกรถ ขึ้นบ้านใหม่",
  description: "จัดอันดับวันดีจากกาลโยคและยามอุบากอง เลือกฤกษ์เปิดบริษัท ออกรถ ขึ้นบ้านใหม่ เจรจาธุรกิจ — ฟรี",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
