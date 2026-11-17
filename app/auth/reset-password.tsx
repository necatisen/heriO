import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/authErrors';
import { BrandLogo } from '@/components/BrandLogo';
import HeartLoader from '@/components/HeartLoader';
import { L } from '@/lib/l10n';

/**
 * Target of the password-reset email link (birthchat://auth/reset-password?code=…).
 * Exchanges the one-time code for a session, then lets the user choose a new password.
 */
export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [stage, setStage] = useState<'checking' | 'form' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (params.error_description) return setStage('invalid');
      const code = typeof params.code === 'string' ? params.code : '';
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        // The code may already have been exchanged (e.g. screen re-mounted); a session is enough.
        if (error) {
          const { data } = await supabase.auth.getSession();
          return setStage(data.session ? 'form' : 'invalid');
        }
        return setStage('form');
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setStage(data.session ? 'form' : 'invalid');
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error_description]);

  const save = async () => {
    if (password.length < 6) return Alert.alert(L('Hata', 'Error'), L('Şifre en az 6 karakter olmalıdır', 'Password must be at least 6 characters'));
    if (password !== confirm) return Alert.alert(L('Hata', 'Error'), L('Şifreler eşleşmiyor', 'Passwords do not match'));
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return Alert.alert(L('Hata', 'Error'), authErrorMessage(error.message));
    Alert.alert(L('Başarılı', 'Success'), L('Şifreniz güncellendi.', 'Your password has been updated.'), [
      { text: L('Tamam', 'OK'), onPress: () => router.replace('/') },
    ]);
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BrandLogo size="md" glow />
            <Text style={styles.title}>{L('Yeni Şifre', 'New Password')}</Text>
          </View>

          <View style={styles.card}>
            {stage === 'checking' ? (
              <View style={styles.center}>
                <HeartLoader />
              </View>
            ) : stage === 'invalid' ? (
              <>
                <Text style={styles.info}>
                  {L('Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir sıfırlama bağlantısı isteyin.', 'This link is invalid or has expired. Please request a new reset link.')}
                </Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth/forgot-password')}>
                  <Text style={styles.buttonText}>{L('Sıfırlama Bağlantısı Gönder', 'Send Reset Link')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.info}>{L('Hesabın için yeni bir şifre belirle.', 'Choose a new password for your account.')}</Text>
                <View style={styles.input}>
                  <Lock size={20} color={theme.primary} style={styles.icon} />
                  <TextInput
                    style={styles.inputText}
                    placeholder={L('Yeni Şifre', 'New Password')}
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShow(!show)}>
                    {show ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                  </TouchableOpacity>
                </View>
                <View style={styles.input}>
                  <Lock size={20} color={theme.primary} style={styles.icon} />
                  <TextInput
                    style={styles.inputText}
                    placeholder={L('Şifreyi Onayla', 'Confirm Password')}
                    placeholderTextColor={theme.textSecondary}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity style={styles.button} onPress={save} disabled={saving}>
                  <Text style={styles.buttonText}>{saving ? '…' : L('Şifreyi Güncelle', 'Update Password')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 80, paddingBottom: 88, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 28 },
    title: { fontSize: 28, fontWeight: '800', color: t.onGradient, marginTop: 14 },
    card: { backgroundColor: t.cardBackground, borderRadius: 30, padding: 26, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
    center: { paddingVertical: 30, alignItems: 'center' },
    info: { fontSize: 15, color: t.textSecondary, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
    input: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.inputBackground, borderRadius: 15, paddingHorizontal: 16, marginBottom: 16, height: 56 },
    icon: { marginRight: 12 },
    inputText: { flex: 1, fontSize: 16, color: t.text },
    button: { backgroundColor: t.primary, paddingVertical: 18, borderRadius: 15, alignItems: 'center', marginTop: 8 },
    buttonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  });
