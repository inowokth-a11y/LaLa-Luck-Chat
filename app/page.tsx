import Link from "next/link";
import MascotLogo from "./_components/MascotLogo";

// หน้าแรก — โทนสว่างหินอ่อนตัดทอง (ผู้ใช้เลือกภาพอ้างอิง 1 ส.ค. 2569 — เดิมเป็นโทนมืด)
// ชื่อแบรนด์ที่ผู้ใช้เห็น = "LaLa Lucky Chat" (KRUTH ELEMENT เป็นชื่อระบบภายใน/เอกสาร)

const TOOLS: { href: string; label: string; primary?: boolean }[] = [
  { href: "/chat", label: "💬 ถามอาจารย์ลาลา ลักกี้ (วิเคราะห์อิสระ)", primary: true },
  { href: "/profile", label: "🔮 โปรไฟล์พลังงาน" },
  { href: "/fortune", label: "✨ ดวงของฉัน" },
  { href: "/compatibility", label: "🤝 ข่ายความสัมพันธ์" },
  { href: "/fengshui", label: "🧭 ฮวงจุ้ย" },
  { href: "/dream", label: "🌙 ทำนายฝัน" },
  { href: "/oracle", label: "🎴 เสี่ยงทาย" },
  { href: "/wellness", label: "🥗 อาหาร & กิจกรรมตามธาตุ" },
];

export default function Home() {
  return (
    <main
      className="tone-marble"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.1rem",
        color: "var(--ink)",
        textAlign: "center",
        padding: "2rem 1rem 3rem",
      }}
    >
      {/* กรอบทอง + หินอ่อนตามภาพอ้างอิง */}
      <div className="gold-frame" style={{ width: "100%", maxWidth: 420 }}>
        <div className="gold-frame-inner" style={{ padding: "1.8rem 1.2rem 1.4rem" }}>
          <MascotLogo size={150} />
          <h1
            style={{
              fontFamily: "var(--font-serif-thai)",
              fontSize: "2rem",
              color: "var(--gold)",
              margin: "0.4rem 0 0",
              letterSpacing: "0.01em",
            }}
          >
            LaLa Lucky Chat
          </h1>
          <p style={{ fontFamily: "var(--font-sans-thai)", color: "var(--ink-dim)", marginTop: "0.45rem", fontSize: "0.92rem" }}>
            แพลตฟอร์มดูดวงที่ &ldquo;คำนวณจริง&rdquo; — ธาตุ · โหราศาสตร์ไทย · ตัวเลข
          </p>
        </div>
      </div>

      <nav
        style={{
          marginTop: "0.4rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        {TOOLS.map((t) => (
          <a
            key={t.href}
            href={t.href}
            style={{
              fontFamily: "var(--font-sans-thai)",
              color: t.primary ? "#fffdf8" : "var(--ink)",
              background: t.primary
                ? "linear-gradient(135deg, #c9992a, var(--gold) 60%, #96700a)"
                : "var(--card-bg)",
              border: t.primary ? "1px solid var(--gold)" : "1px solid var(--gold-dim, #cbb98f)",
              boxShadow: "0 2px 8px rgba(110, 82, 16, 0.10)",
              padding: "0.7rem 1.6rem",
              textDecoration: "none",
              borderRadius: "10px",
            }}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <Link
        href="/login"
        style={{
          fontFamily: "var(--font-sans-thai)",
          fontSize: "0.85rem",
          color: "var(--gold)",
          marginTop: "0.6rem",
          textDecoration: "underline",
        }}
      >
        เข้าสู่ระบบ / สมัครสมาชิก
      </Link>
    </main>
  );
}
