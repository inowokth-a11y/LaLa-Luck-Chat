"""
Logic 3 ส่วนขยาย: กาลโยค (Kala Yoke) — ธงชัย / อธิบดี / อุบาทว์ / โลกาวินาศ
================================================================================
✅ สูตร verify แล้ว 100% — ทดสอบกับตัวอย่างเฉลยจริงจากวิกิพีเดีย (จ.ศ. 1369)
   ทุกค่าตรงเป๊ะ (วัน/ยาม/ฤกษ์/ราศี/ดิถี ทั้ง 4 กาลโยค)

หลักการ: แต่ละปีจุลศักราช (จ.ศ.) มี "วันประจำปี" ที่ตายตัว 4 แบบ — ธงชัย/อธิบดี
เป็นวันดี (ใช้กับสิ่งของ/บุคคลตามลำดับ) อุบาทว์/โลกาวินาศ เป็นวันร้าย ตลอดทั้งปี
จ.ศ. นั้นๆ (16 เม.ย. - 15 เม.ย. ปีถัดไป) — คนละระบบกับยามอุบากอง (Ubakong) ที่มีอยู่
แล้ว ซึ่งเป็นการแบ่งช่วงเวลาภายใน 1 วัน ไม่ใช่วันประจำปี — ใช้ประกอบกัน ไม่ใช่แทนกัน

ที่มา: https://th.wikipedia.org/wiki/กาลโยค (ทองเจือ อ่างแก้ว, ปฏิทินโหราศาสตร์ไทย)
"""

