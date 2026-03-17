import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PREMIUM_BENEFITS, PREMIUM_PLANS, type PremiumPlanId } from '@/lib/storeProducts';

export default function PremiumScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>('yearly');

  const benefits = PREMIUM_BENEFITS[language === 'tr' ? 'tr' : 'en'];
  const title = language === 'tr' ? 'Premium' : 'Premium';
  const ctaLabel = language === 'tr' ? 'Satın al' : 'Purchase';

  const selectedPlanDef = PREMIUM_PLANS.find((p) => p.id === selectedPlan) || PREMIUM_PLANS[0];
  const activeSummaryTr = `${selectedPlanDef.labelTr} premium aktif edilecek.`;
  const activeSummaryEn = `${selectedPlanDef.labelEn} Premium will be activated.`;

  const handlePurchase = () => {
    router.push({ pathname: '/store/fake-payment', params: { type: 'premium', plan: selectedPlan } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.primary + '18' }]}>
          <Crown size={56} color={theme.primary} />
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Sınırsız deneyim' : 'Unlimited experience'}
          </Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
            {language === 'tr' ? 'Arkadaş olmadan da herkesle sohbet et, tüm filtreleri kullan.' : 'Chat with anyone without being friends, use all filters.'}
          </Text>
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.benefitsTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Premium ile neler var?' : 'What’s included?'}
          </Text>
          {benefits.map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <Check size={20} color={theme.primary} />
              <Text style={[styles.benefitText, { color: theme.text }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.plansTitle, { color: theme.text }]}>
          {language === 'tr' ? 'Paket seçin' : 'Choose a plan'}
        </Text>
        {PREMIUM_PLANS.map((p) => {
          const label = language === 'tr' ? p.labelTr : p.labelEn;
          const price = language === 'tr' ? p.priceTr : p.priceEn;
          const isSelected = selectedPlan === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: isSelected ? theme.primary + '15' : theme.cardBackground,
                  borderColor: isSelected ? theme.primary : p.popular ? theme.primary + '99' : theme.border,
                  borderWidth: isSelected ? 2.5 : 2,
                },
              ]}
              onPress={() => setSelectedPlan(p.id)}
              activeOpacity={0.8}>
              {p.popular && (
                <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.popularBadgeText}>{language === 'tr' ? 'Önerilen' : 'Popular'}</Text>
                </View>
              )}
              <View style={styles.planCardInner}>
                <Text style={[styles.planLabel, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.planPrice, { color: theme.text }]}>{price}</Text>
              </View>
              {isSelected ? (
                <View style={[styles.planCheck, { backgroundColor: theme.primary }]}>
                  <Check size={16} color="#FFFFFF" />
                </View>
              ) : (
                <View style={[styles.planRadio, { borderColor: theme.border }]} />
              )}
            </TouchableOpacity>
          );
        })}
        <View style={[styles.summaryCard, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '44' }]}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            {language === 'tr' ? 'Seçilen paket' : 'Selected plan'}
          </Text>
          <Text style={[styles.summaryText, { color: theme.text }]}>
            {language === 'tr' ? activeSummaryTr : activeSummaryEn}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.primary }]}
          onPress={handlePurchase}
          activeOpacity={0.85}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  heroSub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  benefitsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  benefitsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  benefitText: { fontSize: 14, flex: 1 },
  plansTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  planCardInner: { flex: 1 },
  planLabel: { fontSize: 17, fontWeight: '700' },
  planPrice: { fontSize: 15, marginTop: 2 },
  planCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  summaryText: { fontSize: 15, fontWeight: '700' },
  cta: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
