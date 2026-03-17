import { supabase } from '@/lib/supabase';

export type PlanType = 'monthly' | '3month' | 'yearly' | null;

export interface EffectiveSubscription {
  isPremium: boolean;
  subscriptionEnd: string | null;
  planType: PlanType;
}

/**
 * Fetches subscription for user and returns effective premium status.
 * If subscription_end is in the past, updates the row to normal (is_premium false) and returns isPremium false.
 */
export async function getEffectiveSubscription(userId: string | undefined): Promise<EffectiveSubscription> {
  if (!userId) return { isPremium: false, subscriptionEnd: null, planType: null };

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
  const expired = data.is_premium && end && end <= now;

  if (expired) {
    await supabase
      .from('subscriptions')
      .update({
        is_premium: false,
        subscription_start: null,
        subscription_end: null,
        ...(data.plan_type != null && { plan_type: null }),
      })
      .eq('user_id', userId);
    return { isPremium: false, subscriptionEnd: null, planType: null };
  }

  const isPremium = !!(data.is_premium && (!end || end > now));
  return {
    isPremium,
    subscriptionEnd: data.subscription_end || null,
    planType: (data.plan_type as PlanType) || null,
  };
}
