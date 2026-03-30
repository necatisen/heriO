import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';
import { getOnboardingSeen } from '@/lib/onboardingStorage';
import { HerioLogo } from '@/components/HerioLogo';
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
          if (seen === 'true') {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding');
          }
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
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ImageBackground
      source={{
        uri: 'https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg',
      }}
      style={styles.background}
      blurRadius={3}>
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(43,125,233,0.65)', 'rgba(255,77,109,0.35)']}
        style={styles.gradient}>
        <View style={styles.languageSelector}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langButton,
                language === lang.code && styles.langButtonActive,
              ]}
              onPress={() => setLanguage(lang.code)}>
              <Text
                style={[
                  styles.langText,
                  language === lang.code && styles.langTextActive,
                ]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <HerioLogo size="lg" />
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>{t.welcome}</Text>
            <Text style={styles.welcomeSubtitle}>{t.welcomeMessage}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/auth/login')}>
              <Text style={styles.primaryButtonText}>{t.login}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/register')}>
              <Text style={styles.secondaryButtonText}>{t.register}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => router.push('/auth/login')}>
              <Globe size={20} color="#FFFFFF" />
              <Text style={styles.googleButtonText}>
                {t.continueWithGoogle}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333333',
  },
  languageSelector: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 10,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  langButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  langTextActive: {
    color: '#4A90E2',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 26,
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
