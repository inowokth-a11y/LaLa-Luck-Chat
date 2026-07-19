import type { Config } from "tailwindcss";

// สีจริงทั้งสองโทนถูกนิยามเป็น CSS variables ใน app/globals.css (ดู CLAUDE.md §2)
// ที่นี่แค่ map ให้ Tailwind เรียกผ่าน utility ได้ — เพิ่มเติมตอน Phase 2 (design tokens)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // โทนมืด (พิธีกรรม: Oracle/Dream)
        night: "var(--bg)",
        gold: "var(--gold)",
        // โทนสว่างหินอ่อน (ข้อมูล: Profile/Fortune/Compatibility)
        marble: "var(--marble-bg)",
      },
      fontFamily: {
        serifThai: ["var(--font-serif-thai)", "serif"],
        sansThai: ["var(--font-sans-thai)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
