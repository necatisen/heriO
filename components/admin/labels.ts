import { L, localeTag } from '@/lib/l10n';
import type { ModAction } from '@/lib/staff';

/** Ready-made reasons for moderators (Turkish, English). */
export const MOD_REASONS: [string, string][] = [
  ['Taciz / Nefret söylemi', 'Harassment / hate speech'],
  ['Uygunsuz / cinsel içerik', 'Inappropriate / sexual content'],
  ['Spam / Reklam', 'Spam / Ads'],
  ['Sahte profil', 'Fake profile'],
  ['Dolandırıcılık', 'Scam'],
  ['Reşit olmayan kullanıcı', 'Underage user'],
  ['Güvensiz buluşma', 'Unsafe meetup'],
];

export function actionLabel(a: ModAction): string {
  switch (a) {
    case 'warn':
      return L('Uyarı', 'Warning');
    case 'suspend':
      return L('Askı', 'Suspension');
    case 'ban':
      return L('Kalıcı ban', 'Permanent ban');
    case 'unban':
      return L('Ban kaldırıldı', 'Ban lifted');
    case 'dismiss':
      return L('Şikâyet kapatıldı', 'Reports dismissed');
    case 'role_add':
      return L('Yetki verildi', 'Role granted');
    case 'role_remove':
      return L('Yetki alındı', 'Role removed');
  }
}

export function blockReasonLabel(key: string): string {
  switch (key) {
    case 'harassment':
      return L('Taciz', 'Harassment');
    case 'spam':
      return L('Spam / Reklam', 'Spam / Ads');
    case 'inappropriate':
      return L('Uygunsuz içerik', 'Inappropriate content');
    case 'fake':
      return L('Sahte profil', 'Fake profile');
    case 'none':
      return L('Sebep belirtilmedi', 'No reason given');
    default:
      return L('Diğer', 'Other');
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
