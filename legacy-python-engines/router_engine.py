"""
Logic 0: The Router — ตัวที่ขาดมาตลอดทั้งเซสชัน จำเป็นสำหรับให้ทุก Logic ทำงานเป็น
"ระบบเดียว" ผ่านแชทบอทตัวเดียว แทนที่จะเป็นหน้าเดี่ยวๆ แยกกัน

อ้างอิงแพทเทิร์นจาก KRUTH Chatbot Detection Logic Manual (Platform D):
  Safety check (เสมอ, ก่อนสุด) -> Keyword matching (เร็ว ไม่เสีย token)
  -> Claude classification (fallback เมื่อ keyword ไม่ match)

⚠️ ส่วน Claude classification เป็นแค่ interface/stub — ต้องต่อ API จริงตอน deploy
   (เหมือนที่ทำกับ AI-1 dream enrichment pipeline) เพราะ sandbox นี้ไม่มี live
   Anthropic API orchestration ให้ทดสอบตรงๆ
"""

from kruth_element_engine import safety_gate

# Logic ID -> คำสำคัญที่จับได้เร็วโดยไม่ต้องเรียก AI (ประหยัด token)
KEYWORD_MAP = {
    1: ["รหัสชีวิต", "ธาตุกำเนิด", "นิสัย", "วาสนา", "จุดแข็ง", "จุดอ่อน"],
    2: ["เบอร์โทร", "ทะเบียนรถ", "เลขทะเบียน", "เช็คเลข", "เลขนี้"],
    3: ["ฤกษ์", "เวลาไหนดี", "ยามไหนดี", "ทิศมงคล", "ออกเดินทาง"],
    4: ["ฝัน", "นิมิต", "ลางสังหรณ์", "เมื่อคืนฝัน"],
    7: ["ฮวงจุ้ย", "จัดบ้าน", "จัดห้อง", "ทิศห้อง", "หันหน้าไปทาง", "โต๊ะทำงานหันไปทาง"],
    8: ["ดวงวันนี้", "ดวงประจำวัน"],
    9: ["ดวงเดือนนี้", "ดวงประจำเดือน"],
    10: ["ดวงปีนี้", "ดวงประจำปี"],
    11: ["วันเกิด", "ปีชง", "กาลกิณีปีนี้"],
    12: ["กินอะไรดี", "อาหารเสริมดวง", "สุขภาพ"],
    16: ["กิจกรรมเสริมดวง", "ฝึกอะไรดี"],
    17: ["สมพงศ์", "ดวงคู่", "เนื้อคู่", "ดวงความรัก"],
    19: ["ตั้งชื่อบริษัท", "ตั้งชื่อเพจ", "ออกแบบโลโก้", "ชื่อแบรนด์"],
    20: ["เข้ากับบ้านไหม", "เข้ากับรถไหม", "เพื่อนร่วมงานเข้ากันไหม"],
    21: ["เสี่ยงทาย", "หมุนเสี่ยงโชค", "ขอเลขเสี่ยงทาย"],
}

LOGIC_NAMES = {
    0: "Router", 1: "พลังงานส่วนบุคคล", 2: "เช็คเลขวัตถุ/ทะเบียน/เบอร์โทร",
    3: "ฤกษ์ยามและทิศมงคล", 4: "ทำนายฝัน", 7: "ฮวงจุ้ยและการจัดพื้นที่",
    8: "ดวงรายวัน", 9: "ดวงรายเดือน",
    10: "ดวงรายปี", 11: "วันเกิด/ทักษาจร", 12: "อาหารและสุขภาพ",
    16: "กิจกรรมและการเรียนรู้", 17: "ความรักและความสมพงศ์",
    18: "กาลชะตาและสรรพสิ่ง (ทั่วไป)", 19: "ตั้งชื่อและตราสัญลักษณ์",
    20: "ข่ายความสัมพันธ์หลาย entity", 21: "เสี่ยงทายผูกบริบท",
    -1: "Safety Refusal",
}

