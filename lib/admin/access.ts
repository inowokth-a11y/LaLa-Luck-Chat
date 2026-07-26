// สิทธิ์แอดมิน — จาก env ADMIN_EMAILS (คั่นด้วยจุลภาค) เทียบกับอีเมลผู้ล็อกอิน
// 🔒 default = ไม่มีแอดมินเลย (ปฏิเสธทุกคน) — ปลอดภัยไว้ก่อนถ้าลืมตั้ง env
//    ตั้งค่าใน .env.local (dev) และ Vercel env (prod): ADMIN_EMAILS=you@example.com,other@x.com

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, admins: string[]): boolean {
  if (!email) return false;
  return admins.includes(email.trim().toLowerCase());
}
