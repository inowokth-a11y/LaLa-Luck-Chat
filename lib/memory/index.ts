// ความจำแม่หมอ — ส่วนที่แตะ DB/AI (เฟส 3) · 🔴 server เท่านั้น (service role)
//
// ทุกฟังก์ชัน fire-and-forget ได้: ความจำพัง/ช้า **ต้องไม่ทำให้คำทำนายพังหรือช้าลง**
// (บันทึกหลังตอบ · อ่านก่อนตอบแบบ best-effort — อ่านพัง = ไม่มีความจำ ไม่ใช่ error)

import { createServiceClient } from "@/lib/supabase/server";
import { generate } from "@/lib/ai";
import {
  compactEvent,
  formatMemoryBlock,
  buildSummarizerPrompt,
  shouldSummarize,
  truncate,
  RECENT_EVENTS,
  SUMMARIZE_WINDOW,
  MEMORY_SUMMARY_MAX,
  type HistoryKind,
  type HistoryContent,
} from "./format";

export type { HistoryKind, HistoryContent } from "./format";

/**
 * บันทึกเหตุการณ์ + ถ้าครบเกณฑ์ → สรุปใหม่เบื้องหลัง (ไม่ block)
 * เรียกหลังตอบผู้ใช้สำเร็จเท่านั้น (เหตุการณ์ที่ล้มเหลว/ถูก gate ไม่ใช่ความจำ)
 */
export async function rememberEvent(authUid: string, kind: HistoryKind, content: HistoryContent): Promise<void> {
  try {
    const svc = createServiceClient();
    const compact: HistoryContent = {
      ...(content.q ? { q: truncate(content.q, 200) } : {}),
      ...(content.a ? { a: truncate(content.a, 240) } : {}),
      ...(content.tag ? { tag: truncate(content.tag, 40) } : {}),
    };
    const { data, error } = await svc.rpc("log_user_history", {
      p_auth_uid: authUid,
      p_kind: kind,
      p_content: compact,
    });
    if (error) {
      console.warn("[memory] บันทึกประวัติไม่สำเร็จ", error.message);
      return;
    }
    if (typeof data === "number" && shouldSummarize(data)) {
      // fire-and-forget — การสรุปห้ามหน่วง response
      void refreshSummary(authUid).catch((e) => console.warn("[memory] สรุปพัง (ไม่กระทบผู้ใช้)", e));
    }
  } catch (e) {
    console.warn("[memory] rememberEvent error", e);
  }
}

interface HistoryRow {
  kind: HistoryKind;
  content: HistoryContent;
  created_at: string;
}

/** บล็อกความจำสำหรับ inject เข้า prompt — null ถ้าไม่มี/อ่านพัง (แม่หมอตอบได้ตามปกติ) */
export async function getMemoryBlock(authUid: string): Promise<string | null> {
  try {
    const svc = createServiceClient();
    const [mem, hist] = await Promise.all([
      svc.from("user_memory_e").select("summary").eq("auth_uid", authUid).maybeSingle(),
      svc
        .from("user_history_e")
        .select("kind, content, created_at")
        .eq("auth_uid", authUid)
        .order("created_at", { ascending: false })
        .limit(RECENT_EVENTS),
    ]);
    const rows = ((hist.data ?? []) as HistoryRow[]).reverse(); // เก่า→ใหม่ อ่านลื่นกว่า
    const lines = rows.map((r) => compactEvent(r.kind, r.content, r.created_at.slice(0, 10)));
    return formatMemoryBlock(mem.data?.summary ?? null, lines);
  } catch (e) {
    console.warn("[memory] อ่านความจำพัง — ตอบต่อแบบไม่มีความจำ", e);
    return null;
  }
}

/** สรุปประวัติใหม่ด้วย Haiku (role "memory" — Claude เท่านั้น) แล้วรีเซ็ตตัวนับ */
export async function refreshSummary(authUid: string): Promise<void> {
  const svc = createServiceClient();
  const [mem, hist] = await Promise.all([
    svc.from("user_memory_e").select("summary").eq("auth_uid", authUid).maybeSingle(),
    svc
      .from("user_history_e")
      .select("kind, content, created_at")
      .eq("auth_uid", authUid)
      .order("created_at", { ascending: false })
      .limit(SUMMARIZE_WINDOW),
  ]);
  const rows = ((hist.data ?? []) as HistoryRow[]).reverse();
  if (rows.length === 0) return;

  const lines = rows.map((r) => compactEvent(r.kind, r.content, r.created_at.slice(0, 10)));
  const ai = await generate({
    role: "memory",
    channel: "memory",
    userId: authUid,
    system: "คุณคือผู้ช่วยสรุปบันทึก ตอบเป็นข้อความสรุปภาษาไทยล้วนๆ เท่านั้น",
    input: buildSummarizerPrompt(mem.data?.summary ?? null, lines),
    maxTokens: 800,
  });
  const summary = truncate(ai.text, MEMORY_SUMMARY_MAX);
  if (!summary) return;

  const { error } = await svc
    .from("user_memory_e")
    .update({ summary, summary_updated_at: new Date().toISOString(), events_since_summary: 0, updated_at: new Date().toISOString() })
    .eq("auth_uid", authUid);
  if (error) console.warn("[memory] บันทึกสรุปไม่สำเร็จ", error.message);
}
