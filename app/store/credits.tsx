import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Coins, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CREDIT_PACKAGES, CREDIT_RULES } from '@/lib/storeProducts';

type CreditPackId = (typeof CREDIT_PACKAGES)[number]['id'];

export default function CreditsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const defaultPack = CREDIT_PACKAGES.find((p) => p.popular) || CREDIT_PACKAGES[0];
  const [selectedPackId, setSelectedPackId] = useState<CreditPackId>(defaultPack.id);

  const rules = CREDIT_RULES[language === 'tr' ? 'tr' : 'en'];
  const title = language === 'tr' ? 'Kredi satın al' : 'Buy credits';
  const ctaLabel = language === 'tr' ? 'Satın al' : 'Purchase';
  const popular = language === 'tr' ? 'Popüler' : 'Popular';

  const selectedPack = CREDIT_PACKAGES.find((p) => p.id === selectedPackId) || CREDIT_PACKAGES[0];

  const handlePurchase = () => {
    router.push({
      pathname: '/store/fake-payment',
      params: { type: 'credits', packId: selectedPack.id, credits: String(selectedPack.credits) },
    });
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
        <Text style={[styles.rules, { color: theme.textSecondary }]}>{rules.description}</Text>

        <Text style={[styles.packsTitle, { color: theme.text }]}>
          {language === 'tr' ? 'Paket seçin' : 'Choose a pack'}
        </Text>
        {CREDIT_PACKAGES.map((pack) => {
          const isSelected = selectedPackId === pack.id;
          return (
            <TouchableOpacity
              key={pack.id}
              style={[
                styles.pack,
                {
                  backgroundColor: isSelected ? theme.primary + '15' : theme.cardBackground,
                  borderColor: isSelected ? theme.primary : pack.popular ? theme.primary + '99' : theme.border,
                  borderWidth: isSelected ? 2.5 : 2,
                },
              ]}
              onPress={() => setSelectedPackId(pack.id)}
              activeOpacity={0.8}>
              {pack.popular && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>{popular}</Text>
                </View>
              )}
              <View style={styles.packLeft}>
                <Coins size={28} color="#D4A017" />
                <View>
                  <Text style={[styles.packCredits, { color: theme.text }]}>{pack.credits} kredi</Text>
                  <Text style={[styles.packPrice, { color: theme.textSecondary }]}>
                    {language === 'tr' ? pack.priceLabelTr : pack.priceLabelEn}
                  </Text>
                </View>
              </View>
              {isSelected ? (
                <View style={[styles.packCheck, { backgroundColor: theme.primary }]}>
                  <Check size={16} color="#FFFFFF" />
                </View>
              ) : (
                <View style={[styles.packRadio, { borderColor: theme.border }]} />
              )}
            </TouchableOpacity>
          );
        })}
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
  rules: { fontSize: 14, marginBottom: 20, lineHeight: 22 },
  packsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  packLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  packCredits: { fontSize: 17, fontWeight: '700' },
  packPrice: { fontSize: 14, marginTop: 2 },
  packCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  cta: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
