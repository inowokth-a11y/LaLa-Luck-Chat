// พอร์ตจาก legacy-python-engines/wellness_activity_engine.py (CLAUDE.md §3.5, §6)
// ผลลัพธ์ต้องตรงเป๊ะกับ self-test Python — ยืนยันด้วย tests/wellness.test.ts
//
// ⚠️ กรอบการนำเสนอ: เฟรมเป็น "เหมาะกับพลังงาน/บุคลิกภาพ" ไม่ใช่ "รักษา/แก้ธาตุ"
// ห้ามอ้างรักษาโรค/แก้ปัญหาสุขภาพจิต — เป็นกิจกรรมสุขภาวะทั่วไปเท่านั้น

export interface WellnessInternal {
  name: string;
  tradition: string;
  how_to: string;
  research: string;
}
export interface WellnessExternal {
  name: string;
  category: string;
  how_to: string;
  research: string;
}
export interface WellnessActivity {
  internal: WellnessInternal;
  external: WellnessExternal;
  combo_routine: string;
  best_time: string;
  time_reason: string;
}

export const WELLNESS_ACTIVITIES: Record<string, WellnessActivity> = {
  Fire: {
    internal: {
      name: "Kapalabhati (ลมไฟ)",
      tradition: "โยคะ/Pranayama",
      how_to: "หายใจออกแรงๆ เร็วๆ ทางจมูก ปล่อยให้หายใจเข้าเป็นไปเอง ทำต่อเนื่อง 20-30 ครั้งต่อรอบ",
      research: "Nivethitha et al. 2017, Ancient Science of Life",
    },
    external: {
      name: "วิ่ง หรือ ปีนเขา/hiking ระดับหนัก",
      category: "movement",
      how_to: "เคลื่อนไหวต่อเนื่อง 20-30 นาที ให้หัวใจเต้นเร็วขึ้นชัดเจน",
      research: "Niedermeier et al. — hiking 30 นาที ลดฮอร์โมนความเครียดได้ถึง 28%",
    },
    combo_routine:
      "ตอนเช้า: Kapalabhati 5 นาทีก่อนออกจากบ้าน แล้วตามด้วยวิ่ง/เดินเร็ว 20 นาที — ใช้จังหวะหายใจที่กระตุ้นแล้วต่อด้วยการเคลื่อนไหวจริง",
    best_time: "เช้า",
    time_reason:
      "ออกกำลังกายตอนเช้าช่วย advance circadian phase และลดคอร์ติซอลตอนตื่นในระยะยาว (PMC systematic review)",
  },
  Water: {
    internal: {
      name: "Bhramari (หายใจผึ้ง)",
      tradition: "โยคะ/Pranayama",
      how_to: "หายใจเข้าลึกๆ หายใจออกพร้อมทำเสียงฮัมต่อเนื่อง ทำ 5-10 รอบ",
      research: "ลด cortisol, calming (เชื่อมกับ Nivethitha et al. 2017)",
    },
    external: {
      name: "เดินเบาๆในธรรมชาติ / ฟังเพลงบรรเลงสงบ",
      category: "nature/music",
      how_to: "เดินช้าๆ 15-20 นาทีในที่มีต้นไม้ หรือฟังเพลงบรรเลงแบบตั้งใจฟัง (ไม่ใช่เปิดคลอ)",
      research: "Bratman/Stanford — เดินธรรมชาติลดการทำงาน subgenual PFC (จุดคิดวนซ้ำ)",
    },
    combo_routine: "ก่อนนอน: Bhramari 5 รอบบนเตียง แล้วฟังเพลงบรรเลงเบาๆ 10 นาทีก่อนหลับ",
    best_time: "ก่อนนอน",
    time_reason:
      "งานวิจัยชัดเจนว่ากิจกรรมสงบก่อนนอนช่วยการนอนหลับ ต่างจากออกกำลังกายหนักที่รบกวนการนอน",
  },
  Earth: {
    internal: {
      name: "Dan Tian breathing (หายใจจากจุดต่ำท้อง)",
      tradition: "ไทเก๊ก/ชี่กง",
      how_to: "วางมือที่ท้องใต้สะดือ หายใจให้ท้องพองยุบ รู้สึกถึงจุดศูนย์กลางร่างกาย 5-10 นาที",
      research: "Jahnke et al. 2010 — รีวิว 66 งานวิจัย Qigong/Tai Chi",
    },
    external: {
      name: "เดินป่าจังหวะกลาง / วาดภาพ-ปั้นดิน",
      category: "movement/art",
      how_to:
        "เดินในจังหวะสม่ำเสมอ ไม่เร่งรีบ 20-30 นาที หรือทำงานศิลปะที่ได้สัมผัสวัสดุจริง (ดินน้ำมัน/สีน้ำ)",
      research: "Art therapy ลดคอร์ติซอลจริง (systematic review, ยอมรับตั้งแต่ 1940s)",
    },
    combo_routine:
      "บ่าย: Dan Tian breathing 5 นาที แล้วเดินเล่นจังหวะช้าๆ 20 นาที — เน้นความรู้สึก 'ปักหลัก' ตลอดกิจกรรม",
    best_time: "เช้าหรือบ่าย",
    time_reason:
      "กิจกรรม grounding เหมาะเป็นช่วงเปลี่ยนผ่าน ไม่จำเป็นต้องผูกกับ circadian phase เท่าธาตุไฟ/น้ำ",
  },
  Wood: {
    internal: {
      name: "เมตตาภาวนา (Loving-Kindness Meditation)",
      tradition: "พุทธ",
      how_to: "นั่งสบายๆ ระลึกความรู้สึกดีต่อตนเอง แล้วขยายไปยังคนใกล้ตัว 10-15 นาที",
      research: "Lutz et al. 2008, PNAS — กระตุ้น insula + ACC",
    },
    external: {
      name: "วาดภาพ/เขียนสร้างสรรค์ หรือเล่นดนตรี (ไม่ใช่แค่ฟัง)",
      category: "art/music",
      how_to: "ให้เวลา 20-30 นาทีทำงานสร้างสรรค์แบบไม่มีเป้าหมายตายตัว ปล่อยให้ไหลไปเรื่อยๆ",
      research: "Music therapy meta-analysis 2022 — ผลบวกต่อ stress-related outcomes",
    },
    combo_routine:
      "กลางวัน: เมตตาภาวนาสั้นๆ 5 นาที แล้วต่อด้วยกิจกรรมสร้างสรรค์อิสระ 20 นาที ไม่ตั้งเป้าผลงาน",
    best_time: "กลางวัน",
    time_reason:
      "ธาตุไม้เชื่อมกับการเติบโต/ขยาย เหมาะกับช่วงที่พลังงานกำลังขึ้น ไม่ใช่ต้นหรือปลายวัน",
  },
  Metal: {
    internal: {
      name: "Box Breathing (Sama Vritti) / วิปัสสนา",
      tradition: "โยคะ + พุทธ",
      how_to: "หายใจเข้า 4 วินาที กลั้น 4 วินาที หายใจออก 4 วินาที กลั้น 4 วินาที ทำ 5-10 รอบ",
      research: "เสถียรภาพระบบประสาทอัตโนมัติ (ANS) — เชื่อมกับหลัก Box Breathing มาตรฐาน",
    },
    external: {
      name: "งานฝีมือละเอียด/ถ่ายภาพ หรือฟังดนตรีคลาสสิก/มีโครงสร้างชัด",
      category: "art/music",
      how_to: "เลือกงานที่ต้องใช้ความละเอียด/มีขั้นตอนชัดเจน 20-30 นาที",
      research: "Frontiers 2024 — creative arts เชื่อมกับ medial rPFC ด้าน emotion regulation",
    },
    combo_routine:
      "เย็น: Box Breathing 5 นาทีก่อนเริ่มงานฝีมือ/ถ่ายภาพ 20-30 นาที — เน้นความคมชัด มีโครงสร้าง",
    best_time: "เย็น",
    time_reason:
      "ธาตุทองเชื่อมกับความชัดเจน/ปล่อยวาง เหมาะเป็นช่วงสรุปวัน ก่อนเข้าสู่ธาตุน้ำตอนกลางคืน",
  },
};

