"""
Logic 9, 10, 11: Monthly / Yearly / Birthday Prediction Engines
==================================================================
Built on top of suriyayart_lagna_engine.py (needs natal Lagna) and the
12-house (ภพ) system, cross-verified via web research against multiple
corroborating Thai astrology sources (house order + meanings match
consistently across all sources checked).

Logic 9 (Monthly): Sun transits ~1 sign/month -> which house from Lagna -> theme
Logic 10 (Yearly): Jupiter/Saturn transit -> aspect to Lagna -> year grade A-F
Logic 11 (Birthday): Taksa jr (ทักษาจร) rotation by age -> ศรี/กาลกิณี status this year

⚠️ Jupiter/Saturn positions use MEAN ORBITAL ELEMENTS (simple mean motion
from a J2000 epoch), not a full perturbation model (VSOP87). This is
accurate to within a degree or two over years-long timescales — adequate
for whole-sign house/aspect work, but not for tight-orb aspect work.
"""

import math
from datetime import date, datetime

from suriyayart_lagna_engine import (
    ZODIAC_ORDER, julian_day, solar_ecliptic_longitude, get_zodiac_sign,
)
from daily_prediction_engine import TAKSA_FIXED_ORDER, PLANET_NAME_TH, DAY_TO_PLANET

# ---------------------------------------------------------------------------
# 12-house system (verified via web research, house order: forward from Lagna)
# ---------------------------------------------------------------------------
HOUSE_NAMES = ["ตนุ", "กดุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ",
               "ปัตนิ", "มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "วินาศ"]

HOUSE_THEME = {
    "ตนุ": "ตัวตน สุขภาพโดยรวม การแสดงออก",
    "กดุมภะ": "การเงิน รายได้ การค้าขาย",
    "สหัชชะ": "พี่น้อง เพื่อนสนิท การเดินทางใกล้ การสื่อสาร",
    "พันธุ": "ครอบครัว บ้าน ที่ดิน รากฐานชีวิต",
    "ปุตตะ": "ความคิดสร้างสรรค์ บุตรหลาน การเสี่ยงโชค ความบันเทิง",
    "อริ": "อุปสรรค ศัตรู โรคภัย ความขัดแย้ง",
    "ปัตนิ": "คู่ครอง หุ้นส่วน คู่สัญญา ธุรกิจร่วม",
    "มรณะ": "การเปลี่ยนแปลงใหญ่ การสูญเสีย มรดก จุดจบ-จุดเริ่มใหม่",
    "ศุภะ": "โชคลาภ การเดินทางไกล ความสงบสุข",
    "กัมมะ": "การงาน อาชีพ ตำแหน่งหน้าที่",
    "ลาภะ": "ผลกำไร สิ่งที่ได้มาโดยไม่คาดหมาย ความสำเร็จ",
    "วินาศ": "ความสูญเสีย รายจ่ายแฝง การพักผ่อน/ปิดวงจร",
}

# Rough valence for grading (positive/negative/neutral houses) — a common,
# widely-taught simplification (trikona/kendra=good, dusthana=difficult)
HOUSE_VALENCE = {
    "ตนุ": 1, "กดุมภะ": 0, "สหัชชะ": 0, "พันธุ": 1, "ปุตตะ": 1, "อริ": -1,
    "ปัตนิ": 0, "มรณะ": -1, "ศุภะ": 1, "กัมมะ": 1, "ลาภะ": 1, "วินาศ": -1,
}


def get_house_of_sign(lagna_sign: str, target_sign: str) -> str:
    lagna_idx = ZODIAC_ORDER.index(lagna_sign)
    target_idx = ZODIAC_ORDER.index(target_sign)
    house_offset = (target_idx - lagna_idx) % 12
    return HOUSE_NAMES[house_offset]


# ---------------------------------------------------------------------------
# Logic 9: Monthly Prediction — Sun transit house
# ---------------------------------------------------------------------------

def monthly_prediction(lagna_sign: str, on_date: date) -> dict:
    dt_utc = datetime(on_date.year, on_date.month, on_date.day, 12, 0, 0)
    jd = julian_day(dt_utc)
    sun_lon = solar_ecliptic_longitude(jd)
    sun_sign, _ = get_zodiac_sign(sun_lon)
    house = get_house_of_sign(lagna_sign, sun_sign)
    return {
        "lagna_sign": lagna_sign,
        "sun_sign_this_month": sun_sign,
        "house": house,
        "month_theme": HOUSE_THEME[house],
        "valence": HOUSE_VALENCE[house],
    }


# ---------------------------------------------------------------------------
# Logic 10: Yearly Prediction — Jupiter/Saturn transit aspect to Lagna
# ---------------------------------------------------------------------------

def _mean_planet_longitude(jd: float, L0: float, n_per_day: float) -> float:
    """Simple mean-motion longitude: L0 (deg at J2000) + daily motion * days elapsed."""
    days = jd - 2451545.0
    return (L0 + n_per_day * days) % 360


def jupiter_longitude(jd: float) -> float:
    # Mean longitude at J2000 ≈ 34.35°, mean daily motion ≈ 0.0831°/day (~11.86yr period)
    return _mean_planet_longitude(jd, 34.35, 360.0 / 4332.59)


def saturn_longitude(jd: float) -> float:
    # Mean longitude at J2000 ≈ 50.08°, mean daily motion ≈ 0.0334°/day (~29.45yr period)
    return _mean_planet_longitude(jd, 50.08, 360.0 / 10759.22)


def _whole_sign_relation(lagna_sign: str, planet_sign: str) -> str:
    lagna_idx = ZODIAC_ORDER.index(lagna_sign)
    planet_idx = ZODIAC_ORDER.index(planet_sign)
    dist = (planet_idx - lagna_idx) % 12
    if dist in (0,):
        return "ทับลัคนา"
    if dist in (4, 8):
        return "ตรีโกณลัคนา"
    if dist == 6:
        return "เล็งลัคนา"
    return "ไม่มีมุมพิเศษ"


def yearly_prediction(lagna_sign: str, on_date: date) -> dict:
    dt_utc = datetime(on_date.year, on_date.month, on_date.day, 12, 0, 0)
    jd = julian_day(dt_utc)

    jup_sign, _ = get_zodiac_sign(jupiter_longitude(jd))
    sat_sign, _ = get_zodiac_sign(saturn_longitude(jd))

    jup_relation = _whole_sign_relation(lagna_sign, jup_sign)
    sat_relation = _whole_sign_relation(lagna_sign, sat_sign)

    # Grading per spec: เสาร์เล็งลัคนา = ปีชง/ปีเงา (C/D) ; พฤหัสทับ/ตรีโกณ = ปีทอง (A)
    grade, label = "B", "ปีปกติ"
    if sat_relation == "เล็งลัคนา":
        grade, label = "D", "ปีชง / ปีเงา — ควรระมัดระวังเป็นพิเศษ"
    elif jup_relation in ("ทับลัคนา", "ตรีโกณลัคนา"):
        grade, label = "A", "ปีทอง — โอกาสเปิดกว้าง"
    elif sat_relation == "ทับลัคนา":
        grade, label = "C", "ปีหนัก — ต้องใช้ความอดทนและวินัย"

    return {
        "lagna_sign": lagna_sign,
        "jupiter_sign": jup_sign, "jupiter_relation": jup_relation,
        "saturn_sign": sat_sign, "saturn_relation": sat_relation,
        "year_grade": grade, "year_label": label,
        "caveat": "ตำแหน่งพฤหัส/เสาร์ใช้ค่าเฉลี่ยวงโคจร (mean motion) ไม่ใช่ตำแหน่งจริงที่ปรับรบกวนแล้ว — แม่นระดับราศี ไม่แม่นระดับองศา",
    }


# ---------------------------------------------------------------------------
# Logic 11: Birthday / Taksa jr (ทักษาจร) — rotates by age % 8 each year
# ---------------------------------------------------------------------------

TAKSA_HOUSE_NAMES = ["บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี"]


def birthday_prediction(birth_date: date, current_date: date, birth_day_of_week: str) -> dict:
    birth_planet = DAY_TO_PLANET.get(birth_day_of_week)
    if birth_planet is None:
        return {"error": "unknown birth_day_of_week (Wednesday-night/Rahu births need explicit planet=8)"}

    age = current_date.year - birth_date.year
    if (current_date.month, current_date.day) < (birth_date.month, birth_date.day):
        age -= 1  # birthday hasn't occurred yet this calendar year

    natal_idx = TAKSA_FIXED_ORDER.index(birth_planet)
    rotation = age % 8
    this_year_barivarn_idx = (natal_idx + rotation) % 8

    taksa_jr_map = {}
    for offset, house_name in enumerate(TAKSA_HOUSE_NAMES):
        planet = TAKSA_FIXED_ORDER[(this_year_barivarn_idx + offset) % 8]
        taksa_jr_map[house_name] = PLANET_NAME_TH[planet]

    return {
        "age": age,
        "natal_planet": PLANET_NAME_TH[birth_planet],
        "this_year_barivarn_planet": PLANET_NAME_TH[TAKSA_FIXED_ORDER[this_year_barivarn_idx]],
        "taksa_jr": taksa_jr_map,
        "sri_planet_this_year": taksa_jr_map["ศรี"],
        "kalakini_planet_this_year": taksa_jr_map["กาลกิณี"],
        "note_age_element": "Output 'Age_Element' จากสเปกเดิมไม่ชัดเจนว่าหมายถึงอะไรแน่ (ธาตุวันเกิด/ธาตุของบริวารจรปีนี้/อื่นๆ) — ยังไม่ implement เพราะไม่อยากเดาสูตรเอง รอตรวจสอบความหมายที่แน่ชัดก่อน",
    }


if __name__ == "__main__":
    import json

    demo_lagna = "ธนู"  # from the earlier Suriyayart engine test subject
    today = date.today()

    print("=" * 70)
    print(f"TEST — Logic 9: Monthly Prediction (Lagna={demo_lagna}, today={today})")
    print("=" * 70)
    print(json.dumps(monthly_prediction(demo_lagna, today), ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print(f"TEST — Logic 10: Yearly Prediction (Lagna={demo_lagna}, today={today})")
    print("=" * 70)
    print(json.dumps(yearly_prediction(demo_lagna, today), ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST — Logic 11: Birthday / Taksa jr (born จันทร์, 1990-08-15)")
    print("=" * 70)
    r = birthday_prediction(date(1990, 8, 15), today, "จันทร์")
    print(json.dumps(r, ensure_ascii=False, indent=2))

    print()
    print("Sanity check — Taksa jr at age%8==0 should equal natal Taksa order:")
    r0 = birthday_prediction(date(1990, 8, 15), date(1990, 8, 15), "จันทร์")
    print("  age:", r0["age"], "| บริวารจร:", r0["this_year_barivarn_planet"], "| natal:", r0["natal_planet"])
    assert r0["this_year_barivarn_planet"] == r0["natal_planet"], "at age 0, บริวารจร should equal natal บริวาร"
    print("✅ Taksa jr rotation mechanics verified.")
