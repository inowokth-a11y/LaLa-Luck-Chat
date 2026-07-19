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
      <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "2rem" }}>
        KRUTH ELEMENT
      </h1>
      <p style={{ fontFamily: "var(--font-sans-thai)", opacity: 0.8 }}>
        Platform E — โครง Next.js พร้อมแล้ว
      </p>
      <nav style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <a
          href="/profile"
          style={{
            fontFamily: "var(--font-sans-thai)",
            color: "var(--bg)",
            background: "var(--gold)",
            padding: "0.7rem 1.6rem",
            textDecoration: "none",
          }}
        >
          🔮 โปรไฟล์พลังงาน (Logic 1)
        </a>
        <a
          href="/fortune"
          style={{
            fontFamily: "var(--font-sans-thai)",
            color: "var(--gold)",
            border: "1px solid var(--gold)",
            padding: "0.7rem 1.6rem",
            textDecoration: "none",
          }}
        >
          ✨ ดวงของฉัน (Logic 8-11)
        </a>
        <a
          href="/dream"
          style={{
            fontFamily: "var(--font-sans-thai)",
            color: "var(--gold)",
            border: "1px solid var(--gold)",
            padding: "0.7rem 1.6rem",
            textDecoration: "none",
          }}
        >
          🌙 ทำนายฝัน (Logic 4 · AI)
        </a>
        <a
          href="/oracle"
          style={{
            fontFamily: "var(--font-sans-thai)",
            color: "var(--gold)",
            border: "1px solid var(--gold)",
            padding: "0.7rem 1.6rem",
            textDecoration: "none",
          }}
        >
          🔮 เสี่ยงทาย (Logic 21 · AI)
        </a>
      </nav>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          opacity: 0.5,
          marginTop: "1.5rem",
        }}
      >
        Phase 4 · profile page live
      </p>
    </main>
  );
}
