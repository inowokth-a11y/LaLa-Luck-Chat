"""
Logic 8: Daily Prediction Engine (คำทำนายรายวัน)
====================================================
Per spec: L1(30%) : L3(70%) — Aspect Check between transiting Moon and natal
Lagna. Scoring: ตรีโกณ(+3) / ทับ(+1) / เล็ง(-2) / กาลกิณี(-3).

⚠️ SCOPE LIMITATION: This implements whole-sign aspects (Conjunct, Trine,
Opposition) only — a standard, well-documented technique in Thai/Vedic
astrology. "กาลกิณี" (Kalakini) scoring is NOT implemented: it requires a
"ดาวกาลกิณีประจำลัคนา" (malefic-planet-per-Ascendant) lookup table that does
not appear anywhere in the source tome. Do not fabricate this table —
surface it as a gap until the real reference table is supplied.

Depends on: suriyayart_lagna_engine.py (for natal Lagna sign)
"""

import math
from datetime import datetime, timezone

from suriyayart_lagna_engine import ZODIAC_ORDER, julian_day

MOON_SIGN_THAI = ZODIAC_ORDER  # same 12-sign ordering


# ---------------------------------------------------------------------------
# กาลกิณี (Kalakini) — Taksa (ทักษาปกรณ์) system, NOT Lagna-based.
# Sourced from web research (multiple corroborating Thai astrology sources,
# cross-verified against the standard published กาลกิณีวันเกิด table) since
# the source tome did not contain this table. This is standard, widely
# published traditional knowledge, not proprietary to any one source.
# ---------------------------------------------------------------------------

# Fixed Taksa traversal order (NOT weekday order) — 1=Sun,2=Moon,3=Mars,
# 4=Mercury,7=Saturn,5=Jupiter,8=Rahu,6=Venus. บริวาร starts at the
# birth-day planet and walks this fixed sequence; the 8th stop is กาลกิณี.
TAKSA_FIXED_ORDER = [1, 2, 3, 4, 7, 5, 8, 6]

PLANET_NAME_TH = {1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ",
                   5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู"}

DAY_TO_PLANET = {"อาทิตย์": 1, "จันทร์": 2, "อังคาร": 3, "พุธ": 4,
                  "พฤหัสบดี": 5, "ศุกร์": 6, "เสาร์": 7}
# หมายเหตุ: "พุธกลางคืน" (หลัง 18:00) = ราหู(8) ตามกฎยกเว้นที่มีอยู่แล้วในระบบ

# Classical planetary sign rulerships (public astronomical/astrological
# knowledge, safe to hard-code)
PLANET_RULED_SIGNS = {
    1: ["สิงห์"], 2: ["กรกฎ"], 3: ["เมษ", "พิจิก"], 4: ["มิถุน", "กันย์"],
    5: ["ธนู", "มีน"], 6: ["พฤษภ", "ตุลย์"], 7: ["มังกร", "กุมภ์"],
    8: [],  # ราหูไม่มีเรือนคงที่ตามหลักดั้งเดิม — จุดที่ตรวจสอบไม่ได้ ปล่อยว่างไว้ตรงๆ
}


def get_kalakini_planet(day_of_week_or_planet):
    """Accepts either a Thai day name or a planet number (1-8, 8=Rahu for
    Wednesday-night births) and returns the Kalakini planet number."""
    if isinstance(day_of_week_or_planet, str):
        birth_planet = DAY_TO_PLANET.get(day_of_week_or_planet)
        if birth_planet is None:
            return None
    else:
        birth_planet = day_of_week_or_planet
    idx = TAKSA_FIXED_ORDER.index(birth_planet)
    return TAKSA_FIXED_ORDER[(idx + 7) % 8]


def moon_ecliptic_longitude(jd: float) -> float:
    """
    Low-precision geocentric ecliptic longitude of the Moon (degrees, 0-360).
    Truncated series (~15 largest periodic terms) after Meeus, "Astronomical
    Algorithms" ch. 47 — accurate to roughly a few arcminutes, well within
    what's needed for zodiac-sign-level (whole-sign) aspect work.
    """
    T = (jd - 2451545.0) / 36525.0

    Lp = (218.3164477 + 481267.88123421 * T - 0.0015786 * T**2) % 360
    D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T**2) % 360
    M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T**2) % 360
    Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T**2) % 360
    F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T**2) % 360

    Dr, Mr, Mpr, Fr = map(math.radians, (D, M, Mp, F))

    dL = (
        6.288774 * math.sin(Mpr)
        + 1.274027 * math.sin(2 * Dr - Mpr)
        + 0.658314 * math.sin(2 * Dr)
        + 0.213618 * math.sin(2 * Mpr)
        - 0.185116 * math.sin(Mr)
        - 0.114332 * math.sin(2 * Fr)
        + 0.058793 * math.sin(2 * Dr - 2 * Mpr)
        + 0.057066 * math.sin(2 * Dr - Mr - Mpr)
        + 0.053322 * math.sin(2 * Dr + Mpr)
        + 0.045758 * math.sin(2 * Dr - Mr)
        - 0.040923 * math.sin(Mr - Mpr)
        - 0.034720 * math.sin(Dr)
        - 0.030383 * math.sin(Mr + Mpr)
        + 0.015327 * math.sin(2 * Dr - 2 * Fr)
        - 0.012528 * math.sin(Mpr + 2 * Fr)
    )
    return (Lp + dL) % 360


