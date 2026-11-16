import { useState } from 'react';
import { L } from '@/lib/l10n';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '@/lib/brand';
import { MessageCircle, Mail, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(L('Hata', 'Error'), L('Lütfen e-posta adresinizi girin', 'Please enter your email'));
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      Alert.alert(
        L('Başarılı', 'Success'),
        L('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.', 'A password reset link has been sent to your email.'),
        [{ text: L('Tamam', 'OK'), onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(L('Hata', 'Error'), error.message || L('Şifre sıfırlama başarısız oldu', 'Password reset failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={BRAND.night} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <MessageCircle size={64} color="#FFFFFF" />
            <Text style={styles.title}>{t.resetPassword}</Text>
            <Text style={styles.subtitle}>
              {L('Şifre sıfırlama bağlantısı için e-posta adresinizi girin', 'Enter your email to receive a password reset link')}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#5B4BFF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.email}
                placeholderTextColor="#999999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetPassword}
              disabled={loading}>
              <Text style={styles.resetButtonText}>
                {loading ? L('Gönderiliyor...', 'Sending...') : t.sendResetLink}
              </Text>
            </TouchableOpacity>

            <View style={styles.backToLoginContainer}>
              <Text style={styles.backToLoginText}>
                {L('Şifrenizi hatırladınız mı?', 'Remember your password?')}{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.backToLoginLink}>{t.login}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 16,
    marginBottom: 24,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  resetButton: {
    backgroundColor: '#5B4BFF',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#5B4BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  backToLoginText: {
    fontSize: 14,
    color: '#666666',
  },
  backToLoginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B4BFF',
  },
});
