// robots.txt (SEO — 3 ส.ค. 2569): เปิดให้เก็บหน้า content · ปิดหน้าระบบ/ส่วนตัว
//
// 🔴 /card/ ปิดจาก search engine โดยเจตนา — หน้านั้น redirect คนจริงไปหน้าแรก (เสิร์ฟเฉพาะ
//    social crawler เพื่อรูป OG) ถ้าปล่อยให้ Google index จะเข้าข่าย cloaking (bot เห็นเนื้อหา
//    คนเห็น redirect) เสี่ยงโดนลงโทษทั้งโดเมน — ถ้าอยากให้การ์ด 100 ใบเป็นหน้า SEO ต้องเลิก
//    redirect คนจริงก่อน (ตัดสินใจร่วมกับผู้ใช้)
//
// 🔴 แต่ crawler โซเชียล (facebookexternalhit ฯลฯ) **เคารพ robots.txt ด้วย** — Disallow /card/
//    แบบเหมารวมทำให้ Facebook สเครปหน้าแชร์การ์ดไม่ได้เลย (Sharing Debugger ขึ้น 403
//    "could be due to a robots.txt block" — ผู้ใช้เจอจริง 9 ส.ค. 2569 ทั้งที่รูป OG พร้อม)
//    → เปิดกลุ่ม UA เฉพาะของโซเชียลให้เข้า /card/ ได้ (กลุ่ม UA เจาะจงชนะกลุ่ม * ตามสเปก
//    robots.txt) ส่วน Googlebot/บอทอื่นยังโดน Disallow ตามเดิม = จุดยืน SEO ไม่เปลี่ยน
import type { MetadataRoute } from "next";

/** crawler ของโซเชียลที่ต้องดึงหน้า /card/ ไปทำพรีวิวแชร์ (ไม่ใช่ search engine — ไม่มีผล index) */
const SOCIAL_CRAWLERS = ["facebookexternalhit", "Facebot", "Twitterbot", "LinkedInBot", "Line-poker"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...SOCIAL_CRAWLERS.map((ua) => ({
        userAgent: ua,
        // /s/ = หน้าแชร์ face-card ส่วนบุคคล — โซเชียลต้องสเครปได้ (พรีวิว OG) เช่นเดียวกับ /card/
        allow: ["/card/", "/s/"],
        disallow: ["/api/", "/admin", "/account", "/auth/", "/onboarding", "/login", "/consent", "/welcome"],
      })),
      {
        userAgent: "*",
        allow: "/",
        // /s/ ปิดจาก search engine — หน้าส่วนบุคคลที่ผู้ใช้เลือกแชร์เอง ไม่ใช่หน้า SEO (มี noindex ซ้ำอีกชั้น)
        disallow: ["/api/", "/admin", "/account", "/auth/", "/onboarding", "/login", "/consent", "/welcome", "/card/", "/s/"],
      },
    ],
    sitemap: "https://lalaluckychat.com/sitemap.xml",
  };
}
