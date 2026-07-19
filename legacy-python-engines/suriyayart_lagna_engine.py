"""
Suriyayart Lagna Engine
========================
Implements the "อันโตนาที" (Anto Natee) Ascendant-calculation algorithm found in
ตำราจตุพลวัตร V.10 (ภาคผนวก ข.1), section 2.2.

The tome provides:
  - The algorithm's STEPS (3.1-3.6) in prose
  - The Anto Natee reference table (12 zodiac signs, in minutes)
It does NOT provide the underlying astronomical formulas (solar ecliptic
longitude, true sunrise time) — those are standard public astronomy, not
proprietary to this tradition, so this module implements them using the
well-known low-precision solar position algorithm (Meeus, "Astronomical
Algorithms", accurate to ~0.01°) and the standard sunrise hour-angle equation.

⚠️ VALIDATION STATUS: Unlike BirthPower/NamePower (which had a worked example
in the tome to check against), no worked Lagna example was found. This
implementation has NOT been cross-checked against a known-correct chart.
Before trusting this in production, spot-check its output against a few
real birth charts computed by an established Thai astrology source.
"""

import math
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Anto Natee reference table (ภาคผนวก ข.1) — minutes per zodiac sign
# ---------------------------------------------------------------------------
ZODIAC_ORDER = ["เมษ", "พฤษภ", "มิถุน", "กรกฎ", "สิงห์", "กันย์",
                "ตุลย์", "พิจิก", "ธนู", "มังกร", "กุมภ์", "มีน"]

ANTO_NATEE = {
    "เมษ": 150, "พฤษภ": 160, "มิถุน": 175, "กรกฎ": 183,
    "สิงห์": 178, "กันย์": 168, "ตุลย์": 168, "พิจิก": 178,
    "ธนู": 183, "มังกร": 175, "กุมภ์": 160, "มีน": 150,
}

# Thailand's official standard meridian for UTC+7 (matches the tome's
# worked example: Bangkok ~100.5°E gives ~ -18 min correction against 105°E)
THAI_STANDARD_MERIDIAN = 105.0


# ---------------------------------------------------------------------------
# Standard astronomy (Meeus low-precision solar position) — public domain
# formulas, not specific to this tradition.
# ---------------------------------------------------------------------------

def julian_day(dt_utc: datetime) -> float:
    y, m = dt_utc.year, dt_utc.month
    d = dt_utc.day + (dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600) / 24
    if m <= 2:
        y -= 1
        m += 12
    A = y // 100
    B = 2 - A + A // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + B - 1524.5


def solar_ecliptic_longitude(jd: float) -> float:
    """Apparent ecliptic longitude of the Sun, in degrees [0,360). Meeus low-precision."""
    T = (jd - 2451545.0) / 36525.0
    L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T**2) % 360
    M = math.radians((357.52911 + 35999.05029 * T - 0.0001537 * T**2) % 360)
    C = ((1.914602 - 0.004817 * T - 0.000014 * T**2) * math.sin(M)
         + (0.019993 - 0.000101 * T) * math.sin(2 * M)
         + 0.000289 * math.sin(3 * M))
    true_long = L0 + C
    omega = math.radians(125.04 - 1934.136 * T)
    apparent_long = true_long - 0.00569 - 0.00478 * math.sin(omega)
    return apparent_long % 360


def solar_declination(ecliptic_longitude_deg: float, jd: float) -> float:
    T = (jd - 2451545.0) / 36525.0
    eps0 = 23.439291 - 0.0130042 * T  # mean obliquity of the ecliptic
    lam = math.radians(ecliptic_longitude_deg)
    eps = math.radians(eps0)
    return math.degrees(math.asin(math.sin(eps) * math.sin(lam)))


def true_sunrise_utc(date, lat_deg: float, lon_deg: float) -> datetime:
    """
    Approximate true sunrise (UTC) for a given calendar date and location,
    accounting for atmospheric refraction (-0.833° altitude at sunrise).
    One-pass approximation (noon-based declination) — accurate to ~1-2 minutes,
    sufficient for zodiac-sign-level Lagna work.
    """
    noon_utc = datetime(date.year, date.month, date.day, 12, 0, 0) - timedelta(hours=lon_deg / 15)
    jd_noon = julian_day(noon_utc)
    lam = solar_ecliptic_longitude(jd_noon)
    decl = math.radians(solar_declination(lam, jd_noon))
    lat = math.radians(lat_deg)

    cos_H0 = (math.sin(math.radians(-0.833)) - math.sin(lat) * math.sin(decl)) / (math.cos(lat) * math.cos(decl))
    cos_H0 = max(-1.0, min(1.0, cos_H0))  # guard polar edge cases
    H0_deg = math.degrees(math.acos(cos_H0))

    # Equation of time (minutes) — approx, Meeus low precision
    T = (jd_noon - 2451545.0) / 36525.0
    L0 = math.radians((280.46646 + 36000.76983 * T) % 360)
    M = math.radians((357.52911 + 35999.05029 * T) % 360)
    e = 0.016708634 - 0.000042037 * T
    y = math.tan(math.radians(23.4393 / 2)) ** 2
    eot = 4 * math.degrees(
        y * math.sin(2 * L0) - 2 * e * math.sin(M) + 4 * e * y * math.sin(M) * math.cos(2 * L0)
        - 0.5 * y**2 * math.sin(4 * L0) - 1.25 * e**2 * math.sin(2 * M)
    )  # minutes

    solar_noon_utc_offset_min = 720 - 4 * lon_deg - eot  # minutes from UTC midnight
    sunrise_min = solar_noon_utc_offset_min - 4 * H0_deg
    base = datetime(date.year, date.month, date.day)
    return base + timedelta(minutes=sunrise_min)


