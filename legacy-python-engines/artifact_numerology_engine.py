"""
Logic 2: การเช็คเลขวัตถุ/ทะเบียนรถ/เบอร์โทร (Object & Artifact Numerology)
==========================================================================
ตามสเปก CASE 3 (Prompt_Lala_Lucky) + Calculation Manual §5.4

- เลข 2 หลัก (00-99): ค้นตรงใน master_energy_cards (มี 100 แถวเต็ม — ห้ามลดทอน)
- เลข 3 หลัก (000-999): ค้นใน Master_Energy_3_Digits ก่อน
  ⚠️ ไฟล์จริงมีแค่ 14 แถวตัวอย่าง (ไม่ครบ 000-999) — ถ้าไม่พบ fallback ไปวิเคราะห์
  ธาตุรายหลัก + ความสัมพันธ์ระหว่างหลักแทน (ดีกว่าตอบ "ไม่พบข้อมูล" เฉยๆ)
- เบอร์โทร (มากกว่า 3 หลัก): ไม่มีสูตรทางการระบุไว้ที่ไหนเลยตลอดเซสชันนี้ — ใช้แนวทาง
  ที่พบบ่อยในโหราศาสตร์เลขศาสตร์ทั่วไป (ดูเลข 3-4 หลักท้ายเป็นหลัก + ผลรวมทั้งเบอร์
  เป็นเลขรอง) แต่เป็นการออกแบบเสริมของเรา ไม่ใช่สูตรที่ verify จากเอกสารต้นฉบับ
"""

import json
from kruth_element_engine import THAI_LABEL_4

DIGIT_ELEMENT_4 = {1: "Fire", 2: "Earth", 3: "Wood", 4: "Water", 5: "Earth",
                   6: "Water", 7: "Wood", 8: "Earth", 9: "Fire", 0: "Earth"}


def digit_sum_reduce(n: int, stop_at: int = 9) -> int:
    n = abs(n)
    while n > stop_at:
        n = sum(int(d) for d in str(n))
    return n


def artifact_element(number: int) -> str:
    """เลขโดดเดี่ยว (หลังลดทอน) -> ธาตุ 4-bucket ตาม Calculation Manual §5.4"""
    d = digit_sum_reduce(number)
    return DIGIT_ELEMENT_4[d]


with open("master_energy_00_99.json", encoding="utf-8") as f:
    _cards = json.load(f)
    CARD_BY_ID = {c["id"]: c for c in _cards}

with open("master_energy_3_digits.json", encoding="utf-8") as f:
    THREE_DIGIT_DB = json.load(f)
    THREE_DIGIT_BY_ID = {str(r["energy_id"]): r for r in THREE_DIGIT_DB}


def lookup_2digit(number: int) -> dict:
    key = f"{number:02d}"
    card = CARD_BY_ID.get(key)
    return {
        "input": key, "found": card is not None,
        "energy_name": card["name"] if card else None,
        "essence": card["essence"] if card else None,
        "element": artifact_element(number),  # เสริม element ให้ทุกกรณี (การ์ดไม่มี element ในตัวเอง)
    }


def analyze_3digit_fallback(number: int) -> dict:
    """ไม่พบใน 14 แถวตัวอย่าง -> วิเคราะห์รายหลัก (หลักร้อย=ราก, หลักสิบ=กลาง, หลักหน่วย=แสดงออก)"""
    digits = [int(d) for d in f"{number:03d}"]
    elements = [DIGIT_ELEMENT_4[d] for d in digits]
    overall = artifact_element(number)
    return {
        "input": f"{number:03d}", "found_in_table": False,
        "digit_elements": {"หลักร้อย": elements[0], "หลักสิบ": elements[1], "หลักหน่วย": elements[2]},
        "overall_element": overall,
        "note": "ไม่พบในฐาน 14 ตัวอย่าง — วิเคราะห์รายหลักแทน (fallback ที่เราออกแบบเอง ไม่ใช่สูตรต้นฉบับ)",
    }


def lookup_3digit(number: int) -> dict:
    key = str(number)
    row = THREE_DIGIT_BY_ID.get(key)
    if row:
        return {
            "input": key, "found_in_table": True,
            "energy_name": row["energy_name"], "meaning": row["meaning"],
            "context_keywords": row.get("context_keywords"), "note": row.get("note"),
            "overall_element": artifact_element(number),
        }
    return analyze_3digit_fallback(number)


def analyze_phone_number(phone: str) -> dict:
    """⚠️ ไม่มีสูตรทางการ — ออกแบบเสริมเอง: ดูเลข 3 หลักท้าย (มักถือว่ามีน้ำหนักสุดในความเชื่อทั่วไป)
    + ผลรวมทั้งเบอร์ลดทอนเป็นเลขรอง"""
    digits_only = "".join(c for c in phone if c.isdigit())
    if len(digits_only) < 3:
        return {"error": "เบอร์สั้นเกินไป ต้องมีอย่างน้อย 3 หลัก"}

    last3 = int(digits_only[-3:])
    total_sum = sum(int(d) for d in digits_only)
    overall_reduced = digit_sum_reduce(total_sum)

    return {
        "phone": phone,
        "last3digits_analysis": lookup_3digit(last3),
        "whole_number_element": DIGIT_ELEMENT_4[overall_reduced],
        "caveat": "วิธีนี้เป็นแนวทางเสริมที่ออกแบบเอง ไม่ใช่สูตรที่ verify จากเอกสารต้นฉบับ KRUTH",
    }


if __name__ == "__main__":
    print("=" * 70)
    print("TEST — 2-digit lookup (37)")
    print("=" * 70)
    print(json.dumps(lookup_2digit(37), ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST — 3-digit lookup, IN the 14-row table (123)")
    print("=" * 70)
    r = lookup_3digit(123)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    assert r["found_in_table"] is True

    print()
    print("=" * 70)
    print("TEST — 3-digit lookup, NOT in table (246) -> fallback")
    print("=" * 70)
    r2 = lookup_3digit(246)
    print(json.dumps(r2, ensure_ascii=False, indent=2))
    assert r2["found_in_table"] is False

    print()
    print("=" * 70)
    print("TEST — phone number analysis")
    print("=" * 70)
    print(json.dumps(analyze_phone_number("081-234-5678"), ensure_ascii=False, indent=2))

    print()
    print("✅ Logic 2 engine self-tests passed.")
