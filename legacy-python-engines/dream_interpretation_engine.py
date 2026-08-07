"""
Logic 4: Dream Interpretation Engine (ทำนายฝัน / ลางสังหรณ์)
================================================================
Implements the CASE 2 workflow from Prompt_Lala_Lucky, using the real
data files (previously only referenced by filename, now actually loaded):
  - Dream_Master_DB_V2.csv (457 symbols: object -> Chinese char -> Kangxi
    strokes -> element -> meaning keywords)
  - Dream_Psychology_50themes_FINAL.xlsx (50 archetypal dream themes with
    psychological interpretation + element connection + remedy)

Workflow (per spec):
  1. Isolate elements: find symbol matches (DB) and theme matches (Psych)
     in the free-text dream description
  2. Decode meaning: pull from whichever table(s) matched
  3. Context synthesis: combine with day-of-week element (per
     kruth_element_engine.DAY_ELEMENT) — principle-level only by default,
     do not hand down a final verdict unless the user explicitly asks for
     "คำทำนายลึก" / "ขอเลขชุด"
  4. NOT FOUND -> AI-1 enrichment pipeline (see below)

-----------------------------------------------------------------------------
AI-1 ENRICHMENT PIPELINE (for symbols not in either table)
-----------------------------------------------------------------------------
⚠️ IMPORTANT EMPIRICAL FINDING before designing this: the spec originally
called for "แปลงเป็นอักษรจีนตัวเต็ม -> นับขีด Kangxi" (Kangxi stroke-count)
to derive the element for unknown symbols. Testing this against the real
457-row database found that NEITHER of the two competing Chinese stroke-
to-element conventions (五格剖象法: 1,2=Wood..9,0=Water; or 周易: 3,8=Wood..
1,6=Water) explains the database's actual element assignments — both score
~20% match, i.e. random chance. The real database's elements were assigned
by MEANING/semantic judgment (字义五行法-style), not stroke arithmetic.

Therefore AI-1's job is NOT "count strokes, apply formula" — it is:
  1. Web-search the symbol's cultural/dream-interpretation meaning
  2. Reason semantically about which of the 5 elements the CONCEPT aligns
     with (matching the pattern demonstrated by the existing 457 rows,
     given as few-shot examples)
  3. Still record chinese_char + kangxi_strokes if a natural translation
     exists (informational/reference value), but they are NOT what
     determines the element
  4. Output in the exact same schema as Dream_Master_DB_V2, tagged as a
     pending/unreviewed discovery — NOT auto-merged into the live DB
     without human review, to protect data quality
"""

import json
import re
from datetime import datetime, timezone
from kruth_element_engine import DAY_ELEMENT, THAI_LABEL_4, safety_gate
from wellness_activity_engine import get_wellness_pair

with open("dream_master_db.json", encoding="utf-8") as f:
    DREAM_DB = json.load(f)

with open("dream_psychology_50.json", encoding="utf-8") as f:
    DREAM_PSYCH = json.load(f)

PENDING_DISCOVERIES_FILE = "dream_pending_discoveries.json"

# ---------------------------------------------------------------------------
# DREAM RECURRING COUNTER — ตามสเปก Platform E เดิม: "theme เดิม > 3 ครั้ง/เดือน
# ติดกัน 2 เดือน -> แจ้งให้สำรวจจิตใต้สำนึก แนะนำ remedy ตรงธีม"
#
# ⚠️ หลักการสำคัญ (ตกลงกันไว้ชัดเจนในเซสชันนี้): เก็บแค่ "ความถี่" (theme+เดือน+
# จำนวนครั้ง) เท่านั้น — ห้ามเก็บการตีความ/ข้อสรุปสภาพจิตใจของผู้ใช้ในบันทึกนี้
# เด็ดขาด ไม่ใช่ "โปรไฟล์สุขภาพจิตสะสม" ผลลัพธ์ที่คืนคือ "กิจกรรมแนะนำ" เท่านั้น
# ไม่ใช่ข้อความวินิจฉัย
# ---------------------------------------------------------------------------

DREAM_LOG_FILE = "dream_occurrence_log.json"
RECURRING_THRESHOLD_PER_MONTH = 3
RECURRING_CONSECUTIVE_MONTHS = 2

ELEMENT_WORD_TO_KEY = {"ไฟ": "Fire", "ดิน": "Earth", "ลม": "Wood", "น้ำ": "Water"}


