// Omise client — REST ตรง (ไม่ลง SDK: endpoint ที่ใช้มีแค่ create/get charge)
// 🔴 ใช้ SECRET KEY — server เท่านั้น ห้าม import เข้า client component
//
// PromptPay flow: POST /charges (source[type]=promptpay) → ได้ QR ใน
// source.scannable_code.image.download_uri → ผู้ใช้สแกนจ่าย → webhook/polling ตรวจ paid
// เอกสาร: https://docs.opn.ooo/charges-api · จำนวนเงินเป็น "สตางค์" (฿15 → 1500)

const OMISE_API = "https://api.omise.co";

export function isOmiseAvailable(): boolean {
  return Boolean(process.env.OMISE_SECRET_KEY);
}

/** โหมดคีย์ที่ใช้อยู่ — โชว์บน UI กันสับสนตอนเทสต์ (test mode = ไม่มีเงินจริง) */
export function omiseTestMode(): boolean {
  return (process.env.OMISE_SECRET_KEY ?? "").startsWith("skey_test_");
}

export interface OmiseCharge {
  id: string;
  object: string;
  amount: number; // สตางค์
  currency: string;
  status: string; // pending | successful | failed | expired
  paid: boolean;
  expired: boolean;
  metadata?: Record<string, unknown>;
  source?: {
    type?: string;
    scannable_code?: { image?: { download_uri?: string } };
  };
  failure_code?: string | null;
  failure_message?: string | null;
}

async function omiseFetch(path: string, init?: RequestInit): Promise<OmiseCharge> {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key) throw new Error("ยังไม่ได้ตั้ง OMISE_SECRET_KEY");
  const res = await fetch(`${OMISE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json()) as OmiseCharge & { object: string; message?: string; code?: string };
  if (!res.ok || body.object === "error") {
    throw new Error(`Omise ${res.status}: ${body.code ?? ""} ${body.message ?? "request failed"}`);
  }
  return body;
}

/**
 * สร้าง charge PromptPay — จำนวนเงินมาจาก CREDIT_PACKAGES ฝั่ง server เท่านั้น (route เป็นคนคุม)
 * metadata ผูก auth_uid ไว้ให้ settle ฝั่ง server รู้ว่าเติมเข้ากระเป๋าใคร (เราเป็นคนเซ็ตเอง เชื่อได้)
 */
export async function createPromptPayCharge(opts: {
  amountSatang: number;
  authUid: string;
  packageThb: number;
  credits: number;
}): Promise<OmiseCharge> {
  return omiseFetch("/charges", {
    method: "POST",
    body: JSON.stringify({
      amount: opts.amountSatang,
      currency: "thb",
      source: { type: "promptpay" },
      // QR PromptPay หมดอายุตามที่ Omise กำหนด (ดีฟอลต์) — ไม่ตั้ง expires เอง
      metadata: {
        kruth_topup: true,
        auth_uid: opts.authUid,
        package_thb: opts.packageThb,
        credits: opts.credits,
      },
      description: `KRUTH ELEMENT เติมเครดิต ฿${opts.packageThb} (${opts.credits} เครดิต)`,
    }),
  });
}

/** ดึงสถานะ charge จาก Omise ตรงๆ — แหล่งความจริงเดียว (webhook payload ไม่เซ็นลายเซ็น ห้ามเชื่อ) */
export async function getCharge(chargeId: string): Promise<OmiseCharge> {
  if (!/^chrg_[a-z0-9_]+$/i.test(chargeId)) throw new Error("รูปแบบ charge id ไม่ถูกต้อง");
  return omiseFetch(`/charges/${chargeId}`);
}
