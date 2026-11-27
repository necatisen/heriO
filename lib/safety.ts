/**
 * Block / report helpers shared by the chat screen and the profile modal.
 * A block with a reason also files a report, so moderators see it in the admin inbox.
 */
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';
import { submitUserReport } from '@/lib/staff';

export type BlockReasonKey = 'harassment' | 'spam' | 'inappropriate' | 'fake' | 'other' | 'none';

export const BLOCK_REASONS: { key: BlockReasonKey; tr: string; en: string }[] = [
  { key: 'harassment', tr: 'Taciz', en: 'Harassment' },
  { key: 'spam', tr: 'Spam / Reklam', en: 'Spam / Ads' },
  { key: 'inappropriate', tr: 'Uygunsuz içerik', en: 'Inappropriate content' },
  { key: 'fake', tr: 'Sahte profil', en: 'Fake profile' },
  { key: 'other', tr: 'Diğer', en: 'Other' },
  { key: 'none', tr: 'Sebep belirtmeden engelle', en: 'Block without a reason' },
];

/** Reasons for reporting a person (chat menu / profile). */
export const USER_REPORT_REASONS: [string, string][] = [
  ['Taciz / Nefret söylemi', 'Harassment / hate speech'],
  ['Uygunsuz / cinsel içerik', 'Inappropriate / sexual content'],
  ['Spam / Reklam', 'Spam / Ads'],
  ['Sahte profil', 'Fake profile'],
  ['Dolandırıcılık', 'Scam'],
  ['Reşit olmayan kullanıcı', 'Underage user'],
  ['Diğer', 'Other'],
];

/**
 * Blocks `otherId`. Returns 'already' if the block existed.
 * With a reason (not 'none') a report is filed too; a failing report never fails the block.
 */
export async function blockUser(myId: string, otherId: string, reason: BlockReasonKey): Promise<'blocked' | 'already'> {
  const { data: existing } = await supabase.from('blocks').select('id').eq('user_id', myId).eq('blocked_user_id', otherId).maybeSingle();
  if (existing) return 'already';
  const { error } = await supabase.from('blocks').insert({
    user_id: myId,
    blocked_user_id: otherId,
    reason: reason === 'none' ? null : reason,
  });
  if (error && error.code !== '23505') throw error;
  if (reason !== 'none') {
    const r = BLOCK_REASONS.find((b) => b.key === reason);
    await submitUserReport(myId, otherId, `block: ${r ? r.tr : reason}`, { source: 'block' }).catch(() => {});
  }
  return error ? 'already' : 'blocked';
}

export const blockedMessage = () =>
  L('Kullanıcı engellendi. Artık sizden mesaj alamayacak.', 'User has been blocked and will no longer be able to contact you.');
