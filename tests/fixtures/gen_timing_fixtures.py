#!/usr/bin/env python3
"""Golden fixtures สำหรับ Logic 3: auspicious_timing (Ubakong) + kala_yoke"""
import os
import sys
import json
import types
from datetime import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)
os.chdir(os.path.join(ROOT, "data"))  # engine เปิด ubakong_time_chart.json แบบ relative


def load_engine(name):
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


A = load_engine("auspicious_timing_engine")
K = load_engine("kala_yoke_engine")

ausp = {
    "mon_0700": A.check_auspicious_time("จันทร์", time(7, 0)),
    "sun_1600": A.check_auspicious_time("อาทิตย์", time(16, 0)),
    "sat_0900": A.check_auspicious_time("เสาร์", time(9, 0)),
    "wed_2000_night": A.check_auspicious_time("พุธ", time(20, 0)),
    "sun_0700": A.check_auspicious_time("อาทิตย์", time(7, 0)),
    "best_mon": A.best_time_today("จันทร์"),
    "best_sun": A.best_time_today("อาทิตย์"),
}

cs_2569 = K.to_chulasakarat(be_year=2569)
kala = {
    "calc_1369": K.calculate_kala_yoke(1369),
    "chula_ce_2007": K.to_chulasakarat(ce_year=2007),
    "chula_be_2550": K.to_chulasakarat(be_year=2550),
    "cs_2569": cs_2569,
    "day_mon_2569": K.check_day_kala_yoke("จันทร์", cs_2569),
    "combined_mon_0900": K.check_combined_auspicious_time("จันทร์", time(9, 0), cs_2569),
    "full_no_lagna_mon_0900": K.check_full_auspicious_time("จันทร์", time(9, 0), cs_2569),
}

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "timing.fixture.json"), "w", encoding="utf-8") as f:
    json.dump({"auspicious": ausp, "kalayoke": kala}, f, ensure_ascii=False, indent=2)
print("✅ wrote timing.fixture.json")
