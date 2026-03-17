import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Heart, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Language } from '@/lib/i18n';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'ar', label: 'AR' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
];

const contentByLang: Record<string, { welcome: string; appName: string; subtitle: string; login: string; register: string; features: { chat: string; match: string; connect: string } }> = {
  tr: {
    welcome: 'Hoş Geldiniz',
    appName: 'Chat Connect',
    subtitle: 'Yeni insanlarla tanış, sohbet et ve bağlantılar kur',
    login: 'Giriş Yap',
    register: 'Hesap Oluştur',
    features: { chat: 'Anlık Mesajlaşma', match: 'Akıllı Eşleşme', connect: 'Gerçek Bağlantılar' },
  },
  en: {
    welcome: 'Welcome',
    appName: 'Chat Connect',
    subtitle: 'Meet new people, chat and build connections',
    login: 'Login',
    register: 'Create Account',
    features: { chat: 'Instant Messaging', match: 'Smart Matching', connect: 'Real Connections' },
  },
  ru: {
    welcome: 'Добро пожаловать',
    appName: 'Chat Connect',
    subtitle: 'Знакомьтесь, общайтесь и находите связи',
    login: 'Войти',
    register: 'Создать аккаунт',
    features: { chat: 'Сообщения', match: 'Совпадения', connect: 'Связи' },
  },
  ar: {
    welcome: 'مرحباً',
    appName: 'Chat Connect',
    subtitle: 'تعرف على أشخاص جدد وتواصل وابنِ علاقات',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    features: { chat: 'مراسلة', match: 'تطابق', connect: 'اتصالات' },
  },
  de: {
    welcome: 'Willkommen',
    appName: 'Chat Connect',
    subtitle: 'Lerne neue Leute kennen, chatte und knüpfe Kontakte',
    login: 'Anmelden',
    register: 'Konto erstellen',
    features: { chat: 'Nachrichten', match: 'Matches', connect: 'Verbindungen' },
  },
  fr: {
    welcome: 'Bienvenue',
    appName: 'Chat Connect',
    subtitle: 'Rencontrez des gens, discutez et créez des liens',
    login: 'Connexion',
    register: 'Créer un compte',
    features: { chat: 'Messagerie', match: 'Rencontres', connect: 'Connexions' },
  },
  es: {
    welcome: 'Bienvenido',
    appName: 'Chat Connect',
    subtitle: 'Conoce gente, chatea y haz conexiones',
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    features: { chat: 'Mensajes', match: 'Coincidencias', connect: 'Conexiones' },
  },
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const content = contentByLang[language] || contentByLang.en;

  return (
    <LinearGradient colors={['#4A90E2', '#50C9E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.languageContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageScroll}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  language === lang.code && styles.languageButtonActive,
                ]}
                onPress={() => setLanguage(lang.code)}>
                <Text
                  style={[
                    styles.languageButtonText,
                    language === lang.code && styles.languageButtonTextActive,
                  ]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MessageCircle size={80} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.welcomeText}>{content.welcome}</Text>
            <Text style={styles.appName}>{content.appName}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          </View>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <MessageCircle size={32} color="#FFFFFF" />
              <Text style={styles.featureText}>{content.features.chat}</Text>
            </View>
            <View style={styles.featureItem}>
              <Heart size={32} color="#FFFFFF" />
              <Text style={styles.featureText}>{content.features.match}</Text>
            </View>
            <View style={styles.featureItem}>
              <Users size={32} color="#FFFFFF" />
              <Text style={styles.featureText}>{content.features.connect}</Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginButtonText}>{content.login}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push('/auth/register')}>
              <Text style={styles.registerButtonText}>{content.register}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  languageContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  languageScroll: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  languageButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  languageButtonTextActive: {
    color: '#4A90E2',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  appName: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 40,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttons: {
    gap: 16,
    paddingBottom: 20,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#4A90E2',
    fontSize: 18,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