def get_zodiac_sign(longitude_deg: float):
    """Returns (sign_name, degrees_into_sign) for an ecliptic longitude 0-360."""
    idx = int(longitude_deg // 30)
    deg_into_sign = longitude_deg % 30
    return ZODIAC_ORDER[idx], deg_into_sign


# ---------------------------------------------------------------------------
# The Anto Natee Lagna algorithm (steps 3.1-3.6 from the tome)
# ---------------------------------------------------------------------------

def calculate_lagna(birth_date, birth_time_local, birth_lat: float, birth_lon: float,
                     utc_offset_hours: float = 7.0) -> dict:
    """
    birth_date: datetime.date
    birth_time_local: datetime.time (clock time as recorded, e.g. hospital clock)
    birth_lat, birth_lon: birth location in decimal degrees
    utc_offset_hours: civil timezone offset (Thailand = +7)
    """
    # Step 1: local time correction — Thailand's clock is set to 105°E meridian;
    # true local time differs by 4 min per degree of longitude difference.
    correction_min = (birth_lon - THAI_STANDARD_MERIDIAN) * 4

    birth_dt_civil = datetime.combine(birth_date, birth_time_local)
    birth_dt_utc = birth_dt_civil - timedelta(hours=utc_offset_hours)
    birth_dt_true_local = birth_dt_civil + timedelta(minutes=correction_min)

    # Step 2 (true sunrise): compute for the given date/location, in UTC then
    # convert to the same civil-time frame for comparison.
    sunrise_utc = true_sunrise_utc(birth_date, birth_lat, birth_lon)
    sunrise_civil = sunrise_utc + timedelta(hours=utc_offset_hours)

    # Step 3.1: Sun's ecliptic longitude (Somphus Atit) at true sunrise
    jd_sunrise = julian_day(sunrise_utc)
    sun_long_at_sunrise = solar_ecliptic_longitude(jd_sunrise)
    sun_sign, deg_into_sign = get_zodiac_sign(sun_long_at_sunrise)

    # Step 3.2: remaining time in the Sun's sign ("เวลาอนาคตอุทัย") —
    # proportion of that sign's Anto Natee value corresponding to the
    # remaining degrees (30 - deg_into_sign) out of 30.
    remaining_deg = 30 - deg_into_sign
    remaining_time_in_sun_sign = (remaining_deg / 30) * ANTO_NATEE[sun_sign]

    # Step 3.3: time elapsed between (corrected) birth time and true sunrise
    elapsed_min = (birth_dt_true_local - sunrise_civil).total_seconds() / 60
    if elapsed_min < 0:
        elapsed_min += 24 * 60  # birth was before this day's sunrise -> measure from previous cycle

    # Step 3.4: subtract remaining time in Sun's own sign first
    remainder = elapsed_min - remaining_time_in_sun_sign

    # Step 3.5-3.6: if time remains, walk forward through subsequent signs
    # ("ทวนเข็มนาฬิกา" = forward zodiac order), subtracting each sign's full
    # Anto Natee value, until what's left can't cover the next sign.
    sign_idx = ZODIAC_ORDER.index(sun_sign)
    steps_log = [{
        "step": "start_in_sun_sign", "sign": sun_sign,
        "remaining_time_in_sun_sign": round(remaining_time_in_sun_sign, 2),
        "elapsed_since_sunrise": round(elapsed_min, 2),
    }]

    if remainder < 0:
        # Birth happened before the Sun's own sign finished rising -> Lagna is
        # still the Sun's sign.
        lagna_sign = sun_sign
    else:
        lagna_sign = None
        while True:
            sign_idx = (sign_idx + 1) % 12
            candidate_sign = ZODIAC_ORDER[sign_idx]
            candidate_value = ANTO_NATEE[candidate_sign]
            steps_log.append({"step": "subtract", "sign": candidate_sign,
                               "value": candidate_value, "remainder_before": round(remainder, 2)})
            if remainder < candidate_value:
                lagna_sign = candidate_sign
                break
            remainder -= candidate_value

    return {
        "lagna_sign": lagna_sign,
        "sun_sign_at_sunrise": sun_sign,
        "sun_longitude_at_sunrise_deg": round(sun_long_at_sunrise, 3),
        "true_sunrise_civil_time": sunrise_civil.strftime("%H:%M"),
        "birth_time_corrected": birth_dt_true_local.strftime("%H:%M"),
        "local_time_correction_min": round(correction_min, 1),
        "calculation_trace": steps_log,
        "validation_status": "UNVERIFIED — no worked example found in source tome; spot-check before production use",
    }


if __name__ == "__main__":
    import json
    from datetime import date, time

    print("=" * 70)
    print("TEST — Suriyayart Lagna calculation")
    print("(Bangkok coordinates, matches the tome's -18min correction example)")
    print("=" * 70)
    result = calculate_lagna(
        birth_date=date(1990, 8, 15),
        birth_time_local=time(18, 30),
        birth_lat=13.75,
        birth_lon=100.50,
        utc_offset_hours=7.0,
    )
    print(json.dumps({k: v for k, v in result.items() if k != "calculation_trace"},
                      ensure_ascii=False, indent=2))
    print()
    print("Correction check: expected ~ -18.0 min for Bangkok, got:",
          result["local_time_correction_min"])
    assert abs(result["local_time_correction_min"] - (-18.0)) < 0.5, "Bangkok correction should match tome's worked example"
    print()
    print("✅ Longitude-correction formula matches the tome's stated Bangkok example.")
    print("⚠️  Lagna sign result itself is UNVERIFIED — no ground-truth example exists yet.")
