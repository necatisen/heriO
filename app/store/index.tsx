import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Crown, Coins } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';

export default function StoreScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);

  const refetchSubscription = useCallback(async () => {
    if (!user?.id) return;
    const sub = await getEffectiveSubscription(user.id);
    setIsPremium(sub.isPremium);
  }, [user?.id]);

  useEffect(() => {
    refetchSubscription();
  }, [refetchSubscription]);

  useFocusEffect(
    useCallback(() => {
      refetchSubscription();
    }, [refetchSubscription])
  );

  const title = language === 'tr' ? 'Mağaza' : 'Store';
  const premiumTitle = language === 'tr' ? 'Premium ol' : 'Go Premium';
  const premiumSub = language === 'tr' ? 'Sınırsız mesaj, tüm filtreler ve daha fazlası' : 'Unlimited messages, all filters and more';
  const creditsTitle = language === 'tr' ? 'Kredi satın al' : 'Buy credits';
  const creditsSub =
    language === 'tr'
      ? 'Her mesaj 50 kredi, Premium için mesajlar ücretsiz'
      : 'Each message costs 50 credits, messages are free for Premium';

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
        {!isPremium && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => router.push('/store/premium')}
            activeOpacity={0.8}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primary + '22' }]}>
              <Crown size={40} color={theme.primary} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{premiumTitle}</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{premiumSub}</Text>
            </View>
            <View style={styles.arrow}>
              <ArrowLeft size={20} color={theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => router.push('/store/credits')}
          activeOpacity={0.8}>
          <View style={[styles.iconWrap, { backgroundColor: '#FFD70022' }]}>
            <Coins size={40} color="#D4A017" />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{creditsTitle}</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{creditsSub}</Text>
          </View>
          <View style={styles.arrow}>
            <ArrowLeft size={20} color={theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          </View>
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
  content: { padding: 20, gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextWrap: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 2 },
  arrow: { marginLeft: 8 },
});
