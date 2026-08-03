// robots.txt (SEO — 3 ส.ค. 2569): เปิดให้เก็บหน้า content · ปิดหน้าระบบ/ส่วนตัว
// 🔴 /card/ ปิดจาก search engine โดยเจตนา — หน้านั้น redirect คนจริงไปหน้าแรก (เสิร์ฟเฉพาะ
//    social crawler เพื่อรูป OG) ถ้าปล่อยให้ Google index จะเข้าข่าย cloaking (bot เห็นเนื้อหา
//    คนเห็น redirect) เสี่ยงโดนลงโทษทั้งโดเมน — ถ้าอยากให้การ์ด 100 ใบเป็นหน้า SEO ต้องเลิก
//    redirect คนจริงก่อน (ตัดสินใจร่วมกับผู้ใช้)
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/account", "/auth/", "/onboarding", "/login", "/consent", "/welcome", "/card/"],
      },
    ],
    sitemap: "https://lalaluckychat.com/sitemap.xml",
  };
}
