#!/usr/bin/env python3
"""สร้าง golden fixtures จาก engine Python (แหล่งอ้างอิงจริง) สำหรับ parity test ฝั่ง TS
รัน: python3 tests/fixtures/gen_element_fixtures.py
ผลลัพธ์: tests/fixtures/element.fixture.json + wellness.fixture.json

หลักการ (CLAUDE.md §6): TS ต้องคืนค่าตรงเป๊ะกับ Python ทุกตัวเลข ไม่ใช่แค่ 'ดูสมเหตุสมผล'
"""
import os
import sys
import json
import types

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)
# engine เปิด personal_year_guidance.json แบบ relative — ต้อง chdir ไป data/ ก่อน import
os.chdir(os.path.join(ROOT, "data"))


def load_engine(name):
    """โหลด engine โดย prepend 'from __future__ import annotations' เพื่อให้ syntax
    type-hint 3.10+ (dict | None) รันได้บน Python 3.9 โดยไม่แตะไฟล์ต้นฉบับ"""
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod  # ให้ cross-import ภายใน (wellness) resolve ได้
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


W = load_engine("wellness_activity_engine")  # ต้องมาก่อน เพราะ K เรียกใช้
load_engine("suriyayart_lagna_engine")       # K ใช้หาวันลี่ชุน (B1)
K = load_engine("kruth_element_engine")

FIX_DIR = os.path.join(ROOT, "tests", "fixtures")

# ---- element.fixture.json ----
element_fix = {}

inp = K.ElementSeedInputs(
    day_of_week="อังคาร", birth_month=2, birth_year_ad=1986,
    zodiac_year_animal="ขาล", name_wood_pct=None,
)
element_fix["element_seed_test1"] = K.calculate_element_seed(inp)

# case ที่มี name_wood_pct >= 50 เพื่อทดสอบ source 5
inp2 = K.ElementSeedInputs(
    day_of_week="พุธ", birth_month=5, birth_year_ad=1990,
    zodiac_year_animal="มะเมีย", name_wood_pct=70,
)
element_fix["element_seed_name_wood"] = K.calculate_element_seed(inp2)

# --- regression: B2 ตาราง DAY_ELEMENT (พุธ=ดิน, พฤหัสบดี=ลม) ---
element_fix["day_element_table"] = dict(K.DAY_ELEMENT)
element_fix["element_seed_thursday"] = K.calculate_element_seed(K.ElementSeedInputs(
    day_of_week="พฤหัสบดี", birth_month=7, birth_year_ad=1978,
    zodiac_year_animal="มะเมีย", name_wood_pct=None,
))
element_fix["element_seed_wednesday"] = K.calculate_element_seed(K.ElementSeedInputs(
    day_of_week="พุธ", birth_month=7, birth_year_ad=1978,
    zodiac_year_animal="มะเมีย", name_wood_pct=None,
))

# --- regression: B1 ขอบเขตลี่ชุน (立春) ---
element_fix["lichun_days"] = {str(y): K.lichun_day_of_february(y) for y in [1970, 1986, 1992, 1996, 2004, 2026]}
# เกิด ม.ค. -> ต้องใช้ธาตุปีก่อนหน้า
element_fix["cn_jan_1986"] = K.chinese_wuxing_by_year_end_digit(1986, 1, 20)   # -> 1985 = Wood
element_fix["cn_jan_1970"] = K.chinese_wuxing_by_year_end_digit(1970, 1, 10)   # -> 1969 = Earth
# เกิด ก.พ. หลังลี่ชุน -> ปีเดิม
element_fix["cn_feb_after"] = K.chinese_wuxing_by_year_end_digit(2004, 2, 10)  # -> 2004 = Wood
# เกิด ก.พ. ก่อนลี่ชุน -> ปีก่อนหน้า
element_fix["cn_feb_before"] = K.chinese_wuxing_by_year_end_digit(1992, 2, 1)  # -> 1991 = Metal
# ไม่ส่งเดือน -> พฤติกรรมเดิมตามสเปกเป๊ะ (backward compatible)
element_fix["cn_no_month_1986"] = K.chinese_wuxing_by_year_end_digit(1986)     # -> 1986 = Fire
element_fix["element_seed_jan_birth"] = K.calculate_element_seed(K.ElementSeedInputs(
    day_of_week="จันทร์", birth_month=1, birth_year_ad=1986, birth_day=20,
    zodiac_year_animal="ขาล", name_wood_pct=None,
))

