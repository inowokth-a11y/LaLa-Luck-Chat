const TOOLS: { href: string; label: string; primary?: boolean }[] = [
  { href: "/chat", label: "💬 ถามอาจารย์ลาลา (วิเคราะห์อิสระ · AI)", primary: true },
  { href: "/profile", label: "🔮 โปรไฟล์พลังงาน (Logic 1)" },
  { href: "/fortune", label: "✨ ดวงของฉัน (Logic 8-11)" },
  { href: "/compatibility", label: "🤝 ข่ายความสัมพันธ์ (Logic 20)" },
  { href: "/fengshui", label: "🧭 ฮวงจุ้ย (Logic 7)" },
  { href: "/dream", label: "🌙 ทำนายฝัน (Logic 4 · AI)" },
  { href: "/oracle", label: "🎴 เสี่ยงทาย (Logic 21 · AI)" },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        background: "var(--bg)",
        color: "var(--gold)",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "2rem" }}>KRUTH ELEMENT</h1>
      <p style={{ fontFamily: "var(--font-sans-thai)", opacity: 0.8 }}>
        แพลตฟอร์มดูดวงที่ &ldquo;คำนวณจริง&rdquo; — ธาตุ · โหราศาสตร์ไทย · ตัวเลข
      </p>
      <nav
        style={{
          marginTop: "1.5rem",
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
              color: t.primary ? "var(--bg)" : "var(--gold)",
              background: t.primary ? "var(--gold)" : "transparent",
              border: "1px solid var(--gold)",
              padding: "0.7rem 1.6rem",
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            {t.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
