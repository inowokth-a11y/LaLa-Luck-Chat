/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /lucky-number ถูกยุบเข้าโหมด "ทำนายแบบองค์รวม" (/compatibility) — ผู้ใช้สั่ง 22 ส.ค. 2569
  // 301 ถาวรเพื่อรักษาลิงก์เดิม/อันดับที่เคยได้ (หน้าเคยอยู่ใน sitemap + GSC)
  async redirects() {
    return [{ source: "/lucky-number", destination: "/compatibility", permanent: true }];
  },
  // 🔴 บังคับ pack ฟอนต์ไทยเข้า lambda ของ route ที่วาดรูป OG — การ trace อัตโนมัติเคยหลุด
  // บน Vercel (ENOENT /var/task/assets/NotoSansThai-SemiBold.ttf → OG การ์ด 500 ทั้งที่ local ปกติ
  // เจอจริง 3 ส.ค. 2569) อย่าพึ่ง trace อัตโนมัติกับไฟล์ asset ที่อ่านด้วย fs อีก
  outputFileTracingIncludes: {
    "/card/[id]/opengraph-image": ["./assets/**"],
    "/opengraph-image": ["./assets/**"],
    // face-card: OG หน้าแชร์ส่วนบุคคล + สตอรี่ IG — ใช้ฟอนต์ไทยไฟล์เดียวกัน
    "/s/[token]/opengraph-image": ["./assets/**"],
    "/s/[token]/story": ["./assets/**"],
    "/sm/[token]/opengraph-image": ["./assets/**"],
  },
  images: {
    // รูปการ์ด 100 ใบเสิร์ฟจาก Supabase Storage (bucket `cards`, public)
    // URL คำนวณจาก NEXT_PUBLIC_SUPABASE_URL ในโค้ด ไม่ฝัง URL เต็ม (ดู CLAUDE.md §1.5)
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
