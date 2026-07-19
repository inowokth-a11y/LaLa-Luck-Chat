/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // รูปการ์ด 100 ใบเสิร์ฟจาก Supabase Storage (bucket `cards`, public)
    // URL คำนวณจาก NEXT_PUBLIC_SUPABASE_URL ในโค้ด ไม่ฝัง URL เต็ม (ดู CLAUDE.md §1.5)
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
