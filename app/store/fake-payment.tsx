import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PREMIUM_PLANS, type PremiumPlanId } from '@/lib/storeProducts';

export default function FakePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; packId?: string; credits?: string; plan?: string }>();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const type = params.type || 'premium';
  const planParam = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const plan = (planParam === 'monthly' || planParam === '3month' || planParam === 'yearly' ? planParam : 'monthly') as PremiumPlanId;
  const credits = params.credits ? parseInt(params.credits, 10) : 0;

  const premiumPlanDef = PREMIUM_PLANS.find((p) => p.id === plan) || PREMIUM_PLANS[0];
  const premiumDetailTr = `${premiumPlanDef.labelTr} premium aktif edilecek.`;
  const premiumDetailEn = `${premiumPlanDef.labelEn} Premium will be activated.`;

  function getSubscriptionEnd(planId: PremiumPlanId): Date {
    const d = new Date();
    const planDef = PREMIUM_PLANS.find((p) => p.id === planId) || PREMIUM_PLANS[0];
    d.setMonth(d.getMonth() + planDef.months);
    return d;
  }

  const handleComplete = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      if (type === 'premium' && user?.id) {
        const now = new Date().toISOString();
        const end = getSubscriptionEnd(plan).toISOString();
        const { error } = await supabase.from('subscriptions').upsert(
          {
            user_id: user.id,
            is_premium: true,
            subscription_start: now,
            subscription_end: end,
            plan_type: plan,
          },
          { onConflict: 'user_id' }
        );
        if (error) {
          setErrorMessage(language === 'tr' ? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' : 'Operation could not be completed. Please try again.');
          setLoading(false);
          return;
        }
      } else if (type === 'credits' && user?.id && credits > 0) {
        const { data: row } = await supabase.from('credits').select('balance').eq('user_id', user.id).maybeSingle();
        const current = row?.balance ?? 0;
        const { error: creditsError } = await supabase.from('credits').upsert(
          { user_id: user.id, balance: current + credits },
          { onConflict: 'user_id' }
        );
        if (creditsError) {
          setErrorMessage(language === 'tr' ? 'Kredi alınamadı. Tekrar deneyin.' : 'Credits could not be added. Please try again.');
          setLoading(false);
          return;
        }
        const { error: txError } = await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: credits,
          type: 'purchase',
          description: language === 'tr' ? 'Kredi paketi (simülasyon)' : 'Credit pack (simulation)',
        });
        if (txError) {
          setErrorMessage(language === 'tr' ? 'Kredi alınamadı. Tekrar deneyin.' : 'Credits could not be added. Please try again.');
          setLoading(false);
          return;
        }
      }
      setDone(true);
    } catch (e: any) {
      console.error('Fake payment update failed:', e);
      setErrorMessage(
        type === 'credits'
          ? (language === 'tr' ? 'Kredi alınamadı. Tekrar deneyin.' : 'Credits could not be added. Please try again.')
          : (language === 'tr' ? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' : 'Operation could not be completed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const title =
    language === 'tr' ? 'Ödeme simülasyonu' : 'Payment simulation';
  const subtitle =
    language === 'tr'
      ? 'Bu bir test ekranıdır. Gerçek ödeme entegre edildiğinde bu adım atlanacak.'
      : 'This is a test screen. It will be replaced when real payment is integrated.';
  const completeLabel = language === 'tr' ? 'Tamamla (test)' : 'Complete (test)';
  const successTitle = language === 'tr' ? 'Tamamlandı' : 'Done';
  const successSub =
    type === 'premium'
      ? language === 'tr'
        ? 'Premium hesabınız aktif.'
        : 'Your Premium account is active.'
      : language === 'tr'
        ? `${credits} kredi hesabınıza eklendi.`
        : `${credits} credits added to your account.`;
  const goToProfile = () => {
    router.navigate('/(tabs)/profile' as any);
  };

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      goToProfile();
    }, 1500);
    return () => clearTimeout(t);
  }, [done]);

  if (done) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <CheckCircle size={72} color={theme.primary} />
          <Text style={[styles.successTitle, { color: theme.text }]}>{successTitle}</Text>
          <Text style={[styles.successSub, { color: theme.textSecondary }]}>{successSub}</Text>
          <Text style={[styles.redirectHint, { color: theme.textSecondary }]}>
            {language === 'tr' ? 'Profilinize yönlendiriliyorsunuz...' : 'Redirecting to your profile...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.centered}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        {type === 'premium' && (
          <Text style={[styles.detail, { color: theme.text }]}>
            {language === 'tr' ? premiumDetailTr : premiumDetailEn}
          </Text>
        )}
        {type === 'credits' && credits > 0 && (
          <Text style={[styles.detail, { color: theme.text }]}>
            {language === 'tr' ? `${credits} kredi eklenecek.` : `${credits} credits will be added.`}
          </Text>
        )}
        {errorMessage && (
          <Text style={[styles.errorText, { color: theme.error || '#B00020' }]}>{errorMessage}</Text>
        )}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary }]}
          onPress={handleComplete}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>{completeLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  detail: { fontSize: 16, marginBottom: 24 },
  btn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, minWidth: 200, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  successTitle: { fontSize: 24, fontWeight: '800', marginTop: 20 },
  successSub: { fontSize: 15, marginTop: 8, textAlign: 'center' },
  redirectHint: { fontSize: 14, marginTop: 16 },
  errorText: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
});
