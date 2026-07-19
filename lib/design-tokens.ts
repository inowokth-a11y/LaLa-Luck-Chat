// แหล่งสีเดียวของทั้งแอป (CLAUDE.md §2) — สกัดจาก legacy-artifacts/*.html
// เดิมแต่ละ HTML copy-paste ค่าสีซ้ำกันเอง เสี่ยง drift — รวมมาไว้ที่นี่ที่เดียว
//
// ค่าเดียวกันนี้ถูก mirror เป็น CSS variables ใน app/globals.css (.tone-night / .tone-marble)
// ใช้ไฟล์นี้เมื่อต้องการค่าใน JS/TS (เช่น chart, canvas, inline style) — ห้าม hardcode hex ที่อื่น

// สีธาตุทั้ง 5 (Wu Xing) — ค่าต่างกันตามโทนเพื่อ contrast ที่อ่านออกในแต่ละพื้นหลัง
export const elementColors = {
  // โทนมืด (พื้นเข้ม → สีสด)
  night: {
    wood: "#3f7a5c",
    fire: "#c9432b",
    earth: "#c99a3d",
    metal: "#b9ae9a",
    water: "#2c5a72",
  },
  // โทนสว่างหินอ่อน (พื้นสว่าง → สีเข้มลง)
  marble: {
    wood: "#2f5c42",
    fire: "#a83a1e",
    earth: "#a97c1f",
    metal: "#7a7267",
    water: "#1f4d63",
  },
} as const;

// 🌑 โทนมืด — พิธีกรรม/โต้ตอบสด (Oracle Draw, Dream Chat)
export const nightTone = {
  bg: "#0a0714",
  bg2: "#14101c",
  gold: "#f2e6c8",
  goldDim: "#a89870",
  ink: "#ece6da",
  inkDim: "#a89cb0",
  // เฉพาะ Oracle dual-ring
  ringA: "#7a5c9e",
  ringB: "#5c8a9e",
  orbCore: "#fff6e0",
  orbMid: "#b48ee0",
  orbEdge: "#3a2a5e",
  // เฉพาะ Dream chat
  bubbleBot: "#241c30",
  bubbleUser: "#3a2f4a",
  element: elementColors.night,
} as const;

// ☀️ โทนสว่างหินอ่อน — ข้อมูล/ผลลัพธ์ถาวร (Profile, Fortune, Compatibility)
export const marbleTone = {
  marbleBg: "#f4f0e6",
  marbleVein: "#e2d8c3",
  gold: "#b8860b",
  goldBright: "#d4a72c",
  ink: "#2b2620",
  inkDim: "#6b6255",
  cardBg: "#fffdf8",
  good: "#2f6b3f",
  bad: "#a83a1e",
  neutral: "#6b6255",
  clash: "#b8860b",
  element: elementColors.marble,
} as const;

export type ElementKey = keyof typeof elementColors.night;
