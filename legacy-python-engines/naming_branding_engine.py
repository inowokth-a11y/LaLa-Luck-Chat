"""
Logic 19: การตั้งชื่อและตราสัญลักษณ์ (Naming & Branding Generator)
====================================================================
ใช้ NamePower table เดิม (verify แล้วจากตำรา, ดู kruth_element_engine) +
wu_xing_score() สำหรับให้คะแนนชื่อ — ไม่มี image-gen tool ในระบบนี้ ทำได้แค่
คำนวณชื่อ+เสนอ prompt ข้อความสำหรับสร้างโลโก้ทีหลัง
"""

from kruth_element_engine import wu_xing_score, THAI_LABEL_5, GENERATING_CYCLE

# ตารางกลุ่มอักษร (9 กลุ่ม, verify แล้วจากตำรา จตุพลวัตร V.10)
CHAR_GROUPS = {
    1: "กดถทภฤAJS", 2: "ขชบปงBKT", 3: "ฆตฑฒCLU", 4: "คธรญษDMV",
    5: "ฉณฌนมหฎฮฬENW", 6: "จลวอFOX", 7: "ซศสGPY", 8: "ยผฝพฟHQZ", 9: "ฏฐIR",
}
CHAR_TO_GROUP = {ch: g for g, chars in CHAR_GROUPS.items() for ch in chars}

# ค่าสระ/วรรณยุกต์ตามตารางทางการ Calculation_Constants (Name_Numerology) — ผู้ใช้ตัดสิน
# 6 ส.ค. 2569 "นับสระทุกจุด" · 7 อักขระที่ตารางเดิมไม่มี เจ้าของตำราให้ค่ามาแล้ว 7 ส.ค. 2569
# ⚠️ ต้องแก้ตรงกันกับ lib/engine/card-id.ts (officialCharValues) เสมอ — golden parity
VOWEL_VALUES = {
    "ุ": 1, "า": 1, "ำ": 1, "้": 1, "ะ": 1,
    "ู": 2, "่": 2, "ื": 2,
    "ิ": 3, "ี": 3, "ึ": 3, "๊": 3,
    "โ": 4, "เ": 4, "แ": 4, "๋": 4,
    "ใ": 6, "ั": 6, "็": 6,
    "ไ": 9, "์": 9,
}
CHAR_TO_GROUP.update(VOWEL_VALUES)

_LEADING_VOWELS = set("เแโใไ")
_DEPENDENT_MARKS = set("ัิีึืุู่้๊๋็์ำ")


def _is_thai_char(ch):
    return "ก" <= ch <= "๛"


def official_char_groups(name: str):
    """กลุ่ม 1-9 รายตัวอักษร (รวมสระ/วรรณยุกต์) — กฎแยกบริบท "อ" ตรงกับ officialCharValues ใน TS:
    อ ตามหลัง ื = ข้าม (ส่วนของสระอือ/เอือ) · อ ต้นคำ/หลังอักขระไม่ใช่ไทย/หลังสระหน้า/
    มีรูปสระ-วรรณยุกต์เกาะตามหลัง = พยัญชนะ (6) · นอกนั้น = สระออ (4)"""
    chars = list(name.upper())
    out = []
    for i, ch in enumerate(chars):
        if ch == "อ":
            prev = chars[i - 1] if i > 0 else ""
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if prev == "ื":
                continue
            is_consonant = (i == 0 or not _is_thai_char(prev)
                            or prev in _LEADING_VOWELS or nxt in _DEPENDENT_MARKS)
            out.append(6 if is_consonant else 4)
        elif ch in CHAR_TO_GROUP:
            out.append(CHAR_TO_GROUP[ch])
    return out

# กลุ่มเลข 1-9 -> ธาตุ
# "ทาง ค" (24 ส.ค. 2569): เลขกลุ่ม→ดาวประจำเลข→ธาตุประจำวันตามตำรา · ราหู=ดิน เกตุ=ไฟ
# (อนุมานผ่านดาวแม่แบบ — ดูคอมเมนต์เต็มใน lib/engine/naming.ts · แก้คู่กันตาม golden parity)
GROUP_TO_ELEMENT = {1: "Fire", 2: "Water", 3: "Fire", 4: "Earth", 5: "Wood",
                    6: "Water", 7: "Earth", 8: "Earth", 9: "Fire"}

