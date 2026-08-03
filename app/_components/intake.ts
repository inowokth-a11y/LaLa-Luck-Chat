"use client";

// ข้อมูลที่กรอกบนหน้าแรก (flow ใหม่ 1 ส.ค. 2569) — พักไว้ใน sessionStorage จนกว่าจะผ่าน consent
// 🔴 หลัก PDPA: **ยังไม่ส่งขึ้น server จนกว่าผู้ใช้จะกดยินยอม** — /welcome เป็นคนบันทึกหลัง auth
// sessionStorage อยู่รอดข้าม OAuth redirect (origin เดิม แท็บเดิม) และหายเองเมื่อปิดแท็บ

const KEY = "lala:intake";

export interface Intake {
  firstName: string;
  lastName: string;
  birthDate: string; // ค.ศ. YYYY-MM-DD
  birthTime: string; // "" = ไม่ทราบ
  consentVersion?: string;
  consentAt?: string;
  /** เพศ (ไม่บังคับ — ผู้ใช้สั่งเก็บ 4 ส.ค. 2569): male|female|other|"" = ไม่ระบุ */
  gender?: string;
}

export function saveIntake(v: Intake): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private mode บางเจ้า — flow จะ fallback ไป onboarding เอง */
  }
}

export function loadIntake(): Intake | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Intake;
    return /^\d{4}-\d{2}-\d{2}$/.test(o.birthDate ?? "") ? o : null;
  } catch {
    return null;
  }
}

export function clearIntake(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
