#!/usr/bin/env python3
"""Golden fixtures สำหรับ naming_branding engine (Logic 19)"""
import os
import sys
import json
import types

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)
os.chdir(os.path.join(ROOT, "data"))  # kruth_element_engine เปิด personal_year_guidance.json


def load_engine(name):
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


load_engine("kruth_element_engine")  # naming import wu_xing_score จากตัวนี้
N = load_engine("naming_branding_engine")

agg = N.aggregate_element("Fire", ["Fire", "Earth", "Wood"])
pool = ["Wanchai", "Kanya", "Duangjai", "Chaiyo", "Fahsai", "Rin", "Ice"]

fix = {
    "name_kamon": N.name_element("กมล"),
    "name_thanawat": N.name_element("ธนวัฒน์"),
    "name_sophie": N.name_element("โซฟี"),
    "name_no_match": N.name_element("123!@#"),
    "aggregate_fire_team": agg,
    "aggregate_no_members": N.aggregate_element("Water"),
    "score_kamon": N.score_candidate_name("กมล", agg, missing_elements=["Water"]),
    "score_thanawat": N.score_candidate_name("ธนวัฒน์", agg, missing_elements=["Water"]),
    "reverse_water": N.reverse_generate_candidates("Water", pool),
    "logo_water": N.logo_prompt_text("Water", "AquaFlow"),
}

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")
with open(os.path.join(FIX_DIR, "naming.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(fix, f, ensure_ascii=False, indent=2)
print("✅ wrote naming.fixture.json")
