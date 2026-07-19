// ชั้นเชื่อม LINE Messaging API — แยกจาก route handler ให้เทสต์ง่ายและเปลี่ยน provider ได้
//
// ⚠️ ไฟล์นี้ "ส่งข้อความออกไปหาผู้ใช้จริง" — ทุกฟังก์ชันที่ยิงออกต้องเรียกจาก webhook
//    ที่ผ่านการตรวจลายเซ็นแล้วเท่านั้น ห้ามเรียกจาก endpoint ที่เปิดสาธารณะ

import { validateSignature } from "@line/bot-sdk";

const REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const PUSH_URL = "https://api.line.me/v2/bot/message/push";

/** LINE จำกัด 5 ข้อความต่อ 1 reply */
const MAX_MESSAGES_PER_REPLY = 5;
/** ข้อความเดียวยาวได้ไม่เกิน 5,000 ตัวอักษร — เกินแล้ว LINE ตีกลับทั้งก้อน */
const MAX_TEXT_LENGTH = 5000;

export function getChannelSecret(): string | null {
  return process.env.LINE_CHANNEL_SECRET ?? null;
}
export function getAccessToken(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null;
}

/**
 * ตรวจลายเซ็น `x-line-signature`
 * ⚠️ ต้องส่ง **raw body string** เข้ามา ห้าม JSON.parse แล้ว stringify ใหม่ —
 *    การ serialize ใหม่เปลี่ยน byte (ลำดับ key/ช่องว่าง) แล้วลายเซ็นจะไม่ตรงทันที
 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = getChannelSecret();
  if (!secret || !signature) return false;
  try {
    return validateSignature(rawBody, secret, signature);
  } catch {
    return false;
  }
}

export type LineMessage =
  | { type: "text"; text: string }
  | {
      type: "template";
      altText: string;
      template: {
        type: "buttons";
        title?: string;
        text: string;
        actions: Array<{ type: "uri"; label: string; uri: string }>;
      };
    };

/** ตัดข้อความให้อยู่ในลิมิตของ LINE (ตัดแล้วบอกผู้ใช้ ไม่ตัดเงียบๆ) */
export function clampText(s: string): string {
  if (s.length <= MAX_TEXT_LENGTH) return s;
  const suffix = "\n\n(ข้อความยาวเกินกว่าที่ LINE แสดงได้ จึงตัดบางส่วนออก)";
  return s.slice(0, MAX_TEXT_LENGTH - suffix.length) + suffix;
}

export function textMessage(text: string): LineMessage {
  return { type: "text", text: clampText(text) };
}

/** ปุ่มเปิด LIFF สำหรับ Logic ที่ต้องเห็นภาพ/โต้ตอบ (CLAUDE.md §1) */
export function liffButton(title: string, text: string, label: string, uri: string): LineMessage {
  return {
    type: "template",
    altText: `${title} — เปิดใน LINE เพื่อดูผลลัพธ์`,
    template: {
      type: "buttons",
      title: title.slice(0, 40),
      text: clampText(text).slice(0, 60),
      actions: [{ type: "uri", label: label.slice(0, 20), uri }],
    },
  };
}

export interface ReplyResult {
  ok: boolean;
  status?: number;
  error?: string;
}

async function post(url: string, payload: Record<string, unknown>): Promise<ReplyResult> {
  const token = getAccessToken();
  if (!token) return { ok: false, error: "ไม่มี LINE_CHANNEL_ACCESS_TOKEN" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 300) };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * ตอบกลับด้วย replyToken — **ฟรี ไม่กินโควตาข้อความของ LINE OA**
 *
 * ⚠️ LINE ระบุว่า *"don't rely on the time limit for implementation, and use reply tokens
 *    as soon as possible"* — อายุ token เปลี่ยนได้โดยไม่แจ้งล่วงหน้า **ห้ามออกแบบโดยเดาว่า
 *    token อยู่ได้กี่วินาที** งานที่ใช้เวลานานต้องใช้ pushMessage() แทน
 *
 * ไม่ throw เพื่อไม่ให้ webhook คืน 500 แล้วโดน LINE retry ซ้ำ
 */
export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<ReplyResult> {
  return post(REPLY_URL, { replyToken, messages: messages.slice(0, MAX_MESSAGES_PER_REPLY) });
}

/**
 * ส่งข้อความหาผู้ใช้โดยตรง (ไม่ใช้ replyToken) — ใช้กับงานที่ประมวลผลนาน
 *
 * 💰 **มีค่าใช้จ่าย** — push message กินโควตาข้อความของ LINE OA ต่างจาก reply ที่ฟรี
 *    จึงใช้เฉพาะเมื่อจำเป็นจริงๆ (ตอบทันทีไม่ได้) ไม่ใช่ใช้แทน reply ทุกกรณี
 */
export async function pushMessage(
  userId: string,
  messages: LineMessage[]
): Promise<ReplyResult> {
  return post(PUSH_URL, { to: userId, messages: messages.slice(0, MAX_MESSAGES_PER_REPLY) });
}
