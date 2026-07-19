// พอร์ตจาก legacy-python-engines/suriyayart_lagna_engine.py (CLAUDE.md §6)
// อัลกอริทึมอันโตนาที (ลัคนา) จากตำราจตุพลวัตร V.10 + สูตรดาราศาสตร์ Meeus (low precision)
//
// ⚠️ VALIDATION: local_time_correction คือส่วนเดียวที่ verify กับตำรา (Bangkok -18 นาที)
// ตัว lagna_sign ยัง UNVERIFIED — ไม่มี worked example (CLAUDE.md §5) — พอร์ตตามสูตรเดิมเท่านั้น
//
// หมายเหตุ parity: ฟังก์ชัน trig อาจต่าง ULP ระหว่าง libm(Python)/V8(JS) — ค่าที่ output
// ถูก round แล้ว (2-3 ตำแหน่ง) จึงตรงกันเกือบทุกกรณี; golden test เทียบด้วย tolerance เล็ก

const DEG = Math.PI / 180;
const rad = (d: number) => d * DEG;
const deg = (r: number) => r / DEG;
// Python modulo (ผลบวกเสมอสำหรับ n>0) — ต่างจาก JS % ที่คงเครื่องหมายตัวตั้ง
const pymod = (a: number, n: number) => ((a % n) + n) % n;

export const ZODIAC_ORDER = [
  "เมษ", "พฤษภ", "มิถุน", "กรกฎ", "สิงห์", "กันย์",
  "ตุลย์", "พิจิก", "ธนู", "มังกร", "กุมภ์", "มีน",
];

export const ANTO_NATEE: Record<string, number> = {
  เมษ: 150, พฤษภ: 160, มิถุน: 175, กรกฎ: 183,
  สิงห์: 178, กันย์: 168, ตุลย์: 168, พิจิก: 178,
  ธนู: 183, มังกร: 175, กุมภ์: 160, มีน: 150,
};

const THAI_STANDARD_MERIDIAN = 105.0;

// ---- naive datetime แทนด้วย ms ในกรอบ UTC (ไม่มี timezone) ให้ตรงกับ datetime naive ของ Python ----
type DT = number;
const makeDT = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0): DT => Date.UTC(y, mo - 1, d, h, mi, s);
const addMinutes = (dt: DT, m: number): DT => dt + m * 60000;
const addHours = (dt: DT, h: number): DT => dt + h * 3600000;
function comp(dt: DT) {
  const D = new Date(dt);
  return {
    y: D.getUTCFullYear(), mo: D.getUTCMonth() + 1, d: D.getUTCDate(),
    h: D.getUTCHours(), mi: D.getUTCMinutes(), s: D.getUTCSeconds(),
  };
}
const hhmm = (dt: DT): string => {
  const c = comp(dt);
  return `${String(c.h).padStart(2, "0")}:${String(c.mi).padStart(2, "0")}`;
};
const round = (x: number, n: number): number => {
  // ไม่ต้อง half-to-even ที่นี่ (ค่ามาจาก trig, ไม่ตกขอบ .5 พอดี) — ใช้ round มาตรฐาน
  const m = Math.pow(10, n);
  return Math.round(x * m) / m;
};

export function julianDay(dt: DT): number {
  const c = comp(dt);
  let y = c.y;
  let m = c.mo;
  const d = c.d + (c.h + c.mi / 60 + c.s / 3600) / 24;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

export function solarEclipticLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = pymod(280.46646 + 36000.76983 * T + 0.0003032 * T ** 2, 360);
  const M = rad(pymod(357.52911 + 35999.05029 * T - 0.0001537 * T ** 2, 360));
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const trueLong = L0 + C;
  const omega = rad(125.04 - 1934.136 * T);
  const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega);
  return pymod(apparentLong, 360);
}

export function solarDeclination(eclipticLongitudeDeg: number, jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const eps0 = 23.439291 - 0.0130042 * T;
  const lam = rad(eclipticLongitudeDeg);
  const eps = rad(eps0);
  return deg(Math.asin(Math.sin(eps) * Math.sin(lam)));
}

