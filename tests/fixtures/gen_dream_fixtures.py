#!/usr/bin/env python3
"""Golden fixtures สำหรับ dream_interpretation engine (Logic 4)"""
import os
import sys
import json
import types

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)
os.chdir(os.path.join(ROOT, "data"))  # engine เปิด dream_*.json + log แบบ relative


def load_engine(name):
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


load_engine("wellness_activity_engine")
load_engine("kruth_element_engine")
D = load_engine("dream_interpretation_engine")

USER = "test_user_001"
THEME = "ถูกไล่ล่า / วิ่งหนี"

# log ที่เข้าเกณฑ์ซ้ำ (2 เดือนติดกัน ≥3 ครั้ง)
recurring_log = [
    {"user_id": USER, "theme": THEME, "year_month": "2026-05", "count": 4},
    {"user_id": USER, "theme": THEME, "year_month": "2026-06", "count": 3},
]
# log ที่ยังไม่เข้าเกณฑ์ (เดือนเดียว)
non_recurring_log = [
    {"user_id": USER, "theme": THEME, "year_month": "2026-05", "count": 4},
]


def with_log(log, fn):
    """เขียน dream_occurrence_log.json ชั่วคราวให้ engine อ่าน แล้วลบทิ้ง"""
    with open(D.DREAM_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False)
    try:
        return fn()
    finally:
        if os.path.exists(D.DREAM_LOG_FILE):
            os.remove(D.DREAM_LOG_FILE)


fix = {
    "interpret_crisis": D.interpret_dream("ฝันเห็นแม่ แต่ช่วงนี้ทนไม่ไหวแล้ว อยากตาย", day_of_week_th="จันทร์"),
    "interpret_symbol_mother": D.interpret_dream("ฝันเห็นแม่มายืนอยู่หน้าบ้าน", day_of_week_th="จันทร์"),
    "interpret_theme_chase": D.interpret_dream("เมื่อคืนฝันว่าถูกไล่ล่า วิ่งหนีไม่ทัน", day_of_week_th="อังคาร"),
    "interpret_no_match": D.interpret_dream("ฝันเห็นยานอวกาศสีม่วงบินอยู่เหนือตึกระฟ้า"),
    "interpret_deep": D.interpret_dream("ฝันเห็นแม่มายืนอยู่หน้าบ้าน", day_of_week_th="จันทร์", want_deep_reading=True),
    "recurring_check": with_log(recurring_log, lambda: D.check_dream_recurring(USER, THEME)),
    "recurring_suggestion": with_log(recurring_log, lambda: D.get_recurring_theme_suggestion(USER, THEME)),
    "non_recurring_suggestion": with_log(non_recurring_log, lambda: D.get_recurring_theme_suggestion(USER, THEME)),
    "ai1_prompt": D.get_ai1_system_prompt(),
    "variants_sample": D._variants("พ่อ / บิดา, ปู่"),
}

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "dream.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(fix, f, ensure_ascii=False, indent=2)
print("✅ wrote dream.fixture.json")
