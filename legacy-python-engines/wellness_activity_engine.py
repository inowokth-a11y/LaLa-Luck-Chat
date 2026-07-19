"""
Wellness Activity Engine — ต่อยอด TTM_LIFESTYLE เดิม (kruth_element_engine.py)
================================================================================
รวม 2 แหล่งข้อมูลเข้าด้วยกัน:
  1. ฐานความรู้เทคนิคหายใจ/สมาธิ จากบทสนทนาก่อนหน้า "Meditation and breathing
     techniques in Buddhism" (16 พ.ค. 2569) — พุทธ/ทิเบต/โยคะ/ศิลปะการต่อสู้
  2. งานวิจัยใหม่ที่ค้นเพิ่มรอบนี้ — เดินป่า/ปีนเขา (Niedermeier 2021, Bratman/
     Stanford), Art & Music Therapy (meta-analysis 2022), Chronobiology of
     exercise timing (หลายแหล่ง PMC)

หลักการจับคู่: แต่ละธาตุ = 1 กิจกรรม "ภายใน" (หายใจ/สมาธิ) + 1 กิจกรรม "ภายนอก"
(เคลื่อนไหว/ศิลปะ) + วิธีรวมเป็นกิจวัตรเดียว — สะท้อนว่าศาสตร์ต้นฉบับ (ไทเก๊ก,
mindful hiking) ก็รวมสองอย่างนี้อยู่แล้วโดยธรรมชาติ

⚠️ กรอบการนำเสนอ (สำคัญมาก — ยึดจากคำเตือนในบทสนทนาต้นฉบับเอง):
ต้องเฟรมเป็น "เหมาะกับพลังงาน/บุคลิกภาพแบบนี้" ไม่ใช่ "รักษา/แก้ธาตุ" — ห้ามอ้างว่า
รักษาโรคหรือแก้ปัญหาสุขภาพจิตใดๆ เป็นกิจกรรมสุขภาวะทั่วไปเท่านั้น
"""

