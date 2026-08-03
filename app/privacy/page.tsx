// นโยบายความเป็นส่วนตัว — ภาษาไทยอ่านง่าย เขียนจากข้อเท็จจริงของระบบจริง (1 ส.ค. 2569)
// ⚠️ ร่างโดย AI จากโครงสร้างระบบ — ควรให้ผู้เชี่ยวชาญ PDPA ตรวจก่อนใช้เชิงพาณิชย์จริงจัง
// ใช้เป็น URL ยื่นขอ LINE email permission ได้

import type { Metadata } from "next";
import Link from "next/link";
import { PDPA_VERSION, DATA_CONTROLLER, DATA_CONTACT_EMAIL } from "@/lib/consent";
import MascotLogo from "@/app/_components/MascotLogo";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | LaLa Lucky Chat",
  description: "เราเก็บอะไร ใช้ทำอะไร และคุณลบได้อย่างไร — เขียนแบบอ่านรู้เรื่อง",
};

const S = {
  h2: { fontFamily: "var(--font-serif-thai)", color: "var(--gold)", fontSize: "1.15rem", margin: "1.6rem 0 0.5rem" } as React.CSSProperties,
  p: { lineHeight: 1.8, fontSize: "0.95rem", margin: "0.4rem 0" } as React.CSSProperties,
  li: { lineHeight: 1.8, fontSize: "0.95rem", marginBottom: "0.35rem" } as React.CSSProperties,
};

export default function PrivacyPage() {
  return (
    <main className="tone-marble" style={{ minHeight: "100vh", color: "var(--ink)", padding: "2.5rem 1.2rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <MascotLogo size={90} />
        </div>
        <h1 style={{ fontFamily: "var(--font-serif-thai)", color: "var(--gold)", fontSize: "1.7rem", textAlign: "center" }}>
          นโยบายความเป็นส่วนตัว
        </h1>
        <p style={{ ...S.p, textAlign: "center", color: "var(--ink-dim)" }}>
          LaLa Lucky Chat · ฉบับ {PDPA_VERSION}
        </p>

        <h2 style={S.h2}>1. เราเก็บข้อมูลอะไร และเอาไปทำอะไร</h2>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li style={S.li}>
            <b>ชื่อ วันเกิด เวลาเกิด จังหวัดที่เกิด</b> — ใช้คำนวณการ์ดพลังงาน ธาตุประจำตัว และดวงของคุณ
            (หัวใจของบริการ &ldquo;คำนวณจริง&rdquo; — ไม่มีข้อมูลนี้ก็คำนวณให้ไม่ได้)
          </li>
          <li style={S.li}>
            <b>คำถามที่ถามแม่หมอ ความฝันที่เล่า และผลทำนายแบบย่อ</b> — เก็บเพื่อให้แม่หมอลาลา ลักกี้
            &ldquo;จำ&rdquo; บริบทของคุณข้ามการสนทนา (เช่น จำได้ว่าคุณฝันเรื่องเดิมซ้ำ) และเพื่อพัฒนาบริการ
          </li>
          <li style={S.li}>
            <b>ภาพที่คุณส่งให้วิเคราะห์</b> (โลโก้/ฉลาก) — ประมวลผลครั้งเดียวแล้วทิ้ง{" "}
            <b>เราไม่เก็บตัวภาพ</b> เก็บเฉพาะผลการวิเคราะห์
          </li>
          <li style={S.li}>
            <b>ข้อมูลการชำระเงิน</b> — ดำเนินการโดย Omise (ผู้ให้บริการรับชำระเงินที่ได้มาตรฐาน){" "}
            <b>เราไม่เห็นและไม่เก็บเลขบัตรหรือบัญชีธนาคารของคุณ</b> เราเก็บเพียงยอดเครดิตและประวัติรายการ
          </li>
          <li style={S.li}>
            <b>ข้อมูลบัญชี</b> — อีเมล/ชื่อจากช่องทางที่คุณใช้เข้าสู่ระบบ (Google, Facebook, LINE)
          </li>
        </ul>

        <h2 style={S.h2}>2. ข้อมูลถูกส่งให้ใครบ้าง</h2>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li style={S.li}>
            <b>ผู้ให้บริการ AI</b> (Anthropic, OpenAI) — เพื่อประมวลผลคำทำนาย ข้อความของคุณถูกส่งผ่าน API
            ซึ่งตามนโยบายของผู้ให้บริการ <b>ไม่ถูกนำไปใช้เทรนโมเดล</b>
          </li>
          <li style={S.li}><b>Supabase</b> — ผู้ให้บริการฐานข้อมูลและระบบบัญชีของเรา</li>
          <li style={S.li}><b>Omise</b> — เฉพาะการชำระเงิน</li>
          <li style={S.li}>
            <b>เราไม่ขายข้อมูลของคุณ</b> และไม่ส่งให้นักการตลาดหรือบุคคลภายนอกอื่นใด
          </li>
        </ul>

        <h2 style={S.h2}>3. เก็บนานแค่ไหน และลบได้อย่างไร</h2>
        <p style={S.p}>
          เราเก็บข้อมูลตราบเท่าที่บัญชีของคุณยังอยู่ เมื่อคุณ<b>ลบบัญชี</b> (ทำได้เองที่หน้า{" "}
          <Link href="/account" style={{ color: "var(--gold)" }}>บัญชีของฉัน</Link>) ข้อมูลทั้งหมด —
          โปรไฟล์ ประวัติคำทำนาย ความจำของแม่หมอ และเครดิตคงเหลือ — จะถูก<b>ลบถาวรทันที</b> กู้คืนไม่ได้
        </p>
        <p style={S.p}>
          นอกจากนี้ <b>ความจำของแม่หมอ</b> (ประวัติคำถาม ความฝัน และผลทำนายแบบย่อที่ใช้ให้แม่หมอจำคุณได้)
          มีอายุการเก็บสูงสุด <b>12 เดือน</b> — รายการที่เก่ากว่านั้นระบบลบให้อัตโนมัติทุกวัน
          แม้คุณไม่ได้ลบบัญชีก็ตาม (ผลคือแม่หมออาจจำเรื่องที่คุยกันไว้นานเกิน 1 ปีไม่ได้)
        </p>

        <h2 style={S.h2}>4. สิทธิ์ของคุณ</h2>
        <p style={S.p}>
          คุณมีสิทธิ์ขอดู แก้ไข หรือลบข้อมูลของคุณ ถอนความยินยอม และร้องเรียนต่อคณะกรรมการคุ้มครอง
          ข้อมูลส่วนบุคคลได้ตามกฎหมาย PDPA — ติดต่อเราได้ตามช่องทางด้านล่าง
        </p>

        <h2 style={S.h2}>5. ผู้ควบคุมข้อมูลและช่องทางติดต่อ</h2>
        <p style={S.p}>
          {DATA_CONTROLLER}
          <br />
          อีเมล: <a href={`mailto:${DATA_CONTACT_EMAIL}`} style={{ color: "var(--gold)" }}>{DATA_CONTACT_EMAIL}</a>
        </p>

        <p style={{ ...S.p, color: "var(--ink-dim)", fontSize: "0.8rem", marginTop: "1.6rem" }}>
          หมายเหตุ: คำทำนายทั้งหมดเป็นแนวทางเชิงความเชื่อ/วัฒนธรรม ไม่ใช่คำแนะนำทางการแพทย์ การเงิน
          หรือกฎหมาย
        </p>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "underline", fontSize: "0.9rem" }}>
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
