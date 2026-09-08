// metadata ของหน้า /cat/lost (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แมวหาย ตามหาแมวหายยังไง — วางแผนค้นตามทิศ ระยะ และฤกษ์ออกค้น",
  description:
    "แมวหายต้องค้นตรงไหนก่อน? วางแผนลำดับการค้นจากสถิติงานวิจัยแมวหาย 1,210 ตัว + ภูมิประเทศรอบบ้าน + ฤกษ์ออกค้นตามตำรา พร้อมรายการปฏิบัติที่ช่วยหาแมวเจอจริง ฟรี ไม่ต้องสมัคร",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