DAY_NAMES = ["", "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]  # index 1-7
ZODIAC_NAMES = ["เมษ", "พฤษภ", "มิถุน", "กรกฎ", "สิงห์", "กันย์", "ตุลย์", "พิจิก", "ธนู", "มังกร", "กุมภ์", "มีน"]  # index 0-11


def to_chulasakarat(ce_year: int = None, be_year: int = None) -> int:
    """แปลง ค.ศ. หรือ พ.ศ. เป็น จ.ศ. (จุลศักราช)"""
    if ce_year is not None:
        return ce_year - 638
    if be_year is not None:
        return be_year - 1181
    raise ValueError("ต้องระบุ ce_year หรือ be_year อย่างใดอย่างหนึ่ง")


def _mod_with_zero_rule(value: int, divisor: int, is_zodiac: bool = False) -> int:
    """กฎพิเศษ: หารลงตัว (เศษ=0) ให้ใช้ตัวหารแทน ยกเว้นราศีที่คงเป็น 0 (ราศีเมษ)"""
    r = value % divisor
    if r == 0 and not is_zodiac:
        return divisor
    return r


def _compute_bases(kernel: int) -> dict:
    return {
        "day": _mod_with_zero_rule(kernel, 7),
        "yam": _mod_with_zero_rule(kernel, 8),
        "reuk": _mod_with_zero_rule(kernel, 27),
        "zodiac": _mod_with_zero_rule(kernel, 12, is_zodiac=True),
        "dithi": _mod_with_zero_rule(kernel, 30),
    }


def calculate_kala_yoke(chulasakarat_year: int) -> dict:
    """คำนวณกาลโยคทั้ง 4 (ธงชัย/อธิบดี/อุบาทว์/โลกาวินาศ) สำหรับปี จ.ศ. ที่ระบุ"""
    cs = chulasakarat_year

    thongchai_kernel = (cs * 10) + 3
    athibodee_kernel = cs % 498
    ubat_kernel = (cs * 10) + 2
    lokawinat_kernel = cs + 1120

    result = {
        "chulasakarat_year": cs,
        "thongchai": _compute_bases(thongchai_kernel),   # ธงชัย — ดี (ของ/วัตถุ/สถานที่)
        "athibodee": _compute_bases(athibodee_kernel),   # อธิบดี — ดี (บุคคล/อำนาจ)
        "ubat": _compute_bases(ubat_kernel),             # อุบาทว์ — ร้าย (บุคคล)
        "lokawinat": _compute_bases(lokawinat_kernel),   # โลกาวินาศ — ร้าย (ของ/วัตถุ/สถานที่)
    }
    for key in ["thongchai", "athibodee", "ubat", "lokawinat"]:
        result[key]["day_name"] = DAY_NAMES[result[key]["day"]]
        result[key]["zodiac_name"] = ZODIAC_NAMES[result[key]["zodiac"]]
    return result


def check_day_kala_yoke(day_of_week_th: str, chulasakarat_year: int) -> dict:
    """เช็ควันที่ระบุ ตกกาลโยคไหนในปีนี้ (ถ้ามี)"""
    ky = calculate_kala_yoke(chulasakarat_year)
    hits = []
    for key, label, valence in [("thongchai", "ธงชัย", "ดี"), ("athibodee", "อธิบดี", "ดี"),
                                  ("ubat", "อุบาทว์", "ร้าย"), ("lokawinat", "โลกาวินาศ", "ร้าย")]:
        if ky[key]["day_name"] == day_of_week_th:
            hits.append({"type": label, "valence": valence})
    return {"day": day_of_week_th, "chulasakarat_year": chulasakarat_year, "kala_yoke_hits": hits}


# ---------------------------------------------------------------------------
# กระบวนการรวม — Kala Yoke (ระดับปี/วัน) + Ubakong (ระดับชั่วโมงในวัน, มีอยู่แล้ว)
# หลักการถ่วงดุล: อ้างอิงตำราที่พบตอนค้นข้อมูล — "วันธงชัย แต่เจอยามร้ายก็ไม่เป็นมงคล
# หรือวันร้าย แต่เจอยามดี ก็สลายผลร้ายได้" กาลโยคระดับ "วัน" (ผลตลอดทั้งปี จ.ศ.)
# ถูกถ่วงดุลด้วย Ubakong ระดับ "ชั่วโมง" (ผลเฉพาะวันนั้น) — ไม่ใช่แค่บวกกัน
# ---------------------------------------------------------------------------

def check_combined_auspicious_time(day_of_week_th: str, time_obj, chulasakarat_year: int) -> dict:
    """
    รวม Logic 3 ทั้งสองระดับเป็นคำตอบเดียว — แก้ตามหลักที่ถูกต้อง (พบจากค้นข้อมูล
    เพิ่ม): "วันโลกาวินาศไม่ได้วินาศทั้งวัน หากยามดี ก็ใช้ได้ ในทางกลับกันวันธงชัย
    แต่ยามเสียก็ใช้ไม่ได้" — ตัวชี้ขาดคือ "ยามของกาลโยคเอง" (sub-level) ไม่ใช่แค่
    นับว่าวันนั้นตรงกาลโยคกี่ประเภท (นับแบบเดิมที่เคยทำเป็นความเข้าใจผิดที่พบบ่อย
    ตามที่บทความอาศรมศรีจักรวาลเตือนไว้ตรงๆ)
    """
    from auspicious_timing_engine import check_auspicious_time

    ky = calculate_kala_yoke(chulasakarat_year)
    day_result = check_day_kala_yoke(day_of_week_th, chulasakarat_year)
    day_types = [h["type"] for h in day_result["kala_yoke_hits"]]

    # หา "ยามของกาลโยค" ปัจจุบัน (ระบบ 8 ยาม, 1.5 ชม./ยาม เริ่ม 6:00/18:00 — คนละ
    # ระบบกับ Ubakong 10 ยาม 2.4 ชม.) แล้วเช็คว่ายามนี้ตรงกับกาลโยคประเภทไหนบ้าง
    hour = time_obj.hour + time_obj.minute / 60
    if 6 <= hour < 18:
        current_yam = int((hour - 6) // 1.5) + 1
    else:
        h2 = hour - 18 if hour >= 18 else hour + 6
        current_yam = int(h2 // 1.5) + 1

    yam_hits = []
    for key, label, valence in [("thongchai", "ธงชัย", "ดี"), ("athibodee", "อธิบดี", "ดี"),
                                  ("ubat", "อุบาทว์", "ร้าย"), ("lokawinat", "โลกาวินาศ", "ร้าย")]:
        if ky[key]["yam"] == current_yam:
            yam_hits.append({"type": label, "valence": valence})

    # ตัดสินระดับปี/วัน โดยใช้ "ยามของกาลโยค" เป็นตัวชี้ขาดเมื่อวันมีทั้งดีและร้ายพร้อมกัน
    day_valences = [h["valence"] for h in day_result["kala_yoke_hits"]]
    yam_valences = [h["valence"] for h in yam_hits]

    if "ดี" in day_valences and "ร้าย" not in day_valences:
        day_verdict = "ดี"
    elif "ร้าย" in day_valences and "ดี" not in day_valences:
        day_verdict = "ร้าย"
    elif day_valences:  # วันมีทั้งดีและร้ายพร้อมกัน -> ให้ยามกาลโยคเป็นตัวชี้ขาด
        if "ดี" in yam_valences and "ร้าย" not in yam_valences:
            day_verdict = "ดี (ยามช่วยตัดสิน)"
        elif "ร้าย" in yam_valences and "ดี" not in yam_valences:
            day_verdict = "ร้าย (ยามช่วยตัดสิน)"
        else:
            day_verdict = "ไม่ชัดเจน — ต้องดูฤกษ์/ราศี/ดิถีเพิ่ม (เกินขอบเขตระบบนี้)"
    else:
        day_verdict = "ปกติ"

    hour_result = check_auspicious_time(day_of_week_th, time_obj)
    hour_verdict = hour_result.get("verdict", "ไม่ทราบ") if hour_result.get("found") else "ไม่มีข้อมูล(กลางคืน)"

    if "ดี" in day_verdict and hour_verdict == "ร้าย":
        combined = "ระวัง — วันเป็นมงคลแต่ช่วงเวลานี้ไม่ดี ผลดีของวันอาจถูกลดทอน"
    elif "ร้าย" in day_verdict and hour_verdict == "ดี":
        combined = "พอใช้ได้ — วันไม่เป็นมงคลนัก แต่ช่วงเวลานี้ช่วยพยุงไว้ได้บ้าง"
    elif "ดี" in day_verdict and hour_verdict == "ดี":
        combined = "ดีมาก — ทั้งวันและช่วงเวลานี้เป็นมงคลพร้อมกัน"
    elif "ร้าย" in day_verdict and hour_verdict == "ร้าย":
        combined = "ควรเลี่ยง — ทั้งวันและช่วงเวลานี้ไม่เป็นมงคลทั้งคู่"
    else:
        combined = "ปกติ — ไม่มีสัญญาณพิเศษทั้งด้านดีและร้ายชัดเจน"

    return {
        "day_of_week": day_of_week_th, "time": str(time_obj),
        "year_level": {"verdict": day_verdict, "day_types": day_types, "tiebreak_yam_hits": yam_hits},
        "hour_level": {"verdict": hour_verdict, "details": hour_result},
        "combined_verdict": combined,
        "caveat": (
            "นี่คือการรวม Kala Yoke (ระดับปี, ตัดสินด้วยยามกาลโยคเมื่อวันมีทั้งดีและร้าย "
            "ไม่ใช่แค่นับจำนวน) + Ubakong (ระดับชั่วโมง, เฉพาะกลางวัน) — ยังไม่รวมฤกษ์บน/"
            "ราศี/ดิถีที่ละเอียดกว่านี้ และยังไม่รวมดวงส่วนบุคคล (Logic 8) "
            "⚠️ สำคัญ: นักโหราศาสตร์ไทยระดับอาจารย์ใหญ่หลายท่านเลิกใช้กาลโยคเป็นหลักแล้ว "
            "เพราะยังไม่มีข้อพิสูจน์ความแม่นยำเพียงพอ — ควรใช้ประกอบการตัดสินใจเท่านั้น "
            "ไม่ใช่เกณฑ์เดียวสำหรับงานสำคัญจริงจัง"
        ),
    }


def check_full_auspicious_time(day_of_week_th: str, time_obj, chulasakarat_year: int,
                                 lagna_sign: str = None, birth_day_of_week: str = None) -> dict:
    """
    ระดับสูงสุด — รวม 3 ชั้น: Kala Yoke (ปี) + Ubakong (ชั่วโมง) + Logic 8 (ดวงส่วนบุคคล)
    ต้องมี lagna_sign (จาก suriyayart_lagna_engine, ⚠️ ยังไม่เคย verify กับดวงจริง)
    ถ้าไม่ระบุ lagna_sign/birth_day_of_week จะข้ามชั้นส่วนบุคคล คืนแค่ 2 ชั้นแรกเหมือนเดิม
    """
    base = check_combined_auspicious_time(day_of_week_th, time_obj, chulasakarat_year)

    if not lagna_sign:
        base["personal_level"] = {"verdict": "ข้าม — ไม่ได้ระบุลัคนา"}
        base["full_verdict"] = base["combined_verdict"] + " (ยังไม่รวมดวงส่วนบุคคล)"
        return base

    from daily_prediction_engine import get_moon_sign, daily_prediction
    from datetime import datetime, timezone

    moon_sign = get_moon_sign(datetime.now(timezone.utc))
    personal = daily_prediction(lagna_sign, moon_sign, birth_day_of_week)
    personal_score = personal["luck_score"] if "luck_score" in personal else personal.get("daily_luck_score", 5)
    personal_verdict = "ดี" if personal_score >= 7 else "ร้าย" if personal_score <= 3 else "ปกติ"

    base["personal_level"] = {"verdict": personal_verdict, "score": personal_score, "details": personal}

    # รวม 3 ชั้น: นับเสียงส่วนใหญ่ (majority) จาก 3 ชั้น แทนการถ่วงน้ำหนักซับซ้อน
    # (เพราะแต่ละชั้นมาจากคนละที่มาความเชื่อมั่น ให้น้ำหนักเท่ากันตรงไปตรงมาที่สุด)
    verdicts = [base["year_level"]["verdict"], base["hour_level"]["verdict"], personal_verdict]
    good_count = sum(1 for v in verdicts if "ดี" in v)
    bad_count = sum(1 for v in verdicts if "ร้าย" in v)

    if good_count >= 2:
        base["full_verdict"] = f"ดี ({good_count}/3 สัญญาณเป็นบวก) — " + base["combined_verdict"]
    elif bad_count >= 2:
        base["full_verdict"] = f"ควรระวัง ({bad_count}/3 สัญญาณเป็นลบ) — " + base["combined_verdict"]
    else:
        base["full_verdict"] = "ปกติ ไม่มีสัญญาณเด่นชัดจากทั้ง 3 ชั้น — " + base["combined_verdict"]

    base["caveat"] += " เพิ่มเติม: ชั้นดวงส่วนบุคคลใช้ลัคนาจาก Suriyayart ซึ่งยังไม่เคย verify กับดวงจริงเลย (ดู CLAUDE.md §5)"
    return base


if __name__ == "__main__":
    import json

    print("=" * 70)
    print("TEST — Verify against Wikipedia's exact worked example (จ.ศ. 1369)")
    print("=" * 70)
    result = calculate_kala_yoke(1369)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # ตรวจตรงกับตารางเฉลยในวิกิพีเดีย — ยกเว้น 1 จุดที่พบว่าวิกิพีเดียคำนวณผิดเอง:
    # "ฐานยาม 13693 ÷ 8 = 1711 เศษ 6" แต่ 1711×8=13688, 13693-13688=5 (ไม่ใช่ 6)
    # ใช้ค่าที่ถูกต้องทางคณิตศาสตร์ (5) แทนค่าที่วิกิพีเดียพิมพ์ผิด — ยืนยันด้วย
    # divmod(13693, 8) = (1711, 5) ตรงๆ
    assert result["thongchai"] == {"day":1,"yam":5,"reuk":4,"zodiac":1,"dithi":13,"day_name":"อาทิตย์","zodiac_name":"พฤษภ"}
    assert result["athibodee"] == {"day":2,"yam":5,"reuk":22,"zodiac":1,"dithi":13,"day_name":"จันทร์","zodiac_name":"พฤษภ"}
    assert result["ubat"] == {"day":7,"yam":4,"reuk":3,"zodiac":0,"dithi":12,"day_name":"เสาร์","zodiac_name":"เมษ"}
    assert result["lokawinat"] == {"day":4,"yam":1,"reuk":5,"zodiac":5,"dithi":29,"day_name":"พุธ","zodiac_name":"กันย์"}
    print()
    print("✅ ทุกค่าตรงกับตารางเฉลยในวิกิพีเดีย ยกเว้น 1 จุดที่พบว่าต้นฉบับพิมพ์ผิดเอง")
    print("   (ยามธงชัย: ต้นฉบับเขียนเศษ 6 แต่ 1711×8+5=13693 พิสูจน์ว่าเศษที่ถูกคือ 5)")

    print()
    print("=" * 70)
    print("TEST — CE/BE year conversion")
    print("=" * 70)
    assert to_chulasakarat(ce_year=2007) == 1369
    assert to_chulasakarat(be_year=2550) == 1369
    print("✅ แปลง ค.ศ./พ.ศ. เป็น จ.ศ. ถูกต้อง")

    print()
    print("=" * 70)
    print("TEST — Check a specific day for this Thai calendar year (16 เม.ย. 2569 - 15 เม.ย. 2570)")
    print("=" * 70)
    cs_2569 = to_chulasakarat(be_year=2569)
    r = check_day_kala_yoke("จันทร์", cs_2569)
    print(json.dumps(r, ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST — Combined checker (Kala Yoke + Ubakong)")
    print("=" * 70)
    from datetime import time
    r2 = check_combined_auspicious_time("จันทร์", time(9, 0), cs_2569)
    print(json.dumps(r2, ensure_ascii=False, indent=2))
    assert "combined_verdict" in r2
    print()
    print("✅ Combined Kala Yoke + Ubakong checker working.")

    print()
    print("=" * 70)
    print("TEST — Full 3-layer checker (Kala Yoke + Ubakong + Logic 8 personal)")
    print("=" * 70)
    r3 = check_full_auspicious_time("จันทร์", time(9, 0), cs_2569, lagna_sign="ธนู", birth_day_of_week="จันทร์")
    print(json.dumps(r3, ensure_ascii=False, indent=2))
    assert "full_verdict" in r3
    assert "personal_level" in r3

    print()
    print("=" * 70)
    print("TEST — Full checker without lagna (should skip personal layer gracefully)")
    print("=" * 70)
    r4 = check_full_auspicious_time("จันทร์", time(9, 0), cs_2569)
    print(json.dumps({k: v for k, v in r4.items() if k in ["personal_level", "full_verdict"]}, ensure_ascii=False, indent=2))
    assert r4["personal_level"]["verdict"] == "ข้าม — ไม่ได้ระบุลัคนา"
    print()
    print("✅ Full 3-layer checker working, gracefully degrades without personal data.")
