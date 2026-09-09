// metadata ของหน้า /cat (SEO — หน้าเป็น client component จึงประกาศที่ layout)
// 9 ก.ย. 2569: ปรับ title/description ตามคลัสเตอร์คีย์เวิร์ดจริง (แมวมงคล 17 ชนิด · สีแมวถูกโฉลกตามวันเกิด)
// + FAQPage JSON-LD (คำถามชุดเดียวกับที่แสดงบนหน้า — lib/cat/seo.ts)
import type { Metadata } from "next";
import { catHubFaq } from "@/lib/cat/seo";

export const metadata: Metadata = {
  title: "ดูดวงแมว แมวมงคล 17 ชนิดตามตำรา สีแมวถูกโฉลกตามวันเกิด",
  description:
    "ดูดวงแมวจากตำราแมวศุภลักษณ์ (สมุดข่อยโบราณ) เลือกสีขน ลาย สีตา รู้ทันทีว่าเป็นแมวมงคลชนิดไหน ให้คุณด้านใด " +
    "พร้อมตารางเลี้ยงแมวสีอะไรถูกโฉลกตามวันเกิด และความเข้ากันของธาตุแมวกับดวงเจ้าของ ฟรี",
  alternates: { canonical: "/cat" },
  keywords: ["ดูดวงแมว", "แมวมงคล", "แมวมงคล 17 ชนิด", "ตำราแมว", "แมวศุภลักษณ์", "สีแมวถูกโฉลก", "เลี้ยงแมวสีอะไรเสริมดวง", "แมวไทยโบราณ"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: catHubFaq().map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      {children}
    </>
  );
}