def _load_dream_log() -> list:
    try:
        with open(DREAM_LOG_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def _save_dream_log(entries: list):
    with open(DREAM_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)


def log_dream_occurrence(user_id: str, theme: str, when: datetime = None) -> dict:
    """บันทึกแค่ 'เกิดธีมนี้ในเดือนนี้' — ไม่มีข้อความ ไม่มีการตีความ"""
    when = when or datetime.now(timezone.utc)
    year_month = when.strftime("%Y-%m")
    log = _load_dream_log()

    existing = next((e for e in log if e["user_id"] == user_id and e["theme"] == theme and e["year_month"] == year_month), None)
    if existing:
        existing["count"] += 1
    else:
        log.append({"user_id": user_id, "theme": theme, "year_month": year_month, "count": 1})
    _save_dream_log(log)
    return {"logged": True, "theme": theme, "year_month": year_month}


def check_dream_recurring(user_id: str, theme: str) -> dict:
    """ตรวจว่าธีมนี้เข้าเกณฑ์ 'ซ้ำ' หรือยัง (>3 ครั้ง/เดือน ติดกัน 2 เดือน)"""
    log = _load_dream_log()
    entries = sorted(
        [e for e in log if e["user_id"] == user_id and e["theme"] == theme],
        key=lambda e: e["year_month"],
    )
    qualifying_months = [e["year_month"] for e in entries if e["count"] >= RECURRING_THRESHOLD_PER_MONTH]

    is_recurring = False
    if len(qualifying_months) >= RECURRING_CONSECUTIVE_MONTHS:
        last_two = sorted(qualifying_months)[-2:]
        y1, m1 = map(int, last_two[0].split("-"))
        y2, m2 = map(int, last_two[1].split("-"))
        is_recurring = (y2 * 12 + m2) - (y1 * 12 + m1) == 1

    return {"theme": theme, "qualifying_months": qualifying_months, "is_recurring": is_recurring}


def parse_element_from_connection(element_connection: str):
    """แปลงข้อความ element_connection (เช่น 'ลม(วาตะ) — ลอยไร้ราก') เป็น element key"""
    for word, key in ELEMENT_WORD_TO_KEY.items():
        if element_connection.startswith(word):
            return key
    return None


def get_recurring_theme_suggestion(user_id: str, theme: str) -> dict:
    """ถ้าธีมนี้เข้าเกณฑ์ซ้ำแล้ว -> คืนกิจกรรมแนะนำ (ไม่ใช่คำวินิจฉัย)"""
    check = check_dream_recurring(user_id, theme)
    if not check["is_recurring"]:
        return {"triggered": False, **check}

    theme_row = next((t for t in DREAM_PSYCH if theme in t["dream_theme"] or t["dream_theme"] in theme), None)
    if not theme_row:
        return {"triggered": True, "error": "พบว่าธีมนี้ซ้ำ แต่ไม่พบข้อมูล element_connection ของธีมนี้", **check}

    element = parse_element_from_connection(theme_row.get("element_connection", ""))
    if not element:
        return {"triggered": True, "error": "แปลง element_connection ไม่สำเร็จ", **check}

    return {
        "triggered": True,
        "theme": theme,
        "message": f"ช่วงนี้ธีม '{theme}' visit คุณบ่อยเป็นพิเศษ (≥{RECURRING_THRESHOLD_PER_MONTH} ครั้ง/เดือน ติดกัน {RECURRING_CONSECUTIVE_MONTHS} เดือน) ลองกิจกรรมนี้ดูไหมคะ",
        "suggested_wellness": get_wellness_pair(element),
        **check,
    }


def _load_pending():
    try:
        with open(PENDING_DISCOVERIES_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def _save_pending(entries):
    with open(PENDING_DISCOVERIES_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)


def get_ai1_system_prompt() -> str:
    """
    System prompt for AI-1 (the enrichment/discovery model). In production
    this model is given web_search access and called ONLY when
    find_symbol_matches() + find_theme_matches() both return empty.
    """
    few_shot = "\n".join(
        f'- "{r["dream_object"]}" -> element: {r["element"]} (เหตุผลเชิงความหมาย: {r["meaning_keyword"]})'
        for r in DREAM_DB[:8]
    )
    return f"""คุณคือ AI ตัวแรกในระบบทำนายฝัน 2 ชั้น หน้าที่ของคุณคือ "ค้นคว้าและตัดสินธาตุ" ให้กับ
สัญลักษณ์ความฝันที่ไม่มีอยู่ในฐานข้อมูล 487 รายการ

⚠️ กฎสำคัญที่สุด: ห้ามคำนวณธาตุจากการนับขีดตัวอักษรจีนเด็ดขาด — ตรวจสอบเชิงสถิติแล้วว่า
ฐานข้อมูลจริง 487 แถวไม่ได้ใช้วิธีนั้น (ทดสอบสูตรนับขีดทั้ง 2 สำนักได้แค่ ~20% ตรงกัน
ซึ่งเท่ากับสุ่มเดา) ฐานข้อมูลจริงตัดสินธาตุจาก "ความหมายเชิงสัญลักษณ์" ของคำ

ตัวอย่างจากฐานข้อมูลจริง (ใช้เป็นแนวทางการให้เหตุผล):
{few_shot}

ขั้นตอนของคุณ:
1. web_search หาความหมาย/บริบทวัฒนธรรมของคำที่ฝันเห็น (ทั้งจากมุมมองไทยและจีนถ้ามี)
2. ตัดสินธาตุ (ไม้/ไฟ/ดิน/ทอง/น้ำ) จากความหมายเชิงสัญลักษณ์ ไม่ใช่การคำนวณ
3. ถ้ามีคำแปลจีนธรรมชาติ ให้ระบุ chinese_char + kangxi_strokes ไว้เป็นข้อมูลอ้างอิง
   (ไม่ใช่ที่มาของธาตุ) — ถ้าไม่มีคำแปลจีนที่เป็นธรรมชาติ ปล่อยว่างได้ ไม่ต้องเดา
4. เขียน meaning_keyword สั้นๆ (สไตล์เดียวกับตัวอย่าง)
5. ส่งออกเป็น JSON schema เดียวกับฐานข้อมูลเดิม: category, dream_object,
   chinese_char, kangxi_strokes, element, meaning_keyword

ผลลัพธ์ของคุณจะถูกส่งต่อให้ "AI ตัวหลัก" ไปสร้างคำทำนายให้ผู้ใช้ และจะถูกบันทึกไว้เป็น
"pending discovery" รอมนุษย์ตรวจสอบก่อนรวมเข้าฐานข้อมูลจริง"""


def enrich_via_ai1_demo(dream_object: str, chinese_char: str, kangxi_strokes,
                          element: str, meaning_keyword: str, category: str = "ค้นพบใหม่ (AI)") -> dict:
    """
    Records an AI-1-enriched entry into the pending discoveries log.
    In production this function's INPUT arguments are the AI-1 model's
    actual output (after it does web_search + semantic reasoning) — this
    signature just defines the contract/schema AI-1 must fill.
    """
    entry = {
        "category": category,
        "dream_object": dream_object,
        "chinese_char": chinese_char,
        "kangxi_strokes": kangxi_strokes,
        "element": element,
        "meaning_keyword": meaning_keyword,
        "source": "ai_discovered",
        "reviewed": False,
        "discovered_at": datetime.now(timezone.utc).isoformat(),
    }
    pending = _load_pending()
    pending.append(entry)
    _save_pending(pending)
    return entry


def _variants(text: str):
    """Split 'พ่อ / บิดา' style entries into individual searchable terms."""
    return [v.strip() for v in re.split(r"[/,]", text) if v.strip()]


def find_symbol_matches(dream_text: str):
    matches = []
    for row in DREAM_DB:
        for variant in _variants(row["dream_object"]):
            if variant and variant in dream_text:
                matches.append(row)
                break
    return matches


def find_theme_matches(dream_text: str):
    matches = []
    for row in DREAM_PSYCH:
        theme_variants = _variants(row["dream_theme"])
        for variant in theme_variants:
            # allow partial match on key nouns/verbs within the theme phrase too
            if variant and (variant in dream_text or dream_text in variant):
                matches.append(row)
                break
    return matches


def context_synthesis(day_of_week_th: str, matched_elements: list) -> str:
    """Step 3: weave symbol/theme elements together with the day's element,
    principle-level only (per the spec's 'don't finalize unless asked' rule)."""
    day_el = DAY_ELEMENT.get(day_of_week_th)
    if not day_el or not matched_elements:
        return ""
    day_el_th = THAI_LABEL_4.get(day_el, day_el)
    unique_elements = set(matched_elements)
    if day_el_th in unique_elements:
        return f"สัญลักษณ์ที่ฝันมีธาตุตรงกับธาตุประจำวัน{day_of_week_th} ({day_el_th}) — พลังงานนี้กำลังเข้มข้นเป็นพิเศษในช่วงนี้"
    else:
        return f"วันที่ฝัน ({day_of_week_th}, ธาตุ{day_el_th}) เป็นคนละธาตุกับสัญลักษณ์ที่ฝันเห็น — อาจสื่อถึงความรู้สึกที่ขัดกับจังหวะชีวิตตอนนี้อยู่บ้าง"


def interpret_dream(dream_text: str, day_of_week_th: str = None, want_deep_reading: bool = False) -> dict:
    # Safety gate FIRST — no exceptions, matches Platform D's pattern exactly.
    gate = safety_gate(dream_text)
    if gate:
        return {"dream_text": dream_text, "intercepted": True, **gate}

    symbol_matches = find_symbol_matches(dream_text)
    theme_matches = find_theme_matches(dream_text)

    elements_found = [m["element"] for m in symbol_matches]
    elements_found += [m["element_connection"].split("(")[0].split("—")[0].strip()
                        for m in theme_matches if m.get("element_connection")]

    result = {
        "dream_text": dream_text,
        "symbol_matches": [
            {"object": m["dream_object"], "element": m["element"], "meaning": m["meaning_keyword"],
             "kangxi_strokes": m["kangxi_strokes"], "chinese_char": m["chinese_char"]}
            for m in symbol_matches
        ],
        "theme_matches": [
            {"theme": m["dream_theme"], "psychological_meaning": m["psychological_meaning"],
             "subconscious_trigger": m["subconscious_trigger"], "advice": m["advice_psych"],
             "element_connection": m["element_connection"], "remedy": m["element_remedy"]}
            for m in theme_matches
        ],
        "context_synthesis": context_synthesis(day_of_week_th, elements_found) if day_of_week_th else "",
        "found_anything": bool(symbol_matches or theme_matches),
    }

    if not result["found_anything"]:
        result["fallback_note"] = (
            "ไม่พบสัญลักษณ์นี้ในฐานข้อมูล 457 สัญลักษณ์หรือ 50 ธีมจิตวิทยา — "
            "ส่งต่อให้ AI-1 (ค้นเว็บ + ตัดสินธาตุเชิงความหมาย) ตาม get_ai1_system_prompt() "
            "ผลลัพธ์จาก AI-1 จะถูกบันทึกใน dream_pending_discoveries.json รอตรวจสอบ "
            "ก่อนรวมเข้าฐานข้อมูลจริง — ฟังก์ชันนี้เองไม่เรียก AI-1 อัตโนมัติ (ต้องเป็นการเรียก "
            "API จริงในระบบ production) แต่ caller สามารถเรียก enrich_via_ai1_demo() "
            "ด้วยผลลัพธ์จาก AI-1 เพื่อบันทึกและใช้ต่อได้ทันที"
        )

    if not want_deep_reading:
        result["note"] = "แสดงผลระดับหลักการเท่านั้น (ตามกฎ 'ไม่ฟันธง' ของ Logic 4) — พิมพ์ 'คำทำนายลึก' เพื่อขอสรุปเจาะจง"

    return result


if __name__ == "__main__":
    print()
    print("=" * 70)
    print("TEST 0 — Safety Gate intercepts crisis messages before dream matching")
    print("=" * 70)
    r0 = interpret_dream("ฝันเห็นแม่ แต่ช่วงนี้ทนไม่ไหวแล้ว อยากตาย", day_of_week_th="จันทร์")
    print(json.dumps(r0, ensure_ascii=False, indent=2))
    assert r0.get("intercepted") is True
    print("✅ Crisis message intercepted before any dream-symbol processing.")

    print("=" * 70)
    print("TEST 1 — Symbol match (แม่)")
    print("=" * 70)
    r1 = interpret_dream("ฝันเห็นแม่มายืนอยู่หน้าบ้าน", day_of_week_th="จันทร์")
    print(json.dumps(r1, ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST 2 — Theme match (ถูกไล่ล่า)")
    print("=" * 70)
    r2 = interpret_dream("เมื่อคืนฝันว่าถูกไล่ล่า วิ่งหนีไม่ทัน", day_of_week_th="อังคาร")
    print(json.dumps(r2, ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST 3 — No match found")
    print("=" * 70)
    r3 = interpret_dream("ฝันเห็นยานอวกาศสีม่วงบินอยู่เหนือตึกระฟ้า")
    print(json.dumps(r3, ensure_ascii=False, indent=2))

    print()
    print(f"✅ DB loaded: {len(DREAM_DB)} symbols, {len(DREAM_PSYCH)} psychology themes")

    print()
    print("=" * 70)
    print("TEST 4 — AI-1 enrichment pipeline, live worked example: 'โดรน' (drone)")
    print("=" * 70)
    # This mirrors what AI-1 would do after web_search research:
    # โดรน = unmanned flying device, remote-controlled, modern technology,
    # associated with distant observation/surveillance rather than natural
    # flight (unlike "บิน/เหาะ"=ลม for freedom) -> closer to a manufactured,
    # precision-controlled object -> ทอง (Metal), matching how the existing
    # DB treats engineered/technological objects.
    entry = enrich_via_ai1_demo(
        dream_object="โดรน",
        chinese_char="",  # no natural single-character Chinese translation exists
        kangxi_strokes=None,
        element="ทอง",
        meaning_keyword="การควบคุมจากระยะไกล, มุมมองที่สูงขึ้น, เทคโนโลยี, การสอดส่องดูแล, ความแม่นยำ",
        category="เทคโนโลยี/สิ่งประดิษฐ์",
    )
    print(json.dumps(entry, ensure_ascii=False, indent=2))

    print()
    print("Now feeding this back into a live interpret_dream() call:")
    # Manually splice the new entry into DREAM_DB for this demo run to show
    # the full pipeline working end-to-end (in production, AI-2 would just
    # receive AI-1's JSON output directly, no DB reload needed).
    DREAM_DB.append(entry)
    r4 = interpret_dream("เมื่อคืนฝันเห็นโดรนบินอยู่เหนือบ้าน", day_of_week_th="พุธ")
    print(json.dumps(r4, ensure_ascii=False, indent=2))

    print()
    print("=" * 70)
    print("TEST 5 — Dream Recurring counter (only counts, never interpretation)")
    print("=" * 70)
    import os
    if os.path.exists(DREAM_LOG_FILE):
        os.remove(DREAM_LOG_FILE)  # เริ่มสะอาดสำหรับเทสต์นี้

    test_user = "test_user_001"
    test_theme = "ถูกไล่ล่า / วิ่งหนี"

    # จำลอง: เดือนที่ 1 ฝันธีมนี้ 4 ครั้ง (เข้าเกณฑ์)
    for _ in range(4):
        log_dream_occurrence(test_user, test_theme, when=datetime(2026, 5, 15, tzinfo=timezone.utc))
    r5a = get_recurring_theme_suggestion(test_user, test_theme)
    print("หลังเดือนแรก (4 ครั้ง):", json.dumps(r5a, ensure_ascii=False)[:150])
    assert r5a["triggered"] is False, "ยังไม่ควร trigger เพราะยังไม่ครบ 2 เดือนติดกัน"

    # เดือนที่ 2 ฝันธีมเดิมอีก 3 ครั้ง (ติดกัน -> ควร trigger)
    for _ in range(3):
        log_dream_occurrence(test_user, test_theme, when=datetime(2026, 6, 10, tzinfo=timezone.utc))
    r5b = get_recurring_theme_suggestion(test_user, test_theme)
    print("หลังเดือนที่ 2 (3 ครั้งติดกัน):")
    print(json.dumps(r5b, ensure_ascii=False, indent=2))
    assert r5b["triggered"] is True, "ควร trigger แล้วเพราะครบ 2 เดือนติดกัน"
    assert "suggested_wellness" in r5b
    assert "internal" in r5b["suggested_wellness"]

    # ตรวจว่า log เก็บแค่ตัวเลข ไม่มีข้อความตีความปนอยู่เลย
    raw_log = _load_dream_log()
    for entry_row in raw_log:
        assert set(entry_row.keys()) == {"user_id", "theme", "year_month", "count"}, \
            "log ต้องมีแค่ 4 field นี้เท่านั้น ห้ามมีการตีความปนอยู่"
    print()
    print("✅ Dream Recurring: เก็บแค่ความถี่ ไม่เก็บการตีความ, trigger ถูกจังหวะ, ต่อกับ wellness engine สำเร็จ")

    os.remove(DREAM_LOG_FILE)  # ล้างไฟล์ทดสอบทิ้ง
