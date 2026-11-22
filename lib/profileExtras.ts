/**
 * Extra profile details (profiles.interests / pets / exercise, migration 20261122120000).
 * Values are stored as stable keys; labels are translated with L().
 */
import { L } from '@/lib/l10n';

export type Option = { value: string; emoji: string; tr: string; en: string };

export const MAX_INTERESTS = 10;

export const INTEREST_OPTIONS: Option[] = [
  { value: 'travel', emoji: '✈️', tr: 'Seyahat', en: 'Travel' },
  { value: 'music', emoji: '🎵', tr: 'Müzik', en: 'Music' },
  { value: 'concerts', emoji: '🎤', tr: 'Konser', en: 'Concerts' },
  { value: 'movies', emoji: '🎬', tr: 'Film / Dizi', en: 'Movies / TV' },
  { value: 'reading', emoji: '📚', tr: 'Kitap okumak', en: 'Reading' },
  { value: 'cooking', emoji: '🍳', tr: 'Yemek yapmak', en: 'Cooking' },
  { value: 'food', emoji: '🍽️', tr: 'Yeni lezzetler', en: 'Trying new food' },
  { value: 'coffee', emoji: '☕', tr: 'Kahve', en: 'Coffee' },
  { value: 'fitness', emoji: '🏋️', tr: 'Spor salonu', en: 'Gym' },
  { value: 'running', emoji: '🏃', tr: 'Koşu', en: 'Running' },
  { value: 'yoga', emoji: '🧘', tr: 'Yoga / Meditasyon', en: 'Yoga / Meditation' },
  { value: 'football', emoji: '⚽', tr: 'Futbol', en: 'Football' },
  { value: 'basketball', emoji: '🏀', tr: 'Basketbol', en: 'Basketball' },
  { value: 'swimming', emoji: '🏊', tr: 'Yüzme', en: 'Swimming' },
  { value: 'cycling', emoji: '🚴', tr: 'Bisiklet', en: 'Cycling' },
  { value: 'hiking', emoji: '🥾', tr: 'Doğa yürüyüşü', en: 'Hiking' },
  { value: 'camping', emoji: '🏕️', tr: 'Kamp', en: 'Camping' },
  { value: 'sea', emoji: '🏖️', tr: 'Deniz / Plaj', en: 'Beach' },
  { value: 'dancing', emoji: '💃', tr: 'Dans', en: 'Dancing' },
  { value: 'photography', emoji: '📷', tr: 'Fotoğrafçılık', en: 'Photography' },
  { value: 'art', emoji: '🎨', tr: 'Resim / Sanat', en: 'Art' },
  { value: 'theatre', emoji: '🎭', tr: 'Tiyatro', en: 'Theatre' },
  { value: 'gaming', emoji: '🎮', tr: 'Oyun', en: 'Gaming' },
  { value: 'technology', emoji: '💻', tr: 'Teknoloji', en: 'Technology' },
  { value: 'fashion', emoji: '👗', tr: 'Moda', en: 'Fashion' },
  { value: 'animals', emoji: '🐾', tr: 'Hayvanlar', en: 'Animals' },
  { value: 'nature', emoji: '🌿', tr: 'Doğa / Bahçe', en: 'Nature / Gardening' },
  { value: 'volunteering', emoji: '🤝', tr: 'Gönüllülük', en: 'Volunteering' },
  { value: 'languages', emoji: '🗣️', tr: 'Yabancı dil', en: 'Languages' },
  { value: 'board_games', emoji: '🎲', tr: 'Kutu oyunları', en: 'Board games' },
  { value: 'cars', emoji: '🚗', tr: 'Otomobil', en: 'Cars' },
  { value: 'astrology', emoji: '🔮', tr: 'Astroloji', en: 'Astrology' },
];

export const PET_OPTIONS: Option[] = [
  { value: 'dog', emoji: '🐶', tr: 'Köpeğim var', en: 'Have a dog' },
  { value: 'cat', emoji: '🐱', tr: 'Kedim var', en: 'Have a cat' },
  { value: 'other_pet', emoji: '🐠', tr: 'Başka evcil hayvanım var', en: 'Have another pet' },
  { value: 'love_pets', emoji: '💛', tr: 'Yok ama severim', en: "Don't have, but love them" },
  { value: 'no_pets', emoji: '🚫', tr: 'Evcil hayvan istemem', en: "Don't want pets" },
];

export const EXERCISE_OPTIONS: Option[] = [
  { value: 'daily', emoji: '🔥', tr: 'Her gün spor yaparım', en: 'Every day' },
  { value: 'often', emoji: '💪', tr: 'Haftada birkaç kez', en: 'A few times a week' },
  { value: 'sometimes', emoji: '🙂', tr: 'Ara sıra', en: 'Sometimes' },
  { value: 'never', emoji: '🛋️', tr: 'Spor yapmam', en: 'Never' },
];

const find = (list: Option[], v: string | null | undefined) => list.find((o) => o.value === v);

export function optionLabel(list: Option[], value: string | null | undefined): string {
  const o = find(list, value);
  return o ? `${o.emoji} ${L(o.tr, o.en)}` : '';
}

export const interestLabel = (v: string) => optionLabel(INTEREST_OPTIONS, v);
export const petLabel = (v: string | null | undefined) => optionLabel(PET_OPTIONS, v);
export const exerciseLabel = (v: string | null | undefined) => optionLabel(EXERCISE_OPTIONS, v);

export type ProfileExtras = { interests: string[]; pets: string | null; exercise: string | null };
export const EMPTY_EXTRAS: ProfileExtras = { interests: [], pets: null, exercise: null };