export const FRAMING_CAVEAT =
  "หมายเหตุสำคัญ: กิจกรรมเหล่านี้เป็นกิจกรรมสุขภาวะทั่วไปที่ 'เหมาะกับพลังงาน/" +
  "บุคลิกภาพ' แบบหนึ่งๆ ไม่ใช่การรักษาหรือแก้ปัญหาสุขภาพจิตใดๆ หากมีอาการที่กังวล " +
  "ควรปรึกษาผู้เชี่ยวชาญโดยตรง";

/** คืนคู่กิจกรรมภายใน+ภายนอก+วิธีรวมเป็นกิจวัตร สำหรับธาตุที่ระบุ */
export function getWellnessPair(
  element: string
): (WellnessActivity & { element: string; caveat: string }) | { error: string } {
  const data = WELLNESS_ACTIVITIES[element];
  if (!data) {
    return { error: `ไม่มีข้อมูลธาตุ ${element}` };
  }
  return { ...data, element, caveat: FRAMING_CAVEAT };
}

/** ใช้กับธาตุที่ขาด (จาก Element Seed) — คืนคู่กิจกรรมสำหรับทุกธาตุที่ขาด */
export function getWellnessForMissing(missingElements: string[]): Record<string, ReturnType<typeof getWellnessPair>> {
  const out: Record<string, ReturnType<typeof getWellnessPair>> = {};
  for (const el of missingElements) {
    out[el] = getWellnessPair(el);
  }
  return out;
}
