import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Refresh session ทุก request ที่ไม่ใช่ static/asset — จำเป็นสำหรับ @supabase/ssr
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // ทุก path ยกเว้นไฟล์ static / รูป / favicon (กัน middleware ทำงานฟรีกับ asset)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