element_fix["wuxing_overcome_water"] = K.wu_xing_score("Fire", "Water", user_missing_elements=[])
element_fix["wuxing_productive_clash"] = K.wu_xing_score("Fire", "Water", user_missing_elements=["Water"])
element_fix["wuxing_generate"] = K.wu_xing_score("Wood", "Fire")
element_fix["wuxing_same"] = K.wu_xing_score("Fire", "Fire")
element_fix["wuxing_drain"] = K.wu_xing_score("Fire", "Wood")
element_fix["wuxing_overcome_metal"] = K.wu_xing_score("Fire", "Metal")

element_fix["friction_fire_lowE_highN"] = K.friction_score("ไฟ", big_five_E=2.0, big_five_N=3.6)
element_fix["friction_fire_midE_midN"] = K.friction_score("ไฟ", big_five_E=2.7, big_five_N=3.2)
element_fix["friction_earth_lowE"] = K.friction_score("ดิน", big_five_E=2.0, big_five_N=2.0)
element_fix["friction_wind_high"] = K.friction_score("ลม", big_five_E=3.0, big_five_N=3.0, pdcr_wind=6)
element_fix["friction_wind_low_pdcr"] = K.friction_score("ลม", big_five_E=3.0, big_five_N=2.0, pdcr_wind=5)

element_fix["normalize_3_5"] = K.normalize_to_0_3(3, 5)
element_fix["normalize_zero_max"] = K.normalize_to_0_3(2, 0)

track_a = {"Fire": K.normalize_to_0_3(3, 5), "Earth": K.normalize_to_0_3(2, 5), "Wood": 0.0, "Water": 0.0}
track_b = {"Fire": K.normalize_to_0_3(45, 100), "Earth": K.normalize_to_0_3(10, 100),
           "Wood": K.normalize_to_0_3(30, 100), "Water": K.normalize_to_0_3(15, 100)}
element_fix["calc_deviation_test6"] = K.calc_deviation(track_a, track_b)

element_fix["personal_year_15_8_2026"] = K.calculate_personal_year(birth_day=15, birth_month=8, current_year=2026)
element_fix["personal_year_guidance_6"] = K.get_personal_year_guidance(element_fix["personal_year_15_8_2026"])
element_fix["personal_year_guidance_missing"] = K.get_personal_year_guidance(99)

element_fix["ttm_remedy_water_wood"] = K.ttm_remedy_for_missing(["Water", "Wood"])
element_fix["ttm_remedy_fire"] = K.ttm_remedy_for_missing(["Fire"])

element_fix["safety_gate_safe"] = K.safety_gate("ฝันเห็นแม่มายืนหน้าบ้าน")
element_fix["safety_gate_crisis"] = K.safety_gate("ช่วงนี้ทนไม่ไหวแล้ว อยากตายจัง")

with open(os.path.join(FIX_DIR, "element.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(element_fix, f, ensure_ascii=False, indent=2)

# ---- wellness.fixture.json ----
wellness_fix = {
    "pair_fire": W.get_wellness_pair("Fire"),
    "pair_metal": W.get_wellness_pair("Metal"),
    "pair_unknown": W.get_wellness_pair("Nonexistent"),
    "for_missing_wood_water": W.get_wellness_for_missing(["Wood", "Water"]),
}
with open(os.path.join(FIX_DIR, "wellness.fixture.json"), "w", encoding="utf-8") as f:
    json.dump(wellness_fix, f, ensure_ascii=False, indent=2)

print("✅ wrote element.fixture.json + wellness.fixture.json")