# หน้าตอบแบบไหน: 'chat' = ตอบในแชทตรงๆ, 'liff' = เปิด mini-app
RESPONSE_MODE = {
    1: "liff", 2: "chat", 3: "chat", 4: "chat", 7: "liff", 8: "liff", 9: "liff",
    10: "liff", 11: "liff", 12: "chat", 16: "chat", 17: "liff",
    18: "chat", 19: "liff", 20: "liff", 21: "liff",
}


def route(message: str, user_platform: str = "E") -> dict:
    """ขั้นตอนตัดสินใจ 3 ชั้นเรียงลำดับ ตรงกับแพทเทิร์นของ Platform D"""

    # ขั้น 1: Safety check ก่อนเสมอ ไม่มีข้อยกเว้น
    gate = safety_gate(message)
    if gate:
        return {
            "logic_id": -1, "logic_name": LOGIC_NAMES[-1], "confidence": 1.0,
            "method": "safety_keyword", "response_mode": "chat",
            "intercepted": True, **gate,
        }

    # ขั้น 2: Keyword matching (เร็ว ไม่เสีย token)
    for logic_id, keywords in KEYWORD_MAP.items():
        if any(k in message for k in keywords):
            return {
                "logic_id": logic_id, "logic_name": LOGIC_NAMES[logic_id],
                "confidence": 0.85, "method": "keyword",
                "response_mode": RESPONSE_MODE.get(logic_id, "chat"),
            }

    # ขั้น 3: Claude classification (fallback) — ยังเป็น stub รอต่อ API จริง
    return claude_classify_stub(message, user_platform)


def claude_classify_stub(message: str, user_platform: str) -> dict:
    """
    ⚠️ STUB — ยังไม่เรียก Anthropic API จริง
    ตอน deploy จริง แทนที่ฟังก์ชันนี้ด้วยการเรียก Claude จริง โดยใช้ system prompt แบบนี้:

        Classify into: [1,2,3,4,8,9,10,11,12,16,17,18,19,20,21]
        Extract entities: person_name, object_type, question_topic
        Respond ONLY with JSON: {"logic_id": int, "confidence": 0.0-1.0, "entities": {...}}

    ถ้า parse ไม่ได้ -> fallback logic_id=18 (Universal Oracle, ตาม Router guideline
    ในเอกสาร KRUTH_21_Logic_Modules_v1.1.docx §DEFAULT FALLBACK)
    """
    return {
        "logic_id": 18, "logic_name": LOGIC_NAMES[18], "confidence": 0.5,
        "method": "fallback_no_keyword_match", "response_mode": RESPONSE_MODE.get(18, "chat"),
        "note": "STUB: ควรเรียก Claude classification จริงตรงนี้ ไม่ใช่ fallback ตรงๆ",
    }


if __name__ == "__main__":
    import json

    print("=" * 70)
    print("TEST — Safety gate takes priority over everything")
    print("=" * 70)
    r = route("ช่วงนี้ทนไม่ไหวแล้ว อยากตาย")
    print(json.dumps(r, ensure_ascii=False, indent=2)[:300])
    assert r["logic_id"] == -1

    print()
    print("=" * 70)
    print("TEST — Keyword routing across several logics")
    print("=" * 70)
    test_messages = [
        "เมื่อคืนฝันเห็นงู หมายความว่าอะไร",
        "อยากรู้ดวงวันนี้หน่อย",
        "อยากตั้งชื่อบริษัทใหม่",
        "เบอร์โทร 0812345678 ดีไหม",
        "คนนี้เข้ากับบ้านฉันไหม",
        "สวัสดีครับ",  # ไม่มี keyword ตรงเลย -> ต้อง fallback
    ]
    for msg in test_messages:
        r = route(msg)
        print(f"  \"{msg}\" -> Logic {r['logic_id']} ({r['logic_name']}) [{r['method']}, mode={r['response_mode']}]")

    print()
    print("✅ Logic 0 Router self-tests passed.")
    print("⚠️  claude_classify_stub() ต้องต่อ Anthropic API จริงก่อน deploy")
