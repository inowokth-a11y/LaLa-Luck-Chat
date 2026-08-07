// sitemap.xml (SEO — 3 ส.ค. 2569) — เฉพาะหน้า content สาธารณะ (ไม่รวม /card ดูเหตุผลใน robots.ts)
import type { MetadataRoute } from "next";
import { dreamSeoEntries } from "@/lib/dream/seo";

const BASE = "https://lalaluckychat.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/profile", priority: 0.9 },
    { path: "/lucky-number", priority: 0.9 }, // SEO เฟส 1: ดูดวงทะเบียนรถ (KD 2)
    { path: "/ai", priority: 0.7 }, // SEO เฟส 1: คลัสเตอร์ "ดูดวง ai"
    { path: "/fortune", priority: 0.9 },
    { path: "/dream", priority: 0.9 },
    { path: "/dream-meaning", priority: 0.95 }, // SEO เฟส 2: hub "ทำนายฝัน" (274k/เดือน KD 23)
    { path: "/oracle", priority: 0.8 },
    { path: "/chat", priority: 0.8 },
    { path: "/compatibility", priority: 0.7 },
    { path: "/fengshui", priority: 0.7 },
    { path: "/timing", priority: 0.7 },
    { path: "/wellness", priority: 0.6 },
    { path: "/wellbeing", priority: 0.6 },
    { path: "/logo", priority: 0.5 },
    { path: "/label", priority: 0.5 },
    { path: "/privacy", priority: 0.2 },
  ];
  // หน้าสัญลักษณ์ความฝันรายตัว (เฟส 2) — static ทั้งหมด เนื้อหาไม่เปลี่ยนบ่อย
  const dreamPages = dreamSeoEntries().map((e) => ({
    url: `${BASE}/dream-meaning/${encodeURIComponent(e.slug)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [
    ...pages.map((p) => ({
      url: `${BASE}${p.path}`,
      changeFrequency: "weekly" as const,
      priority: p.priority,
    })),
    ...dreamPages,
  ];
}
