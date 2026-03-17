import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Shield, Coins, ArrowRight } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { setOnboardingSeen } from '@/lib/onboardingStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const [page, setPage] = useState(0);

  const content = [
    {
      icon: Users,
      title: language === 'tr' ? 'Ne yapabilirsin?' : 'What can you do?',
      body:
        language === 'tr'
          ? 'İnsanlarla tanış, filtrelerle kendine uygun eşleşmeleri bul ve sohbet et. Keşfet, beğen, eşleş.'
          : 'Meet people, find matches that suit you with filters, and chat. Explore, like, match.',
    },
    {
      icon: Shield,
      title: language === 'tr' ? 'Güvenlik' : 'Safety',
      body:
        language === 'tr'
          ? 'Kural ihlallerine toleransımız yok. Saygılı ve güvenli bir ortam için hep birlikte çalışıyoruz.'
          : 'We have zero tolerance for rule violations. We work together for a respectful and safe environment.',
    },
    {
      icon: Coins,
      title: language === 'tr' ? 'Kredi ve Premium' : 'Credits & Premium',
      body:
        language === 'tr'
          ? 'Arkadaşlarla mesajlaşma ücretsiz. Premium ile sınırsız deneyim; kredilerle ara ara mesaj atabilirsin.'
          : 'Messaging with friends is free. Go unlimited with Premium, or use credits to message from time to time.',
    },
  ];

  const isLast = page === content.length - 1;

  const handleNext = async () => {
    if (isLast) {
      try {
        await setOnboardingSeen();
      } catch (_) {}
      router.replace('/(tabs)');
    } else {
      setPage((p) => p + 1);
    }
  };

  const CurrentIcon = content[page].icon;

  return (
    <LinearGradient colors={['#4A90E2', '#50C9E9']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <CurrentIcon size={64} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={styles.title}>{content[page].title}</Text>
        <Text style={styles.body}>{content[page].body}</Text>
      </View>

      <View style={styles.dots}>
        {content.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.9}>
        <Text style={styles.buttonText}>
          {isLast
            ? language === 'tr'
              ? 'Başla'
              : 'Get started'
            : language === 'tr'
              ? 'Devam'
              : 'Next'}
        </Text>
        <ArrowRight size={22} color="#4A90E2" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 56,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 17,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.95,
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
});
