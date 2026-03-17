/**
 * Mesaj listesi ve sohbet ekranı için tarih/saat formatı
 */
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
  if (msgDay.getTime() === yesterday.getTime()) return `Dün ${time}`;
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return `${days[date.getDay()]} ${time}`;
  }
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${time}`;
}

export function formatLastMessageTime(isoDate: string, language: 'tr' | 'en' = 'tr'): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return language === 'tr' ? 'Şimdi' : 'Now';
  if (diffMins < 60) return language === 'tr' ? `${diffMins} dk` : `${diffMins}m`;
  if (diffHours < 24) return language === 'tr' ? `${diffHours} sa` : `${diffHours}h`;
  if (diffDays === 1) return language === 'tr' ? 'Dün' : 'Yesterday';
  if (diffDays < 7) return language === 'tr' ? `${diffDays} gün` : `${diffDays}d`;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

export function formatLastSeen(isoDate: string | null | undefined, language: 'tr' | 'en' = 'tr'): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return language === 'tr' ? 'Şu anda aktif' : 'Active now';
  if (diffMins < 60) return language === 'tr' ? `${diffMins} dk önce aktifti` : `Active ${diffMins}m ago`;
  if (diffHours < 24) return language === 'tr' ? `${diffHours} saat önce aktifti` : `Active ${diffHours}h ago`;
  if (diffDays === 1) return language === 'tr' ? 'Dün aktifti' : 'Active yesterday';
  return language === 'tr' ? 'Daha önce aktifti' : 'Was active earlier';
}

