// metadata ของหน้า /dream (SEO — หน้าเป็น client component จึงประกาศที่ layout)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ทำนายฝัน ตีความฝันตามหลักธาตุ + จิตวิทยา",
  description: "ทำนายฝันจากฐานสัญลักษณ์ 457 แบบ + ธีมจิตวิทยาความฝัน 50 แบบ เชื่อมโยงกับธาตุประจำตัวของคุณ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