WELLNESS_ACTIVITIES = {
    "Fire": {
        "internal": {
            "name": "Kapalabhati (ลมไฟ)", "tradition": "โยคะ/Pranayama",
            "how_to": "หายใจออกแรงๆ เร็วๆ ทางจมูก ปล่อยให้หายใจเข้าเป็นไปเอง ทำต่อเนื่อง 20-30 ครั้งต่อรอบ",
            "research": "Nivethitha et al. 2017, Ancient Science of Life",
        },
        "external": {
            "name": "วิ่ง หรือ ปีนเขา/hiking ระดับหนัก", "category": "movement",
            "how_to": "เคลื่อนไหวต่อเนื่อง 20-30 นาที ให้หัวใจเต้นเร็วขึ้นชัดเจน",
            "research": "Niedermeier et al. — hiking 30 นาที ลดฮอร์โมนความเครียดได้ถึง 28%",
        },
        "combo_routine": "ตอนเช้า: Kapalabhati 5 นาทีก่อนออกจากบ้าน แล้วตามด้วยวิ่ง/เดินเร็ว 20 นาที — ใช้จังหวะหายใจที่กระตุ้นแล้วต่อด้วยการเคลื่อนไหวจริง",
        "best_time": "เช้า", "time_reason": "ออกกำลังกายตอนเช้าช่วย advance circadian phase และลดคอร์ติซอลตอนตื่นในระยะยาว (PMC systematic review)",
    },
    "Water": {
        "internal": {
            "name": "Bhramari (หายใจผึ้ง)", "tradition": "โยคะ/Pranayama",
            "how_to": "หายใจเข้าลึกๆ หายใจออกพร้อมทำเสียงฮัมต่อเนื่อง ทำ 5-10 รอบ",
            "research": "ลด cortisol, calming (เชื่อมกับ Nivethitha et al. 2017)",
        },
        "external": {
            "name": "เดินเบาๆในธรรมชาติ / ฟังเพลงบรรเลงสงบ", "category": "nature/music",
            "how_to": "เดินช้าๆ 15-20 นาทีในที่มีต้นไม้ หรือฟังเพลงบรรเลงแบบตั้งใจฟัง (ไม่ใช่เปิดคลอ)",
            "research": "Bratman/Stanford — เดินธรรมชาติลดการทำงาน subgenual PFC (จุดคิดวนซ้ำ)",
        },
        "combo_routine": "ก่อนนอน: Bhramari 5 รอบบนเตียง แล้วฟังเพลงบรรเลงเบาๆ 10 นาทีก่อนหลับ",
        "best_time": "ก่อนนอน", "time_reason": "งานวิจัยชัดเจนว่ากิจกรรมสงบก่อนนอนช่วยการนอนหลับ ต่างจากออกกำลังกายหนักที่รบกวนการนอน",
    },
    "Earth": {
        "internal": {
            "name": "Dan Tian breathing (หายใจจากจุดต่ำท้อง)", "tradition": "ไทเก๊ก/ชี่กง",
            "how_to": "วางมือที่ท้องใต้สะดือ หายใจให้ท้องพองยุบ รู้สึกถึงจุดศูนย์กลางร่างกาย 5-10 นาที",
            "research": "Jahnke et al. 2010 — รีวิว 66 งานวิจัย Qigong/Tai Chi",
        },
        "external": {
            "name": "เดินป่าจังหวะกลาง / วาดภาพ-ปั้นดิน", "category": "movement/art",
            "how_to": "เดินในจังหวะสม่ำเสมอ ไม่เร่งรีบ 20-30 นาที หรือทำงานศิลปะที่ได้สัมผัสวัสดุจริง (ดินน้ำมัน/สีน้ำ)",
            "research": "Art therapy ลดคอร์ติซอลจริง (systematic review, ยอมรับตั้งแต่ 1940s)",
        },
        "combo_routine": "บ่าย: Dan Tian breathing 5 นาที แล้วเดินเล่นจังหวะช้าๆ 20 นาที — เน้นความรู้สึก 'ปักหลัก' ตลอดกิจกรรม",
        "best_time": "เช้าหรือบ่าย", "time_reason": "กิจกรรม grounding เหมาะเป็นช่วงเปลี่ยนผ่าน ไม่จำเป็นต้องผูกกับ circadian phase เท่าธาตุไฟ/น้ำ",
    },
    "Wood": {
        "internal": {
            "name": "เมตตาภาวนา (Loving-Kindness Meditation)", "tradition": "พุทธ",
            "how_to": "นั่งสบายๆ ระลึกความรู้สึกดีต่อตนเอง แล้วขยายไปยังคนใกล้ตัว 10-15 นาที",
            "research": "Lutz et al. 2008, PNAS — กระตุ้น insula + ACC",
        },
        "external": {
            "name": "วาดภาพ/เขียนสร้างสรรค์ หรือเล่นดนตรี (ไม่ใช่แค่ฟัง)", "category": "art/music",
            "how_to": "ให้เวลา 20-30 นาทีทำงานสร้างสรรค์แบบไม่มีเป้าหมายตายตัว ปล่อยให้ไหลไปเรื่อยๆ",
            "research": "Music therapy meta-analysis 2022 — ผลบวกต่อ stress-related outcomes",
        },
        "combo_routine": "กลางวัน: เมตตาภาวนาสั้นๆ 5 นาที แล้วต่อด้วยกิจกรรมสร้างสรรค์อิสระ 20 นาที ไม่ตั้งเป้าผลงาน",
        "best_time": "กลางวัน", "time_reason": "ธาตุไม้เชื่อมกับการเติบโต/ขยาย เหมาะกับช่วงที่พลังงานกำลังขึ้น ไม่ใช่ต้นหรือปลายวัน",
    },
    "Metal": {
        "internal": {
            "name": "Box Breathing (Sama Vritti) / วิปัสสนา", "tradition": "โยคะ + พุทธ",
            "how_to": "หายใจเข้า 4 วินาที กลั้น 4 วินาที หายใจออก 4 วินาที กลั้น 4 วินาที ทำ 5-10 รอบ",
            "research": "เสถียรภาพระบบประสาทอัตโนมัติ (ANS) — เชื่อมกับหลัก Box Breathing มาตรฐาน",
        },
        "external": {
            "name": "งานฝีมือละเอียด/ถ่ายภาพ หรือฟังดนตรีคลาสสิก/มีโครงสร้างชัด", "category": "art/music",
            "how_to": "เลือกงานที่ต้องใช้ความละเอียด/มีขั้นตอนชัดเจน 20-30 นาที",
            "research": "Frontiers 2024 — creative arts เชื่อมกับ medial rPFC ด้าน emotion regulation",
        },
        "combo_routine": "เย็น: Box Breathing 5 นาทีก่อนเริ่มงานฝีมือ/ถ่ายภาพ 20-30 นาที — เน้นความคมชัด มีโครงสร้าง",
        "best_time": "เย็น", "time_reason": "ธาตุทองเชื่อมกับความชัดเจน/ปล่อยวาง เหมาะเป็นช่วงสรุปวัน ก่อนเข้าสู่ธาตุน้ำตอนกลางคืน",
    },
}

