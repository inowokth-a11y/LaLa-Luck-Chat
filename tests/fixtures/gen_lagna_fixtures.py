#!/usr/bin/env python3
"""Golden fixtures สำหรับ lagna engine — ดู gen_element_fixtures.py สำหรับหลักการ"""
import os
import sys
import json
import types
from datetime import date, time

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


L = load_engine("suriyayart_lagna_engine")

cases = {
    "bangkok_1990_08_15_1830": dict(birth_date=date(1990, 8, 15), birth_time_local=time(18, 30),
                                    birth_lat=13.75, birth_lon=100.50, utc_offset_hours=7.0),
    "chiangmai_2000_01_01_0600": dict(birth_date=date(2000, 1, 1), birth_time_local=time(6, 0),
                                      birth_lat=18.79, birth_lon=98.98, utc_offset_hours=7.0),
    "bangkok_1985_03_20_0300_presunrise": dict(birth_date=date(1985, 3, 20), birth_time_local=time(3, 0),
                                               birth_lat=13.75, birth_lon=100.50, utc_offset_hours=7.0),
}

fix = {name: L.calculate_lagna(**kw) for name, kw in cases.items()}

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "lagna.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(fix, f, ensure_ascii=False, indent=2)
print("✅ wrote lagna.fixture.json")
