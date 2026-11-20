/**
 * Paid features switch (app_config.payments_enabled).
 * Until real Google Play Billing is integrated, payments stay OFF: the store is hidden and every
 * account gets the full (premium) experience for free, so no credit/premium check can block a user.
 * Turn on later with:
 *   update public.app_config set value = 'true', updated_at = now() where key = 'payments_enabled';
 */
import { supabase } from '@/lib/supabase';

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export async function loadPaymentsEnabled(): Promise<boolean> {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', 'payments_enabled').maybeSingle();
        // Missing row or any error → payments off (free mode). Only cache a real answer.
        if (error) return false;
        cached = data?.value === true;
        return cached;
      } catch {
        return false;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Last known value (false until loaded). Use for showing/hiding store UI. */
export function paymentsEnabledSync(): boolean {
  return cached === true;
}
