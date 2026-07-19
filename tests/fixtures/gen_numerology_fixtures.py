#!/usr/bin/env python3
"""Golden fixtures สำหรับ artifact_numerology engine (Logic 2)"""
import os
import sys
import json
import types

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)
os.chdir(os.path.join(ROOT, "data"))  # engine เปิด master_energy_*.json แบบ relative


def load_engine(name):
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


load_engine("kruth_element_engine")  # numerology import THAI_LABEL_4 จากตัวนี้
N = load_engine("artifact_numerology_engine")

fix = {
    "lookup2_37": N.lookup_2digit(37),
    "lookup2_0": N.lookup_2digit(0),
    "lookup2_99": N.lookup_2digit(99),
    "lookup3_123_hit": N.lookup_3digit(123),
    "lookup3_0_hit": N.lookup_3digit(0),
    "lookup3_246_fallback": N.lookup_3digit(246),
    "phone_full": N.analyze_phone_number("081-234-5678"),
    "phone_short": N.analyze_phone_number("12"),
    "phone_exact3": N.analyze_phone_number("999"),
    "digit_reduce_44": N.digit_sum_reduce(44),
    "artifact_element_246": N.artifact_element(246),
}

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "numerology.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(fix, f, ensure_ascii=False, indent=2)
print("✅ wrote numerology.fixture.json")
