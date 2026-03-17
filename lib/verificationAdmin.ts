/**
 * Admin verification: update a user's verification status.
 * Requires Supabase client with service role or RLS that allows calling set_verification_status.
 *
 * From Supabase Dashboard (SQL) you can approve/reject:
 *   select set_verification_status('user-uuid-here'::uuid, 'verified');
 *   select set_verification_status('user-uuid-here'::uuid, 'rejected');
 *
 * Or call this from a backend that uses the service role key.
 */
import { supabase } from '@/lib/supabase';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export async function setVerificationStatus(
  targetUserId: string,
  newStatus: VerificationStatus
) {
  const { error } = await supabase.rpc('set_verification_status', {
    target_user_id: targetUserId,
    new_status: newStatus,
  });
  return { error };
}

export async function approveVerification(targetUserId: string) {
  return setVerificationStatus(targetUserId, 'verified');
}

export async function rejectVerification(targetUserId: string) {
  return setVerificationStatus(targetUserId, 'rejected');
}
