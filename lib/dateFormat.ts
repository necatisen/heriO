
import { L } from '@/lib/l10n';/**
 * Mesaj listesi ve sohbet ekranı için tarih/saat formatı
 */
export const ONLINE_FRESHNESS_MS = 90 * 1000;

export function isUserOnlineNow(
  isOnline: boolean | null | undefined,
  lastSeen: string | null | undefined,
  withinMs = ONLINE_FRESHNESS_MS
): boolean {
  if (!isOnline || !lastSeen) return false;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= withinMs;
}

export function formatMessageTime(isoDate: string): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const pad = (n: number) => n.toString().padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (msgDay.getTime() === today.getTime()) return time;
  if (msgDay.getTime() === yesterday.getTime()) return `${L('Dün', 'Yesterday')} ${time}`;
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    const days = [
      L('Paz', 'Sun'),
      L('Pzt', 'Mon'),
      L('Sal', 'Tue'),
      L('Çar', 'Wed'),
      L('Per', 'Thu'),
      L('Cum', 'Fri'),
      L('Cmt', 'Sat'),
    ];
    return `${days[date.getDay()]} ${time}`;
  }
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${time}`;
}

export function formatLastMessageTime(isoDate: string, language: string = 'tr'): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return L('Şimdi', 'Now');
  if (diffMins < 60) return L('{0} dk', '{0}m', [diffMins]);
  if (diffHours < 24) return L('{0} sa', '{0}h', [diffHours]);
  if (diffDays === 1) return L('Dün', 'Yesterday');
  if (diffDays < 7) return L('{0} gün', '{0}d', [diffDays]);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

export function formatLastSeen(isoDate: string | null | undefined, language: string = 'tr'): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Offline iken "aktif" gibi çelişkili ifadeler yerine net zaman bilgisini gösteriyoruz.
  if (diffMins < 5) return L('Az önce', 'Just now');
  if (diffMins < 60) return L('{0} dk önce', '{0}m ago', [diffMins]);
  if (diffHours < 24) return L('{0} saat önce', '{0}h ago', [diffHours]);
  if (diffDays === 1) return L('Dün', 'Yesterday');
  if (diffDays < 7) return L('{0} gün önce', '{0}d ago', [diffDays]);
  return L('Daha önce', 'Earlier');
}

