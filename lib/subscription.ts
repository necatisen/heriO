import { supabase } from '@/lib/supabase';
import { loadPaymentsEnabled } from '@/lib/payments';

export type PlanType = 'monthly' | '3month' | 'yearly' | null;

export interface EffectiveSubscription {
  isPremium: boolean;
  subscriptionEnd: string | null;
  planType: PlanType;
}

/**
 * Fetches subscription for user and returns effective premium status.
 * When payments are off (app_config.payments_enabled=false) everyone is premium. Otherwise premium = is_premium and not expired.
 */
export async function getEffectiveSubscription(userId: string | undefined): Promise<EffectiveSubscription> {
  if (!userId) return { isPremium: false, subscriptionEnd: null, planType: null };

  // Payments OFF (free mode): every account gets the full premium experience.
  if (!(await loadPaymentsEnabled())) {
    return { isPremium: true, subscriptionEnd: null, planType: null };
  }

  let data: { is_premium: boolean; subscription_end: string | null; plan_type?: string | null } | null = null;
  let error: Error | null = null;

  const { data: fullData, error: fullError } = await supabase
    .from('subscriptions')
    .select('is_premium, subscription_end, plan_type')
    .eq('user_id', userId)
    .maybeSingle();

  if (fullError) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('subscriptions')
      .select('is_premium, subscription_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (!fallbackError && fallbackData) {
      data = { ...fallbackData, plan_type: null };
    } else {
      error = fullError;
    }
  } else {
    data = fullData;
  }

  if (error || !data) return { isPremium: false, subscriptionEnd: null, planType: null };

  const end = data.subscription_end ? new Date(data.subscription_end) : null;
  const now = new Date();
  const isPremium = !!(data.is_premium && (!end || end > now));
  return {
    isPremium,
    subscriptionEnd: data.subscription_end || null,
    planType: (data.plan_type as PlanType) || null,
  };
}
