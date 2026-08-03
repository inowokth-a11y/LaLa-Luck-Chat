// สรุปผู้ถามตาม เพศ × ช่วงอายุ × แนวคำถาม (ผู้ใช้สั่ง 4 ส.ค. 2569:
// "อยากรู้ว่าช่วงอายุไหน เพศไหน มักถามคำถามแนวไหน") — ตรรกะล้วน เทสต์ตรงๆ ได้
//
// แหล่งข้อมูล: chat_question_log (user_id, question) join user_profiles_e (birth_date, gender)
// อ่านด้วย service role ในหน้า /admin เท่านั้น — ไฟล์นี้ไม่แตะ DB
// แนวคำถามจัดด้วย keyword ฿0 (ไม่ใช้ AI) — หยาบแต่พอเห็นเทรนด์ คำที่ไม่เข้าเกณฑ์ = "อื่นๆ"

export interface ProfileRow {
  auth_uid: string;
  birth_date: string | null; // YYYY-MM-DD (ค.ศ.)
  gender: string | null; // male | female | other | null
}

export interface DemoQuestionRow {
  user_id: string | null;
  question: string;
}

export const GENDER_LABELS: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
  other: "อื่นๆ",
  unknown: "ไม่ระบุ",
};

export const AGE_BUCKETS = ["<18", "18-24", "25-34", "35-44", "45-54", "55+", "ไม่ทราบ"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

export function ageBucket(birthDate: string | null | undefined, now = new Date()): AgeBucket {
  if (!birthDate) return "ไม่ทราบ";
  const b = new Date(birthDate + "T00:00:00Z");
  if (isNaN(b.getTime())) return "ไม่ทราบ";
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < b.getUTCMonth() ||
    (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age--;
  // ปีเกิดเพี้ยน (พ.ศ. หลุดมา/อนาคต) → ไม่เดา
  if (age < 0 || age > 120) return "ไม่ทราบ";
  if (age < 18) return "<18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}

/** แนวคำถาม — keyword ฿0 เรียงจากเฉพาะเจาะจง → กว้าง (เจอแนวแรกที่แมตช์) */
const TOPIC_RULES: { topic: string; re: RegExp }[] = [
  { topic: "เลขมงคล", re: /ทะเบียน|เบอร์|เลขที่บ้าน|บ้านเลขที่|เลขเด็ด|หมายเลข|เลข\s*\d/ },
  { topic: "ชื่อ", re: /ชื่อ|นามสกุล/ },
  { topic: "ฤกษ์/เวลา", re: /ฤกษ์|วันไหนดี|กี่โมง|วันมงคล|เวลาไหน/ },
  { topic: "ความรัก", re: /ความรัก|แฟน|คู่|เนื้อคู่|คนรัก|แต่งงาน/ },
  { topic: "งาน/เงิน", re: /งาน|เงิน|ธุรกิจ|ลงทุน|ค้าขาย|อาชีพ|หุ้น|เจ้านาย|หัวหน้า/ },
  { topic: "ใจ/สุขภาวะ", re: /เครียด|กังวล|เหนื่อย|ท้อ|นอนไม่หลับ|สุขภาพ|ดูแลใจ|หมดไฟ/ },
  { topic: "ฮวงจุ้ย/ทิศ", re: /ฮวงจุ้ย|ทิศ|โต๊ะทำงาน|ห้องนอน/ },
  { topic: "ดวงรวม/ธาตุ", re: /ดวง|ธาตุ|การ์ด|ปีนี้|ชะตา|ราศี/ },
];

export function questionTopic(q: string): string {
  for (const r of TOPIC_RULES) if (r.re.test(q)) return r.topic;
  return "อื่นๆ";
}

export interface DemographicsSummary {
  /** จำนวนคำถามต่อ (ช่วงอายุ × เพศ) — เฉพาะ bucket ที่มีข้อมูล */
  byAgeGender: { age: AgeBucket; gender: string; count: number }[];
  /** แนวคำถามยอดนิยมต่อเพศ (top 3) */
  topTopicsByGender: { gender: string; topics: { topic: string; count: number }[] }[];
  /** แนวคำถามยอดนิยมต่อช่วงอายุ (top 3) */
  topTopicsByAge: { age: AgeBucket; topics: { topic: string; count: number }[] }[];
  totalQuestions: number;
  /** คำถามจากคนที่ไม่มีโปรไฟล์/ไม่ล็อกอิน (นับแยก — ไม่เดาเพศ/อายุ) */
  unattributed: number;
}

export function summarizeDemographics(
  profiles: ProfileRow[],
  questions: DemoQuestionRow[],
  now = new Date()
): DemographicsSummary {
  const profOf = new Map<string, ProfileRow>();
  for (const p of profiles) profOf.set(p.auth_uid, p);

  const agCount = new Map<string, number>(); // `${age}|${gender}`
  const topicByGender = new Map<string, Map<string, number>>();
  const topicByAge = new Map<string, Map<string, number>>();
  let unattributed = 0;

  for (const q of questions) {
    const prof = q.user_id ? profOf.get(q.user_id) : undefined;
    if (!prof) {
      unattributed++;
      continue;
    }
    const age = ageBucket(prof.birth_date, now);
    const gender = prof.gender && GENDER_LABELS[prof.gender] ? prof.gender : "unknown";
    const topic = questionTopic(q.question);

    const key = `${age}|${gender}`;
    agCount.set(key, (agCount.get(key) ?? 0) + 1);

    if (!topicByGender.has(gender)) topicByGender.set(gender, new Map());
    const tg = topicByGender.get(gender)!;
    tg.set(topic, (tg.get(topic) ?? 0) + 1);

    if (!topicByAge.has(age)) topicByAge.set(age, new Map());
    const ta = topicByAge.get(age)!;
    ta.set(topic, (ta.get(topic) ?? 0) + 1);
  }

  const top3 = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count }));

  return {
    byAgeGender: [...agCount.entries()]
      .map(([k, count]) => {
        const [age, gender] = k.split("|");
        return { age: age as AgeBucket, gender, count };
      })
      .sort((a, b) => b.count - a.count),
    topTopicsByGender: [...topicByGender.entries()].map(([gender, m]) => ({ gender, topics: top3(m) })),
    topTopicsByAge: [...topicByAge.entries()].map(([age, m]) => ({ age: age as AgeBucket, topics: top3(m) })),
    totalQuestions: questions.length,
    unattributed,
  };
}