export function trueSunriseUtc(year: number, month: number, day: number, latDeg: number, lonDeg: number): DT {
  const noonUtc = addHours(makeDT(year, month, day, 12, 0, 0), -lonDeg / 15);
  const jdNoon = julianDay(noonUtc);
  const lam = solarEclipticLongitude(jdNoon);
  const decl = rad(solarDeclination(lam, jdNoon));
  const lat = rad(latDeg);

  let cosH0 = (Math.sin(rad(-0.833)) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
  cosH0 = Math.max(-1.0, Math.min(1.0, cosH0));
  const H0Deg = deg(Math.acos(cosH0));

  const T = (jdNoon - 2451545.0) / 36525.0;
  const L0 = rad(pymod(280.46646 + 36000.76983 * T, 360));
  const M = rad(pymod(357.52911 + 35999.05029 * T, 360));
  const e = 0.016708634 - 0.000042037 * T;
  const y = Math.tan(rad(23.4393 / 2)) ** 2;
  const eot =
    4 *
    deg(
      y * Math.sin(2 * L0) -
        2 * e * Math.sin(M) +
        4 * e * y * Math.sin(M) * Math.cos(2 * L0) -
        0.5 * y ** 2 * Math.sin(4 * L0) -
        1.25 * e ** 2 * Math.sin(2 * M)
    );

  const solarNoonOffsetMin = 720 - 4 * lonDeg - eot;
  const sunriseMin = solarNoonOffsetMin - 4 * H0Deg;
  const base = makeDT(year, month, day);
  return addMinutes(base, sunriseMin);
}

export function getZodiacSign(longitudeDeg: number): [string, number] {
  const idx = Math.floor(longitudeDeg / 30);
  const degIntoSign = pymod(longitudeDeg, 30);
  return [ZODIAC_ORDER[idx], degIntoSign];
}

export interface LagnaTraceStart {
  step: "start_in_sun_sign";
  sign: string;
  remaining_time_in_sun_sign: number;
  elapsed_since_sunrise: number;
}
export interface LagnaTraceSubtract {
  step: "subtract";
  sign: string;
  value: number;
  remainder_before: number;
}
export type LagnaTrace = LagnaTraceStart | LagnaTraceSubtract;

export interface LagnaResult {
  lagna_sign: string | null;
  sun_sign_at_sunrise: string;
  sun_longitude_at_sunrise_deg: number;
  true_sunrise_civil_time: string;
  birth_time_corrected: string;
  local_time_correction_min: number;
  calculation_trace: LagnaTrace[];
  validation_status: string;
}

export function calculateLagna(
  birth: { year: number; month: number; day: number; hour: number; minute: number },
  birthLat: number,
  birthLon: number,
  utcOffsetHours = 7.0
): LagnaResult {
  const correctionMin = (birthLon - THAI_STANDARD_MERIDIAN) * 4;

  const birthDtCivil = makeDT(birth.year, birth.month, birth.day, birth.hour, birth.minute, 0);
  const birthDtTrueLocal = addMinutes(birthDtCivil, correctionMin);

  const sunriseUtc = trueSunriseUtc(birth.year, birth.month, birth.day, birthLat, birthLon);
  const sunriseCivil = addHours(sunriseUtc, utcOffsetHours);

  const jdSunrise = julianDay(sunriseUtc);
  const sunLongAtSunrise = solarEclipticLongitude(jdSunrise);
  const [sunSign, degIntoSign] = getZodiacSign(sunLongAtSunrise);

  const remainingDeg = 30 - degIntoSign;
  const remainingTimeInSunSign = (remainingDeg / 30) * ANTO_NATEE[sunSign];

  let elapsedMin = (birthDtTrueLocal - sunriseCivil) / 1000 / 60;
  if (elapsedMin < 0) elapsedMin += 24 * 60;

  let remainder = elapsedMin - remainingTimeInSunSign;

  let signIdx = ZODIAC_ORDER.indexOf(sunSign);
  const stepsLog: LagnaTrace[] = [
    {
      step: "start_in_sun_sign",
      sign: sunSign,
      remaining_time_in_sun_sign: round(remainingTimeInSunSign, 2),
      elapsed_since_sunrise: round(elapsedMin, 2),
    },
  ];

  let lagnaSign: string | null;
  if (remainder < 0) {
    lagnaSign = sunSign;
  } else {
    lagnaSign = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      signIdx = (signIdx + 1) % 12;
      const candidateSign = ZODIAC_ORDER[signIdx];
      const candidateValue = ANTO_NATEE[candidateSign];
      stepsLog.push({
        step: "subtract",
        sign: candidateSign,
        value: candidateValue,
        remainder_before: round(remainder, 2),
      });
      if (remainder < candidateValue) {
        lagnaSign = candidateSign;
        break;
      }
      remainder -= candidateValue;
    }
  }

  return {
    lagna_sign: lagnaSign,
    sun_sign_at_sunrise: sunSign,
    sun_longitude_at_sunrise_deg: round(sunLongAtSunrise, 3),
    true_sunrise_civil_time: hhmm(sunriseCivil),
    birth_time_corrected: hhmm(birthDtTrueLocal),
    local_time_correction_min: round(correctionMin, 1),
    calculation_trace: stepsLog,
    validation_status:
      "UNVERIFIED — no worked example found in source tome; spot-check before production use",
  };
}