FRAMING_CAVEAT = (
    "หมายเหตุสำคัญ: กิจกรรมเหล่านี้เป็นกิจกรรมสุขภาวะทั่วไปที่ 'เหมาะกับพลังงาน/"
    "บุคลิกภาพ' แบบหนึ่งๆ ไม่ใช่การรักษาหรือแก้ปัญหาสุขภาพจิตใดๆ หากมีอาการที่กังวล "
    "ควรปรึกษาผู้เชี่ยวชาญโดยตรง"
)


def get_wellness_pair(element: str) -> dict:
    """คืนคู่กิจกรรมภายใน+ภายนอก+วิธีรวมเป็นกิจวัตร สำหรับธาตุที่ระบุ"""
    data = WELLNESS_ACTIVITIES.get(element)
    if not data:
        return {"error": f"ไม่มีข้อมูลธาตุ {element}"}
    return {**data, "element": element, "caveat": FRAMING_CAVEAT}


def get_wellness_for_missing(missing_elements: list) -> dict:
    """ใช้กับธาตุที่ขาด (จาก Element Seed) — คืนคู่กิจกรรมสำหรับทุกธาตุที่ขาด"""
    return {el: get_wellness_pair(el) for el in missing_elements}


if __name__ == "__main__":
    import json

    print("=" * 70)
    print("TEST — Wellness pair for a single element")
    print("=" * 70)
    r = get_wellness_pair("Fire")
    print(json.dumps(r, ensure_ascii=False, indent=2))
    assert "internal" in r and "external" in r and "combo_routine" in r

    print()
    print("=" * 70)
    print("TEST — All 5 elements have complete data")
    print("=" * 70)
    for el in ["Fire", "Water", "Earth", "Wood", "Metal"]:
        r = get_wellness_pair(el)
        assert "error" not in r, f"{el} missing data"
        print(f"  {el}: internal='{r['internal']['name']}' + external='{r['external']['name']}' @ {r['best_time']}")

    print()
    print("=" * 70)
    print("TEST — Multi-element lookup (e.g. missing Wood + Water)")
    print("=" * 70)
    r2 = get_wellness_for_missing(["Wood", "Water"])
    print(json.dumps({k: v["combo_routine"] for k, v in r2.items()}, ensure_ascii=False, indent=2))
    assert set(r2.keys()) == {"Wood", "Water"}

    print()
    print("✅ Wellness Activity Engine self-tests passed.")
    print(f"   Framing caveat present in every response: {'caveat' in get_wellness_pair('Fire')}")
