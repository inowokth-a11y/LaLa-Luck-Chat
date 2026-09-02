"use client";

// แท็บกลับหน้าแรก มุมซ้ายบน — ทุกโหมด (ผู้ใช้สั่ง 2 ก.ย. 2569)
// อยู่ใน root layout จุดเดียว → มีผลทุกหน้าอัตโนมัติ · ซ่อนเฉพาะหน้าแรกเอง
// สไตล์ชุดเดียวกับชิปสถานะมุมขวาบน (พื้นเข้ม+ตัวทอง — บทเรียน 4 ส.ค. 2569 พื้นทองกลืนหินอ่อน)

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeTab() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 50,
        fontFamily: "var(--font-sans-thai), sans-serif",
        fontSize: "0.8rem",
      }}
    >
      <Link
        href="/"
        title="กลับหน้าแรก"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.35rem 0.8rem",
          borderRadius: 999,
          textDecoration: "none",
          fontWeight: 600,
          color: "var(--gold, #e7c96a)",
          background: "#221c14",
          border: "1px solid color-mix(in srgb, var(--gold, #b8860b) 55%, transparent)",
          backdropFilter: "blur(6px)",
          whiteSpace: "nowrap",
        }}
      >
        {/* จอแคบ (<430px) เหลือไอคอนอย่างเดียว — กันชนชิปสถานะผู้ล็อกอิน (กว้างสุด 72vw) */}
        <style>{`@media (max-width: 430px){ .home-tab-label{ display: none } }`}</style>
        🏠<span className="home-tab-label"> หน้าแรก</span>
      </Link>
    </div>
  );
}