LOGO_STYLE_BY_ELEMENT = {
    "Wood": {"shape": "โค้งอินทรีย์ กิ่งก้าน", "color": "เขียว", "mood": "เติบโต สดใหม่"},
    "Fire": {"shape": "เหลี่ยมแหลม พุ่งขึ้น", "color": "แดงส้ม", "mood": "กระตือรือร้น พลังงานสูง"},
    "Earth": {"shape": "สี่เหลี่ยมมั่นคง ฐานกว้าง", "color": "น้ำตาลทอง", "mood": "มั่นคง น่าเชื่อถือ"},
    "Metal": {"shape": "วงกลมมินิมอล เส้นคม", "color": "เงิน/ขาว", "mood": "แม่นยำ ทันสมัย"},
    "Water": {"shape": "คลื่นลื่นไหล ไร้เหลี่ยม", "color": "น้ำเงิน", "mood": "ยืดหยุ่น ลึกซึ้ง"},
}


def name_element(name: str) -> str:
    groups = official_char_groups(name)
    if not groups:
        return None
    # ธาตุเด่น = กลุ่มที่ปรากฏบ่อยที่สุด แปลงเป็นธาตุ
    from collections import Counter
    dominant_group = Counter(groups).most_common(1)[0][0]
    return GROUP_TO_ELEMENT[dominant_group]


def aggregate_element(founder_element: str, member_elements: list = None) -> str:
    """ถ่วงน้ำหนัก Founder 60% + ค่าเฉลี่ยสมาชิก 40% (ตามสเปก Logic 19)"""
    if not member_elements:
        return founder_element
    from collections import Counter
    weighted = [founder_element] * 6 + member_elements * 4  # 60:40 โดยประมาณด้วยการนับซ้ำ
    return Counter(weighted).most_common(1)[0][0]


def score_candidate_name(name: str, target_element: str, missing_elements: list = None) -> dict:
    el = name_element(name)
    if el is None:
        return {"name": name, "element": None, "error": "ไม่พบตัวอักษรที่จับคู่ธาตุได้"}
    result = wu_xing_score(target_element, el, missing_elements or [])
    return {"name": name, "name_element": el, "target_element": target_element, **result}


def reverse_generate_candidates(target_element: str, syllable_pool: list) -> list:
    """หากลุ่มอักษรที่ตรงธาตุที่ต้องการเสริม แล้วเสนอพยางค์ตั้งต้นที่ตรงกลุ่ม"""
    matching_groups = [g for g, el in GROUP_TO_ELEMENT.items() if el == target_element]
    matching_chars = set()
    for g in matching_groups:
        matching_chars.update(CHAR_GROUPS[g])
    return [syl for syl in syllable_pool if syl and syl[0].upper() in matching_chars]


def logo_prompt_text(element: str, brand_name: str) -> str:
    style = LOGO_STYLE_BY_ELEMENT[element]
    return (
        f"minimalist flat vector logo mark for '{brand_name}', "
        f"{style['shape']}, primary color {style['color']}, "
        f"mood: {style['mood']}, clean geometric icon, no text, "
        f"scalable simple icon suitable for app logo, white background"
    )


if __name__ == "__main__":
    import json

    print("=" * 70)
    print("TEST — Name element parsing")
    print("=" * 70)
    for name in ["กมล", "ธนวัฒน์", "โซฟี"]:
        print(f"  {name} -> {name_element(name)}")

    print()
    print("=" * 70)
    print("TEST — Aggregate + score candidate names")
    print("=" * 70)
    founder_el = "Fire"
    members = ["Fire", "Earth", "Wood"]
    agg = aggregate_element(founder_el, members)
    print("Aggregate element (founder Fire + team):", agg)

    for candidate in ["กมล", "ธนวัฒน์"]:
        r = score_candidate_name(candidate, agg, missing_elements=["Water"])
        print(json.dumps(r, ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST — Reverse generation + logo prompt")
    print("=" * 70)
    pool = ["Wanchai", "Kanya", "Duangjai", "Chaiyo", "Fahsai", "Rin", "Ice"]
    candidates = reverse_generate_candidates("Water", pool)
    print("Candidates matching Water element:", candidates)
    print()
    print(logo_prompt_text("Water", "AquaFlow"))

    print()
    print("✅ Logic 19 engine self-tests passed.")
    print("GROUP_TO_ELEMENT = ทาง ค (เลขกลุ่ม→ดาว→ธาตุวันเกิด · ราหู=ดิน เกตุ=ไฟ อนุมานดาวแม่แบบ) — รอเจ้าของตำรายืนยันขั้นสุดท้าย")
    print("   ต้องตรวจสอบก่อนใช้จริง เหมือนที่เคยทำกับ BirthPower/NamePower")
