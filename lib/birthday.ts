/**
 * Birthday identity: birthday week (profile is boosted in Explore for 7 days), birthday twins and zodiac sign.
 * Only real birthdays count (profiles.birth_date_exact, migration 20261122130000); older accounts only stored an age.
 */
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';

export const BIRTHDAY_WEEK_DAYS = 7;

function parse(d: string | null | undefined): { y: number; m: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ''));
  return m ? { y: +m[1], m: +m[2], day: +m[3] } : null;
}

/** Days since this year's birthday (0 = today), or null when outside the birthday week. */
export function birthdayWeekDay(birthDate: string | null | undefined, exact: boolean | null | undefined, now = new Date()): number | null {
  if (!exact) return null;
  const b = parse(birthDate);
  if (!b) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const year of [today.getFullYear(), today.getFullYear() - 1]) {
    const bd = new Date(year, b.m - 1, b.day);
    const diff = Math.round((today.getTime() - bd.getTime()) / 86400000);
    if (diff >= 0 && diff < BIRTHDAY_WEEK_DAYS) return diff;
  }
  return null;
}

export const isBirthdayToday = (birthDate: string | null | undefined, exact: boolean | null | undefined) =>
  birthdayWeekDay(birthDate, exact) === 0;

/** birth_date for a chosen age + real day/month (the year is picked so the age stays the same today). */
export function birthDateFromAge(age: number, day: number, month: number, now = new Date()): string {
  const hadBirthday = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  const year = now.getFullYear() - age - (hadBirthday ? 0 : 1);
  const lastDay = new Date(year, month, 0).getDate(); // 29 Feb in a non-leap year → 28 Feb
  const d = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function dayMonthOf(birthDate: string | null | undefined): { day: number; month: number } | null {
  const b = parse(birthDate);
  return b ? { day: b.day, month: b.m } : null;
}

export function monthName(month: number): string {
  const names: [string, string][] = [
    ['Ocak', 'January'], ['Şubat', 'February'], ['Mart', 'March'], ['Nisan', 'April'], ['Mayıs', 'May'], ['Haziran', 'June'],
    ['Temmuz', 'July'], ['Ağustos', 'August'], ['Eylül', 'September'], ['Ekim', 'October'], ['Kasım', 'November'], ['Aralık', 'December'],
  ];
  const n = names[month - 1];
  return n ? L(n[0], n[1]) : '';
}

/** "22 Kasım" style label, or '' when unknown. */
export function dayMonthLabel(birthDate: string | null | undefined): string {
  const dm = dayMonthOf(birthDate);
  return dm ? `${dm.day} ${monthName(dm.month)}` : '';
}

const ZODIAC: { from: [number, number]; tr: string; en: string; symbol: string }[] = [
  { from: [1, 20], tr: 'Kova', en: 'Aquarius', symbol: '♒' },
  { from: [2, 19], tr: 'Balık', en: 'Pisces', symbol: '♓' },
  { from: [3, 21], tr: 'Koç', en: 'Aries', symbol: '♈' },
  { from: [4, 20], tr: 'Boğa', en: 'Taurus', symbol: '♉' },
  { from: [5, 21], tr: 'İkizler', en: 'Gemini', symbol: '♊' },
  { from: [6, 21], tr: 'Yengeç', en: 'Cancer', symbol: '♋' },
  { from: [7, 23], tr: 'Aslan', en: 'Leo', symbol: '♌' },
  { from: [8, 23], tr: 'Başak', en: 'Virgo', symbol: '♍' },
  { from: [9, 23], tr: 'Terazi', en: 'Libra', symbol: '♎' },
  { from: [10, 23], tr: 'Akrep', en: 'Scorpio', symbol: '♏' },
  { from: [11, 22], tr: 'Yay', en: 'Sagittarius', symbol: '♐' },
  { from: [12, 22], tr: 'Oğlak', en: 'Capricorn', symbol: '♑' },
];

/** Zodiac label like "♏ Akrep" for a real birthday, '' otherwise. */
export function zodiacLabel(birthDate: string | null | undefined, exact: boolean | null | undefined): string {
  if (!exact) return '';
  const dm = dayMonthOf(birthDate);
  if (!dm) return '';
  const key = dm.month * 100 + dm.day;
  let sign = ZODIAC[11]; // Capricorn until 19 Jan
  for (const z of ZODIAC) if (key >= z.from[0] * 100 + z.from[1]) sign = z;
  return `${sign.symbol} ${L(sign.tr, sign.en)}`;
}

let weekIds: { at: number; ids: Set<string> } | null = null;

/** Ids of people in their birthday week (cached 10 min). Empty set if the server function is missing. */
export async function loadBirthdayWeekIds(): Promise<Set<string>> {
  if (weekIds && Date.now() - weekIds.at < 10 * 60 * 1000) return weekIds.ids;
  try {
    const { data, error } = await supabase.rpc('birthday_week_ids');
    if (error) return new Set();
    const ids = new Set<string>(((data as any[]) || []).map((r) => (typeof r === 'string' ? r : r?.birthday_week_ids ?? r?.id)).filter(Boolean));
    weekIds = { at: Date.now(), ids };
    return ids;
  } catch {
    return new Set();
  }
}

export type BirthdayTwin = {
  id: string;
  full_name: string;
  profile_picture: string | null;
  birth_date: string | null;
  city: string | null;
  country: string | null;
  verification_status: string | null;
};

export async function loadBirthdayTwins(): Promise<BirthdayTwin[]> {
  try {
    const { data, error } = await supabase.rpc('birthday_twins', { max_rows: 30 });
    if (error) return [];
    return (data as BirthdayTwin[]) || [];
  } catch {
    return [];
  }
}

/** Real birthday of the signed-in user, read separately so older databases never break a screen. */
export async function loadBirthDateExact(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from('profiles').select('birth_date_exact').eq('id', userId).maybeSingle();
    if (error || !data) return false;
    return !!(data as any).birth_date_exact;
  } catch {
    return false;
  }
}
