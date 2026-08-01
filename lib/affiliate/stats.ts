// สถิติต่อลิงก์แอฟฟิลิเอต — ตรรกะล้วน (server ดึงแถวจาก DB แล้วส่งเข้ามา, เทสต์รันตรงๆ ได้)
//
// รายรับ (บาท) คำนวณจาก ledger การเติมเงิน (action 'topup:%') ของผู้ใช้ที่ถูกผูกกับลิงก์:
// delta เครดิต → เทียบกลับเป็นแพ็กราคา (verifyChargeForGrant รับเฉพาะยอดตรงแพ็ก delta จึง
// ตรงกับแพ็กเสมอในทางปฏิบัติ) — ถ้าแพ็กเปลี่ยนในอนาคตจน delta เก่าไม่ตรงแพ็กไหน จะนับเครดิตได้
// แต่ตีเป็นบาทไม่ได้ → ธง revenueUncertain ให้แดชบอร์ดบอกตรงๆ แทนการเดา

import { CREDIT_PACKAGES } from "@/lib/credits/pricing";

export interface AffLinkRow {
  id: string;
  code: string;
  partner_name: string;
  note: string | null;
  active: boolean;
  visit_count: number;
  created_at: string;
}

export interface AttributionRow {
  auth_uid: string;
  link_id: string;
}

/** แถว ledger เฉพาะการเติมเงิน (delta > 0, action like 'topup:%') */
export interface TopupRow {
  auth_uid: string;
  delta: number;
}

export interface LinkStats extends AffLinkRow {
  /** ผู้ใช้ใหม่ที่สมัครผ่านลิงก์นี้ */
  signups: number;
  /** ในนั้นมีกี่คนที่เติมเงินจริง (ตัววัดคุณภาพ traffic ของพันธมิตร) */
  payingUsers: number;
  /** จำนวนครั้งเติมเงินรวม */
  topupCount: number;
  /** เครดิตที่ขายได้รวม */
  creditsSold: number;
  /** รายรับรวม (บาท) จากแพ็กที่รู้จัก */
  revenueThb: number;
  /** true = มีรายการเติมที่เทียบแพ็กไม่ได้ (revenueThb ต่ำกว่าจริง) */
  revenueUncertain: boolean;
}

/** delta เครดิตของการเติม 1 ครั้ง → ราคาแพ็ก (บาท) · ไม่ตรงแพ็กไหน = null */
export function thbForTopupCredits(delta: number): number | null {
  return CREDIT_PACKAGES.find((p) => p.credits === delta)?.priceThb ?? null;
}

export function computeAffiliateStats(
  links: AffLinkRow[],
  attributions: AttributionRow[],
  topups: TopupRow[]
): LinkStats[] {
  // ผู้ใช้ → ลิงก์ (attribution เป็น first-touch: 1 ผู้ใช้มีแถวเดียวโดย schema)
  const linkOfUser = new Map<string, string>();
  for (const a of attributions) linkOfUser.set(a.auth_uid, a.link_id);

  const byLink = new Map<
    string,
    { signups: number; payers: Set<string>; topupCount: number; creditsSold: number; revenueThb: number; uncertain: boolean }
  >();
  const bucket = (id: string) => {
    let b = byLink.get(id);
    if (!b) {
      b = { signups: 0, payers: new Set(), topupCount: 0, creditsSold: 0, revenueThb: 0, uncertain: false };
      byLink.set(id, b);
    }
    return b;
  };

  for (const a of attributions) bucket(a.link_id).signups++;

  for (const t of topups) {
    const linkId = linkOfUser.get(t.auth_uid);
    if (!linkId || t.delta <= 0) continue; // เติมโดยผู้ใช้ที่ไม่ได้มาจากลิงก์ไหน — ไม่นับให้ใคร
    const b = bucket(linkId);
    b.payers.add(t.auth_uid);
    b.topupCount++;
    b.creditsSold += t.delta;
    const thb = thbForTopupCredits(t.delta);
    if (thb === null) b.uncertain = true;
    else b.revenueThb += thb;
  }

  return links.map((l) => {
    const b = byLink.get(l.id);
    return {
      ...l,
      signups: b?.signups ?? 0,
      payingUsers: b?.payers.size ?? 0,
      topupCount: b?.topupCount ?? 0,
      creditsSold: b?.creditsSold ?? 0,
      revenueThb: b?.revenueThb ?? 0,
      revenueUncertain: b?.uncertain ?? false,
    };
  });
}