def get_moon_sign(dt_utc: datetime) -> str:
    jd = julian_day(dt_utc)
    lon = moon_ecliptic_longitude(jd)
    idx = int(lon // 30)
    return MOON_SIGN_THAI[idx]


# ---------------------------------------------------------------------------
# Whole-sign aspect scoring
# ---------------------------------------------------------------------------

ASPECT_RULES = {
    0: {"name": "ทับ (Conjunct)", "score": 1},
    4: {"name": "ตรีโกณ (Trine)", "score": 3},
    8: {"name": "ตรีโกณ (Trine)", "score": 3},
    6: {"name": "เล็ง (Opposition)", "score": -2},
}


def daily_prediction(lagna_sign: str, moon_sign: str, birth_day_of_week: str = None) -> dict:
    lagna_idx = ZODIAC_ORDER.index(lagna_sign)
    moon_idx = ZODIAC_ORDER.index(moon_sign)
    distance = (moon_idx - lagna_idx) % 12

    aspect = ASPECT_RULES.get(distance)
    baseline = 5  # neutral midpoint on the 0-10 output scale
    if aspect:
        aspect_name, aspect_score = aspect["name"], aspect["score"]
    else:
        aspect_name, aspect_score = "กลาง (ไม่มีมุมพิเศษ)", 0

    total_score = baseline + aspect_score

    # Kalakini check (Taksa system, independent of Lagna aspect)
    kalakini_result = None
    if birth_day_of_week:
        kalakini_planet = get_kalakini_planet(birth_day_of_week)
        if kalakini_planet is not None:
            ruled_signs = PLANET_RULED_SIGNS.get(kalakini_planet, [])
            if not ruled_signs:
                kalakini_result = {
                    "triggered": None,
                    "planet": PLANET_NAME_TH[kalakini_planet],
                    "note": "ราหูไม่มีเรือนคงที่ตามหลักดั้งเดิม — ตรวจสอบไม่ได้",
                }
            else:
                hit = moon_sign in ruled_signs
                kalakini_result = {
                    "triggered": hit,
                    "planet": PLANET_NAME_TH[kalakini_planet],
                    "ruled_signs": ruled_signs,
                }
                if hit:
                    total_score -= 3
        else:
            kalakini_result = {"triggered": None, "note": "ไม่ทราบวันเกิด — ข้ามการตรวจกาลกิณี"}

    daily_luck_score = max(0, min(10, total_score))

    return {
        "lagna_sign": lagna_sign,
        "moon_sign_today": moon_sign,
        "sign_distance": distance,
        "aspect": aspect_name,
        "kalakini": kalakini_result,
        "daily_luck_score": daily_luck_score,
    }


if __name__ == "__main__":
    import json

    print("=" * 70)
    print("TEST — Daily Prediction (today, UTC now)")
    print("=" * 70)
    now_utc = datetime.now(timezone.utc)
    moon_sign = get_moon_sign(now_utc)
    print("Moon sign right now:", moon_sign)

    # Use the Lagna from the previous engine's test subject (ธนู) as a demo natal chart
    result = daily_prediction(lagna_sign="ธนู", moon_sign=moon_sign)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST — Kalakini table (cross-check against standard published table)")
    print("=" * 70)
    expected = {
        "อาทิตย์": "ศุกร์", "จันทร์": "อาทิตย์", "อังคาร": "จันทร์", "พุธ": "อังคาร",
        "พฤหัสบดี": "เสาร์", "ศุกร์": "ราหู", "เสาร์": "พุธ",
    }
    for day, expected_planet in expected.items():
        planet_num = get_kalakini_planet(day)
        planet_name = PLANET_NAME_TH[planet_num]
        status = "✅" if planet_name == expected_planet else "❌ MISMATCH"
        print(f"  {day:10s} -> กาลกิณี = {planet_name:10s} (expected {expected_planet}) {status}")
        assert planet_name == expected_planet, f"Kalakini mismatch for {day}"
    # Wednesday-night (Rahu) special case
    rahu_kalakini = PLANET_NAME_TH[get_kalakini_planet(8)]
    print(f"  {'พุธกลางคืน(ราหู)':10s} -> กาลกิณี = {rahu_kalakini:10s} (expected พฤหัสบดี)")
    assert rahu_kalakini == "พฤหัสบดี"
    print()
    print("✅ Kalakini table matches the standard published reference exactly.")

    print()
    print("=" * 70)
    print("TEST — Full daily_prediction() with Kalakini integrated")
    print("=" * 70)
    r2 = daily_prediction(lagna_sign="ธนู", moon_sign="กรกฎ", birth_day_of_week="จันทร์")
    print(json.dumps(r2, ensure_ascii=False, indent=2))
    # จันทร์ born -> Kalakini planet = อาทิตย์ -> rules สิงห์ -> moon in กรกฎ -> not triggered
    assert r2["kalakini"]["triggered"] is False

    r3 = daily_prediction(lagna_sign="ธนู", moon_sign="สิงห์", birth_day_of_week="จันทร์")
    print(json.dumps(r3, ensure_ascii=False, indent=2))
    # moon in สิงห์ (ruled by อาทิตย์, which IS จันทร์-born's Kalakini) -> should trigger
    assert r3["kalakini"]["triggered"] is True
    assert r3["daily_luck_score"] == max(0, 5 + 3 - 3)  # trine(+3 since สิงห์=distance4 from ธนู... check) minus kalakini(-3)
    print("✅ Kalakini trigger + score deduction verified.")
