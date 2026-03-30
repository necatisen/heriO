import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowLeft, Globe, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as SecureStore from 'expo-secure-store';
import { HerioLogo } from '@/components/HerioLogo';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      if (Platform.OS === 'web') {
        const savedEmail = localStorage.getItem('savedEmail');
        const savedPassword = localStorage.getItem('savedPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } else {
        const savedEmail = await SecureStore.getItemAsync('savedEmail');
        const savedPassword = await SecureStore.getItemAsync('savedPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async () => {
    try {
      if (Platform.OS === 'web') {
        if (rememberMe) {
          localStorage.setItem('savedEmail', email);
          localStorage.setItem('savedPassword', password);
        } else {
          localStorage.removeItem('savedEmail');
          localStorage.removeItem('savedPassword');
        }
      } else {
        if (rememberMe) {
          await SecureStore.setItemAsync('savedEmail', email);
          await SecureStore.setItemAsync('savedPassword', password);
        } else {
          await SecureStore.deleteItemAsync('savedEmail');
          await SecureStore.deleteItemAsync('savedPassword');
        }
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      await saveCredentials();
      const successMessage = language === 'tr' ? 'Giriş başarılı! Yönlendiriliyor...' : 'Login successful! Redirecting...';
      setSuccess(successMessage);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error.message?.includes('Invalid login credentials')) {
        setError(language === 'tr' ? 'E-posta veya şifre hatalı' : 'Email or password is incorrect');
      } else if (error.message?.includes('Email not confirmed')) {
        setError(language === 'tr' ? 'E-posta adresiniz doğrulanmamış' : 'Email not confirmed');
      } else if (error.message?.includes('Database error')) {
        setError(language === 'tr' ? 'Veritabanı hatası. Lütfen daha sonra tekrar deneyin.' : 'Database error. Please try again later.');
      } else {
        setError(error.message || error.error_description || (language === 'tr' ? 'Giriş yapılamadı. Lütfen tekrar deneyin.' : 'Login failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || 'Google ile giriş başarısız oldu');
    }
  };

  return (
    <LinearGradient colors={['#4A90E2', '#50C9E9']} style={styles.container}>
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
            <HerioLogo size="lg" variant="light" style={styles.logoMark} />
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}
            <View style={styles.inputContainer}>
              <Mail size={20} color="#4A90E2" style={styles.inputIcon} />
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

            <View style={styles.inputContainer}>
              <Lock size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.password}
                placeholderTextColor="#999999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#999999" />
                ) : (
                  <Eye size={20} color="#999999" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.rememberMeContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>{t.rememberMe}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/auth/forgot-password')}>
                <Text style={styles.forgotPassword}>{t.forgotPassword}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}>
              <Text style={styles.loginButtonText}>
                {loading ? t.loggingIn : t.login}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}>
              <Globe size={20} color="#4A90E2" />
              <Text style={styles.googleButtonText}>
                {t.continueWithGoogle}
              </Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>{t.dontHaveAccount} </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.registerLink}>{t.register}</Text>
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
  logoMark: {
    transform: [{ scale: 1.25 }],
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  languageButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  languageButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  languageButtonTextActive: {
    color: '#4A90E2',
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
    marginBottom: 16,
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
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999999',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#666666',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: '#E5F9E5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#44AA44',
  },
  successText: {
    color: '#006600',
    fontSize: 14,
    fontWeight: '600',
  },
});
