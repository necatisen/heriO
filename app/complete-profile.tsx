import { useEffect, useMemo, useState } from 'react';
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
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Calendar, Globe, MapPin } from 'lucide-react-native';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { countries, generateAgeOptions, getCitiesForCountry } from '@/lib/constants';
import ComboBox from '@/components/ComboBox';
import { BrandLogo } from '@/components/BrandLogo';
import { L } from '@/lib/l10n';
import { ConsentChecklist, signupConsentItems, allChecked } from '@/components/ConsentChecklist';
import RulesNotice from '@/components/RulesNotice';
import { recordConsents, SIGNUP_CONSENTS, type ConsentType } from '@/lib/consents';

/**
 * Required for accounts created with Google: they skipped the sign-up form, so age (18+),
 * gender and location are asked here before the app can be used.
 */
export default function CompleteProfileScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();

  const googleName = String((user?.user_metadata as any)?.full_name ?? (user?.user_metadata as any)?.name ?? '').trim();
  const [fullName, setFullName] = useState(googleName);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [consents, setConsents] = useState<Partial<Record<ConsentType, boolean>>>({});
  const consentItems = useMemo(() => signupConsentItems(), [language]);
  const [saving, setSaving] = useState(false);

  // Hardware back must not skip this step.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const ageOptions = useMemo(() => generateAgeOptions(), []);
  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.value, label: (c.label as any)[language] || c.label.en })),
    [language]
  );
  const cityOptions = useMemo(() => getCitiesForCountry(country).map((c) => ({ value: c, label: c })), [country]);

  const save = async () => {
    if (!user) return;
    const n = Number(age);
    if (fullName.trim().length < 2) return Alert.alert(L('Eksik bilgi', 'Missing information'), L('Lütfen adınızı girin.', 'Please enter your name.'));
    if (!n) return Alert.alert(L('Eksik bilgi', 'Missing information'), L('Lütfen yaşınızı seçin.', 'Please select your age.'));
    if (n < 18) return Alert.alert(L('Hata', 'Error'), L('18 yaşından küçüksünüz!', 'You must be 18 or older!'));
    if (!gender) return Alert.alert(L('Eksik bilgi', 'Missing information'), L('Lütfen cinsiyetinizi seçin.', 'Please select your gender.'));
    if (!country) return Alert.alert(L('Eksik bilgi', 'Missing information'), L('Lütfen ülkenizi seçin.', 'Please select your country.'));
    if (!allChecked(consentItems, consents)) return Alert.alert(L('Onay gerekli', 'Confirmation required'), L('Devam etmek için tüm onay kutularını işaretleyin.', 'Tick all the boxes to continue.'));

    const birthDate = `${new Date().getFullYear() - n}-01-01`;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), birth_date: birthDate, gender, country, city: city || null })
        .eq('id', user.id);
      if (error) throw error;
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { profile_completed: true, birth_date: birthDate, adult_confirmed_at: new Date().toISOString() },
      });
      if (metaErr) throw metaErr;
      await recordConsents(user.id, SIGNUP_CONSENTS);
      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), L('Bilgiler kaydedilemedi. Lütfen tekrar deneyin.', 'Could not save your details. Please try again.'));
      console.warn('complete-profile save failed', e?.message ?? e);
    } finally {
      setSaving(false);
    }
  };

  const leave = async () => {
    try {
      await signOut();
    } catch {}
    router.replace('/');
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BrandLogo size="md" glow />
            <Text style={styles.title}>{L('Profilini tamamla', 'Complete your profile')}</Text>
            <Text style={styles.subtitle}>
              {L('Devam etmeden önce birkaç bilgiye ihtiyacımız var.', 'We need a few details before you continue.')}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.input}>
              <User size={20} color={theme.primary} style={styles.icon} />
              <TextInput
                style={styles.inputText}
                placeholder={L('Ad Soyad', 'Full Name')}
                placeholderTextColor={theme.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.input}>
              <Calendar size={20} color={theme.primary} style={styles.icon} />
              <ComboBox
                options={ageOptions}
                selectedValue={age}
                onValueChange={(v) => setAge(String(v))}
                placeholder={L('Yaş Seçin', 'Select Age')}
              />
            </View>

            <Text style={styles.label}>{t.gender}</Text>
            <View style={styles.genderRow}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  onPress={() => setGender(g)}>
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                    {t[g as keyof typeof t] as string}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.input}>
              <Globe size={20} color={theme.primary} style={styles.icon} />
              <ComboBox
                options={countryOptions}
                selectedValue={country}
                onValueChange={(v) => {
                  setCountry(String(v));
                  setCity('');
                }}
                placeholder={L('Ülke Seçin', 'Select Country')}
              />
            </View>

            {cityOptions.length > 0 && (
              <View style={styles.input}>
                <MapPin size={20} color={theme.primary} style={styles.icon} />
                <ComboBox
                  options={cityOptions}
                  selectedValue={city}
                  onValueChange={(v) => setCity(String(v))}
                  placeholder={L('Şehir Seçin', 'Select City')}
                />
              </View>
            )}

            <RulesNotice />

            <ConsentChecklist
              items={consentItems}
              checked={consents}
              onToggle={(k) => setConsents((c) => ({ ...c, [k]: !c[k] }))}
            />

            <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{L('Devam et', 'Continue')}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={leave} style={styles.leave}>
              <Text style={styles.leaveText}>{L('Çıkış yap', 'Sign out')}</Text>
            </TouchableOpacity>
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
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 88 },
    header: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 14, textAlign: 'center' },
    subtitle: { fontSize: 15, color: '#FFFFFF', opacity: 0.9, marginTop: 6, textAlign: 'center' },
    card: { backgroundColor: t.cardBackground, borderRadius: 20, padding: 20 },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      minHeight: 52,
      marginBottom: 14,
    },
    icon: { marginRight: 10 },
    inputText: { flex: 1, fontSize: 16, color: t.text, paddingVertical: 12 },
    label: { fontSize: 14, fontWeight: '600', color: t.text, marginBottom: 8 },
    genderRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    genderBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
    },
    genderBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
    genderText: { fontSize: 15, color: t.text },
    genderTextActive: { color: '#FFFFFF', fontWeight: '600' },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 18 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginTop: 1,
    },
    checkboxOn: { backgroundColor: t.primary },
    checkText: { flex: 1, fontSize: 14, color: t.text, lineHeight: 20 },
    button: { backgroundColor: t.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    leave: { alignItems: 'center', marginTop: 16 },
    leaveText: { color: t.textSecondary, fontSize: 14 },
  });
