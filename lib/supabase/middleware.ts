// Refresh Supabase session ทุก request (ตามแพทเทิร์นมาตรฐาน @supabase/ssr สำหรับ App Router)
// เรียกจาก middleware.ts ราก — ต่ออายุ token ให้ cookie ก่อนถึง route/RSC เพื่อไม่ให้ session หลุด

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // สำคัญ: เรียก getUser() เพื่อ refresh — อย่าใส่โค้ดระหว่าง createServerClient กับตรงนี้
  await supabase.auth.getUser();

  return response;
}
