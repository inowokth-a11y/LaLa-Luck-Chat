#!/usr/bin/env python3
"""Golden fixtures สำหรับ daily_prediction engine (เฉพาะเคส deterministic)"""
import os
import sys
import json
import types
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)


def load_engine(name):
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


load_engine("suriyayart_lagna_engine")  # dependency ของ daily
D = load_engine("daily_prediction_engine")

# กาลกิณีตามวัน + ราหู(8)
kalakini_by_day = {}
for day in ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]:
    kalakini_by_day[day] = D.PLANET_NAME_TH[D.get_kalakini_planet(day)]
kalakini_by_day["ราหู_8"] = D.PLANET_NAME_TH[D.get_kalakini_planet(8)]
kalakini_by_day["unknown_day"] = D.get_kalakini_planet("ไม่มี")  # None

# ตำแหน่งจันทร์ + ราศี ที่เวลา UTC ตายตัว
moon_cases = {}
for label, dt in {
    "j2000_epoch": datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
    "y2026_07_16": datetime(2026, 7, 16, 0, 0, 0, tzinfo=timezone.utc),
    "y1990_08_15_1130": datetime(1990, 8, 15, 11, 30, 0, tzinfo=timezone.utc),
}.items():
    dt_naive = dt.replace(tzinfo=None)
    moon_cases[label] = {
        "moon_longitude": D.moon_ecliptic_longitude(D.julian_day(dt_naive)),
        "moon_sign": D.get_moon_sign(dt_naive),
    }

# daily_prediction เคสต่างๆ
daily_cases = {
    "no_birthday": D.daily_prediction(lagna_sign="ธนู", moon_sign="เมษ"),
    "kalakini_not_triggered": D.daily_prediction(lagna_sign="ธนู", moon_sign="กรกฎ", birth_day_of_week="จันทร์"),
    "kalakini_triggered": D.daily_prediction(lagna_sign="ธนู", moon_sign="สิงห์", birth_day_of_week="จันทร์"),
    "rahu_uncheckable": D.daily_prediction(lagna_sign="ธนู", moon_sign="เมษ", birth_day_of_week="ศุกร์"),
    "opposition": D.daily_prediction(lagna_sign="เมษ", moon_sign="ตุลย์"),
    "conjunct": D.daily_prediction(lagna_sign="เมษ", moon_sign="เมษ"),
}

fix = {"kalakini_by_day": kalakini_by_day, "moon_cases": moon_cases, "daily_cases": daily_cases}
FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "daily.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(fix, f, ensure_ascii=False, indent=2)
print("✅ wrote daily.fixture.json")
