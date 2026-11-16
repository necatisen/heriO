import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, ShieldCheck, Sparkles, MessageCircleHeart } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';
import { getOnboardingSeen } from '@/lib/onboardingStorage';
import { BrandLogo } from '@/components/BrandLogo';
import GradientButton from '@/components/GradientButton';
import HeartLoader from '@/components/HeartLoader';
import { BRAND } from '@/lib/brand';

import { L } from '@/lib/l10n';
const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      getOnboardingSeen()
        .then((seen) => {
          setCheckedOnboarding(true);
          router.replace(seen === 'true' ? '/(tabs)' : '/onboarding');
        })
        .catch(() => {
          setCheckedOnboarding(true);
          router.replace('/onboarding');
        });
    }
  }, [loading, session]);

  const languages: { code: Language; label: string }[] = [
    { code: 'tr', label: 'TR' },
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
    { code: 'ar', label: 'AR' },
    { code: 'de', label: 'DE' },
    { code: 'fr', label: 'FR' },
    { code: 'es', label: 'ES' },
  ];

  if (loading || (session && !checkedOnboarding)) {
    // Same small heart in the same place as the native splash, so the hand-over is seamless.
    return (
      <View style={styles.loadingContainer}>
        <HeartLoader />
      </View>
    );
  }

  const isTr = language === 'tr';
  const features = [
    { icon: <ShieldCheck size={18} color="#7CF3C8" />, text: L('Yüzü doğrulanmış gerçek profiller', 'Face-verified real profiles') },
    { icon: <Sparkles size={18} color="#FFD36E" />, text: L('Sana uygun kişilerle akıllı eşleşme', 'Smart matches that fit you') },
    { icon: <MessageCircleHeart size={18} color="#FF8FB8" />, text: L('Güvenli ve sade sohbet', 'Safe, simple chat') },
  ];

  return (
    <LinearGradient colors={BRAND.night} style={styles.background}>
      <Orb color={BRAND.blue} size={width * 0.9} x={-width * 0.35} y={-height * 0.08} delay={0} />
      <Orb color={BRAND.violet} size={width * 0.8} x={width * 0.45} y={height * 0.28} delay={800} />
      <Orb color={BRAND.pink} size={width * 0.7} x={-width * 0.2} y={height * 0.66} delay={1600} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.languageSelector}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langButton, language === lang.code && styles.langButtonActive]}
              onPress={() => setLanguage(lang.code)}>
              <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <View style={styles.hero}>
          <Animated.View entering={FadeInDown.duration(700).springify().damping(14)}>
            <BrandLogo size="lg" glow />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.welcomeTitle}>
            {t.welcome}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300).duration(600)} style={styles.welcomeSubtitle}>
            {t.welcomeMessage}
          </Animated.Text>

          <View style={styles.features}>
            {features.map((f, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(450 + i * 120).duration(500)} style={styles.featureRow}>
                <View style={styles.featureIcon}>{f.icon}</View>
                <Text style={styles.featureText}>{f.text}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View entering={FadeInUp.delay(700).duration(600)} style={styles.buttonContainer}>
          <GradientButton title={t.register} onPress={() => router.push('/auth/register')} />
          <GradientButton title={t.login} variant="glass" onPress={() => router.push('/auth/login')} />
          <TouchableOpacity style={styles.googleButton} onPress={() => router.push('/auth/login')}>
            <Globe size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.googleButtonText}>{t.continueWithGoogle}</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/** Large soft colour blob that slowly drifts – gives the dark hero depth. */
function Orb({ color, size, x, y, delay }: { color: string; size: number; x: number; y: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 30 }, { translateY: t.value * -40 }, { scale: 1 + t.value * 0.08 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.22 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  languageSelector: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, marginTop: 8 },
  langButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  langButtonActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  langTextActive: { color: BRAND.violet },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginTop: 28, letterSpacing: -0.5 },
  welcomeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 10, lineHeight: 23 },
  features: { width: '100%', marginTop: 32, gap: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 },
  buttonContainer: { gap: 12, paddingBottom: 12 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  googleButtonText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
});
