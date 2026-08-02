// สะพานส่ง context จากหน้าฟังก์ชัน → แชทลอย LalaFloat (client เท่านั้น — ใช้ CustomEvent)
//
// หน้าฟังก์ชันคำนวณผลแล้ว publish payload · LalaFloat (root layout) subscribe แล้วสลับโหมด:
// มี context = ตอบอิงผลบนหน้า (logicId+context) · ไม่มี = โหมด plan (AI เลือก engine เอง)
// เก็บค่าล่าสุดไว้ replay ให้ subscriber ที่ mount ทีหลัง (ลำดับ mount ไม่แน่นอน)

export interface ChatContextPayload {
  logicId: number;
  context: unknown;
  placeholder?: string;
  /** ข้อความชวนจากแม่หมอ (ใช้ตอน onboarding) — ถ้ามีจะข้าม nudge อัตโนมัติ (ไม่เด้งซ้อน) */
  invite?: string;
}

const EVT = "lala:chat-context";
let last: ChatContextPayload | null = null;

export function publishChatContext(p: ChatContextPayload | null): void {
  if (typeof window === "undefined") return;
  last = p;
  window.dispatchEvent(new CustomEvent(EVT, { detail: p }));
}

/** subscribe + รับค่าล่าสุดทันที — คืนฟังก์ชัน cleanup */
export function onChatContext(cb: (p: ChatContextPayload | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent).detail ?? null);
  window.addEventListener(EVT, handler);
  cb(last);
  return () => window.removeEventListener(EVT, handler);
}
