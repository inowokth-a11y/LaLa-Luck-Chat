// sitemap.xml (SEO — 3 ส.ค. 2569) — เฉพาะหน้า content สาธารณะ (ไม่รวม /card ดูเหตุผลใน robots.ts)
import type { MetadataRoute } from "next";

const BASE = "https://lalaluckychat.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/profile", priority: 0.9 },
    { path: "/lucky-number", priority: 0.9 }, // SEO เฟส 1: ดูดวงทะเบียนรถ (KD 2)
    { path: "/ai", priority: 0.7 }, // SEO เฟส 1: คลัสเตอร์ "ดูดวง ai"
    { path: "/fortune", priority: 0.9 },
    { path: "/dream", priority: 0.9 },
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
  return pages.map((p) => ({
    url: `${BASE}${p.path}`,
    changeFrequency: "weekly" as const,
    priority: p.priority,
  }));
}
