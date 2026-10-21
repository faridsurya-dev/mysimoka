/**
 * Status gizi anak sekolah — sama dengan dashboard (mysimoka-admin lib/nutrition.ts + lib/growth.ts):
 *  - usia 5–19 th (61–228 bulan): IMT/U z-score WHO Growth Reference 2007
 *    (https://www.who.int/tools/growth-reference-data-for-5to19-years), algoritma paket resmi
 *    WHO anthroplus (LMS interpolasi bulanan, koreksi |z| > 3), kategori Permenkes RI No. 2/2020;
 *    berbeda untuk laki-laki dan perempuan;
 *  - usia > 19 th: ambang IMT dewasa Kemenkes (< 17 / 18,5 / 25 / 27), label yang sama;
 *  - jenis kelamin / tanggal lahir kosong atau usia < 5 th: null (tidak dihitung, tidak menebak).
 */
import { BMI_FOR_AGE, WHO2007_MAX_MONTH, WHO2007_MIN_MONTH, type Lms } from './whoReference';

export const NUTRITION_STATUSES = ['Gizi buruk', 'Gizi kurang', 'Gizi baik', 'Gizi lebih', 'Obesitas'] as const;
export type NutritionStatus = (typeof NUTRITION_STATUSES)[number];

export const NUTRITION_STATUS_COLORS: Record<NutritionStatus, string> = {
  'Gizi buruk': '#C0392B',
  'Gizi kurang': '#C8841F',
  'Gizi baik': '#2A9D8F',
  'Gizi lebih': '#4F86E8',
  Obesitas: '#8E44AD',
};

export function emptyNutritionCounts(): Record<NutritionStatus, number> {
  return { 'Gizi buruk': 0, 'Gizi kurang': 0, 'Gizi baik': 0, 'Gizi lebih': 0, Obesitas: 0 };
}

type Sex = 'male' | 'female';

function normalizeSex(value: string | null | undefined): Sex | null {
  const key = (value ?? '').trim().toLowerCase();
  if (['male', 'l', 'laki-laki', 'lakilaki', 'm'].includes(key)) return 'male';
  if (['female', 'p', 'perempuan', 'f'].includes(key)) return 'female';
  return null;
}

function parseDay(value: string | null | undefined): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const DAYS_PER_MONTH = 365.25 / 12;

/** Usia dalam bulan (desimal) pada tanggal ukur. */
export function ageInMonths(dateOfBirth: string | null | undefined, measuredAt: string | null | undefined): number | null {
  const dob = parseDay(dateOfBirth);
  const at = parseDay(measuredAt);
  if (dob === null || at === null || at < dob) return null;
  return (at - dob) / 86_400_000 / DAYS_PER_MONTH;
}

function lmsAt(table: readonly Lms[], months: number): Lms | null {
  if (months < WHO2007_MIN_MONTH || months > WHO2007_MAX_MONTH) return null;
  const low = Math.floor(months);
  const diff = months - low;
  const a = table[low - WHO2007_MIN_MONTH];
  if (!a) return null;
  const b = table[low + 1 - WHO2007_MIN_MONTH];
  if (diff <= 0 || !b) return a;
  return [a[0] + diff * (b[0] - a[0]), a[1] + diff * (b[1] - a[1]), a[2] + diff * (b[2] - a[2])];
}

function valueAtZ([l, m, s]: Lms, z: number): number {
  return Math.abs(l) < 1e-9 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}

function adjustedZ(y: number, lms: Lms): number {
  const [l, m, s] = lms;
  const z = Math.abs(l) < 1e-9 ? Math.log(y / m) / s : (Math.pow(y / m, l) - 1) / (l * s);
  if (z > 3) {
    const sd3 = valueAtZ(lms, 3);
    return 3 + (y - sd3) / (sd3 - valueAtZ(lms, 2));
  }
  if (z < -3) {
    const sd3 = valueAtZ(lms, -3);
    return -3 + (y - sd3) / (valueAtZ(lms, -2) - sd3);
  }
  return z;
}

/** z-score IMT/U (WHO 2007); null di luar 61–228 bulan atau data kurang. */
export function bmiForAgeZ(bmi: number | null, gender: string | null | undefined, months: number | null): number | null {
  const sex = normalizeSex(gender);
  if (bmi === null || !sex || months === null) return null;
  const lms = lmsAt(BMI_FOR_AGE[sex], months);
  if (!lms) return null;
  const z = adjustedZ(bmi, lms);
  return Number.isFinite(z) ? z : null;
}

function statusFromZ(z: number): NutritionStatus {
  if (z < -3) return 'Gizi buruk';
  if (z < -2) return 'Gizi kurang';
  if (z <= 1) return 'Gizi baik';
  if (z <= 2) return 'Gizi lebih';
  return 'Obesitas';
}

function adultStatus(bmi: number): NutritionStatus {
  if (bmi < 17) return 'Gizi buruk';
  if (bmi < 18.5) return 'Gizi kurang';
  if (bmi <= 25) return 'Gizi baik';
  if (bmi <= 27) return 'Gizi lebih';
  return 'Obesitas';
}

export type NutritionSubject = { gender?: string | null; dateOfBirth?: string | null };

/** Status gizi satu pengukuran; null bila tidak bisa dihitung. */
export function nutritionStatus(
  bmi: number | null,
  subject: NutritionSubject | null | undefined,
  measuredAt: string | null | undefined,
): NutritionStatus | null {
  if (bmi === null || !subject) return null;
  const months = ageInMonths(subject.dateOfBirth, measuredAt);
  if (months !== null && months > WHO2007_MAX_MONTH) return adultStatus(bmi);
  const z = bmiForAgeZ(bmi, subject.gender, months);
  return z === null ? null : statusFromZ(z);
}
