#!/usr/bin/env python3
"""Golden fixtures สำหรับ transit engine (Logic 9/10/11) — dates ตายตัว"""
import os
import sys
import json
import types
from datetime import date

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


load_engine("suriyayart_lagna_engine")
load_engine("daily_prediction_engine")
T = load_engine("transit_engine")

dates = {"y2026_07_16": date(2026, 7, 16), "y2000_01_01": date(2000, 1, 1), "y2010_06_15": date(2010, 6, 15)}

fix = {"monthly": {}, "yearly": {}, "birthday": {}}
for label, d in dates.items():
    fix["monthly"][label] = T.monthly_prediction("ธนู", d)
    fix["yearly"][label] = T.yearly_prediction("ธนู", d)

fix["birthday"]["age36"] = T.birthday_prediction(date(1990, 8, 15), date(2026, 7, 16), "จันทร์")
fix["birthday"]["age0_same_day"] = T.birthday_prediction(date(1990, 8, 15), date(1990, 8, 15), "จันทร์")
fix["birthday"]["pre_birthday"] = T.birthday_prediction(date(1990, 8, 15), date(2026, 3, 1), "จันทร์")
fix["birthday"]["unknown_day"] = T.birthday_prediction(date(1990, 8, 15), date(2026, 7, 16), "ไม่มี")

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "transit.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(fix, f, ensure_ascii=False, indent=2)
print("✅ wrote transit.fixture.json")
