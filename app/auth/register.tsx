import { useState, useRef, useMemo } from 'react';
import { useTheme , type Theme } from '@/contexts/ThemeContext';
import { authErrorMessage } from '@/lib/authErrors';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  MessageCircle,
  Mail,
  Lock,
  ArrowLeft,
  User,
  Calendar,
  Eye,
  EyeOff,
  Ruler,
  Weight,
  GraduationCap,
  Briefcase,
  Users,
  Baby,
  Cigarette,
  Camera,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadAvatarUri } from '@/lib/uploadAvatar';
import { savePendingAvatar } from '@/lib/pendingAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  religionOptions,
  professionOptions,
  alcoholConsumptionOptions,
  countries,
  generateAgeOptions,
  getCitiesForCountry,
} from '@/lib/constants';
import ComboBox from '@/components/ComboBox';
import { ConsentChecklist, signupConsentItems, allChecked } from '@/components/ConsentChecklist';
import RulesNotice from '@/components/RulesNotice';
import type { ConsentType } from '@/lib/consents';

import { L } from '@/lib/l10n';
export default function RegisterScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { signUp } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    age: '',
    birthDate: '',
    gender: 'male',
    height: '',
    weight: '',
    country: '',
    city: '',
    education: '',
    profession: '',
    bodyType: '',
    childrenStatus: '',
    smokingHabit: '',
    alcoholConsumption: '',
    religion: '',
    relationshipStatus: '',
    relationshipGoal: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1));
  const [showEducationPicker, setShowEducationPicker] = useState(false);
  const [showChildrenPicker, setShowChildrenPicker] = useState(false);
  const [showSmokingPicker, setShowSmokingPicker] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showAlcoholPicker, setShowAlcoholPicker] = useState(false);
  const [showReligionPicker, setShowReligionPicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [showRelationshipGoalPicker, setShowRelationshipGoalPicker] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [consents, setConsents] = useState<Partial<Record<ConsentType, boolean>>>({});
  const consentItems = useMemo(() => signupConsentItems(), [language]);

  const scrollRef = useRef<ScrollView | null>(null);
  const fullNameRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);

  const educationOptions = [
    { value: 'no_diploma', label: L('Diploması Yok', 'No Diploma') },
    { value: 'private_school', label: L('Özel Okul', 'Private School') },
    { value: 'currently_in_high_school', label: L('Halen Lisede', 'Currently in High School') },
    { value: 'associate_degree', label: L('Ön Lisans', 'Associate Degree') },
    { value: 'high_school_graduate', label: L('Lise Mezunu', 'High School Graduate') },
    { value: 'currently_in_university', label: L('Halen Yüksek Okulda', 'Currently in University') },
    { value: 'university_graduate', label: L('Üniversite Mezunu', 'University Graduate') },
    { value: 'masters_degree', label: L('Yüksek Lisans', 'Master\'s Degree') },
    { value: 'phd_doctorate', label: L('PhD/Doktora', 'PhD/Doctorate') },
  ];

  const bodyTypeOptions = [
    { value: 'slim', label: L('İnce', 'Slim') },
    { value: 'normal', label: L('Normal', 'Normal') },
    { value: 'athletic', label: L('Atletik', 'Athletic') },
    { value: 'chubby', label: L('Tombul', 'Chubby') },
  ];

  const childrenOptions = [
    { value: 'want_someday', label: L('Bir Gün İstiyor', 'Want Someday') },
    { value: 'dont_want', label: L('İstemiyor', 'Don\'t Want') },
    { value: 'have', label: L('Sahibim', 'Have') },
    { value: 'want_more', label: L('Daha Fazla İstiyorum', 'Want More') },
    { value: 'dont_want_more', label: L('Daha Fazla İstemiyorum', 'Don\'t Want More') },
  ];

  const smokingOptions = [
    { value: 'yes', label: L('Evet', 'Yes') },
    { value: 'no', label: L('Hayır', 'No') },
  ];

  const relationshipStatusOptions = [
    { value: 'single', label: L('Bekar', 'Single') },
    { value: 'married', label: L('Evli', 'Married') },
    { value: 'divorced', label: L('Boşanmış', 'Divorced') },
    { value: 'widowed', label: L('Dul', 'Widowed') },
  ];

  const relationshipGoalOptions = [
    {
      value: 'serious_long_term',
      label:
        L('Ciddi ilişki / uzun vadeli partner', 'Serious relationship / long-term partner'),
    },
    {
      value: 'marriage_focused',
      label: L('Evlilik odaklı', 'Marriage focused'),
    },
    {
      value: 'slow_getting_to_know',
      label:
        L('Yavaş ilerleyen (önce tanışma)', 'Slow pace (get to know first)'),
    },
    {
      value: 'short_term_casual',
      label: L('Kısa süreli / casual', 'Short-term / casual'),
    },
    {
      value: 'exploring',
      label:
        L('Belirsiz / keşif aşamasında', 'Unsure / exploring'),
    },
    {
      value: 'go_with_flow',
      label:
        L('Akışına bırak', 'Go with the flow'),
    },
    {
      value: 'friendship',
      label: L('Arkadaşlık', 'Friendship'),
    },
    {
      value: 'relaxed',
      label: L('Rahat bir şeyler', 'Something relaxed'),
    },
  ];

  const ageOptions = generateAgeOptions();

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age--;
    }
    return age;
  };

  const formatDateForDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForDB = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const parseDateString = (dateStr: string): Date | null => {
    const parts = dateStr.split(/[-./]/);
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > new Date().getFullYear()) return null;

    return new Date(year, month, day);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const age = calculateAge(selectedDate);
      if (age < 18) {
        setError(L('18 yaşından küçüksünüz!', 'You must be 18 or older!'));
        return;
      }
      setError('');
      setSelectedDate(selectedDate);
      setFormData({ ...formData, birthDate: formatDateForDisplay(selectedDate) });
    }
  };

  const validateUsername = (username: string) => {
    const fakeUsernames = [
      'test',
      'admin',
      'user',
      'fake',
      'demo',
      '12345',
      'qwerty',
    ];
    const lowerUsername = username.toLowerCase();
    return !fakeUsernames.some((fake) => lowerUsername.includes(fake));
  };

  const calculateBirthDateFromAge = (age: number): string => {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    return `${birthYear}-01-01`;
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');

    if (!profilePhotoUri) {
      setError(
        L('Profil fotoğrafını boş geçemezsiniz. Lütfen bir profil fotoğrafı ekleyin.', 'You cannot leave the profile photo empty. Please add a profile photo.')
      );
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (!formData.fullName.trim()) {
      setError(
        L('Ad Soyad alanını boş geçemezsiniz.', 'You cannot leave the full name field empty.')
      );
      fullNameRef.current?.focus();
      return;
    }

    if (!formData.username.trim()) {
      setError(
        L('Kullanıcı adı alanını boş geçemezsiniz.', 'You cannot leave the username field empty.')
      );
      usernameRef.current?.focus();
      return;
    }

    if (!formData.email.trim()) {
      setError(
        L('E-posta alanını boş geçemezsiniz.', 'You cannot leave the email field empty.')
      );
      emailRef.current?.focus();
      return;
    }

    if (!formData.age) {
      setError(
        L('Yaş alanını boş geçemezsiniz.', 'You cannot leave the age field empty.')
      );
      setShowAgePicker(true);
      return;
    }

    if (!formData.country) {
      setError(
        L('Ülke alanını boş geçemezsiniz.', 'You cannot leave the country field empty.')
      );
      setShowCountryPicker(true);
      return;
    }

    if (!formData.city) {
      setError(
        L('Şehir alanını boş geçemezsiniz.', 'You cannot leave the city field empty.')
      );
      setShowCityPicker(true);
      return;
    }

    if (!formData.password) {
      setError(
        L('Şifre alanını boş geçemezsiniz.', 'You cannot leave the password field empty.')
      );
      passwordRef.current?.focus();
      return;
    }

    if (!formData.confirmPassword) {
      setError(
        L('Şifre tekrar alanını boş geçemezsiniz.', 'You cannot leave the confirm password field empty.')
      );
      confirmPasswordRef.current?.focus();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(L('Şifreler eşleşmiyor', 'Passwords do not match'));
      return;
    }

    if (formData.password.length < 6) {
      setError(L('Şifre en az 6 karakter olmalıdır', 'Password must be at least 6 characters'));
      return;
    }

    const age = parseInt(formData.age);
    if (age < 18) {
      setError(L('18 yaşından küçüksünüz!', 'You must be 18 or older!'));
      return;
    }

    if (!validateUsername(formData.username)) {
      setError(L('Lütfen geçerli bir kullanıcı adı kullanın (sahte isimler yok)', 'Please use a valid username (no fake names)'));
      return;
    }

    if (!allChecked(consentItems, consents)) {
      setError(L('Devam etmek için tüm onay kutularını işaretleyin.', 'Tick all the boxes to continue.'));
      return;
    }

    try {
      setLoading(true);
      const userId = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        username: formData.username,
        birth_date: calculateBirthDateFromAge(age),
        gender: formData.gender,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseInt(formData.weight) : null,
        country: formData.country,
        city: formData.city || null,
        education: formData.education || null,
        profession: formData.profession || null,
        body_type: formData.bodyType || null,
        children_status: formData.childrenStatus || null,
        smoking_habit: formData.smokingHabit || null,
        alcohol_consumption: formData.alcoholConsumption || null,
        religion: formData.religion || null,
        relationship_status: formData.relationshipStatus || null,
        relationship_goal: formData.relationshipGoal || null,
        preferred_language: language,
      });
      // The account already exists at this point, so a photo failure must not
      // leave the user stuck on the register screen with a raw error.
      // With "Confirm email" on, sign-up returns no session: the user must confirm first.
      const {
        data: { session: newSession },
      } = await supabase.auth.getSession();
      if (!newSession) {
        if (userId && profilePhotoUri) {
          try {
            await savePendingAvatar(userId, profilePhotoUri);
          } catch (e) {
            console.error('Could not keep sign-up photo:', e);
          }
        }
        Alert.alert(
          L('E-postanızı onaylayın', 'Confirm your email'),
          L(
            '{0} adresine bir onay bağlantısı gönderdik. Bağlantıya dokunup hesabınızı onaylayın, ardından giriş yapın. Profil fotoğrafınız ilk girişte otomatik eklenecek.',
            'We sent a confirmation link to {0}. Tap it to confirm your account, then sign in. Your profile photo will be added automatically on your first sign-in.',
            [formData.email]
          ),
          [{ text: L('Tamam', 'OK'), onPress: () => router.replace('/auth/login') }]
        );
        return;
      }

      let photoFailed = false;
      if (userId && profilePhotoUri) {
        try {
          const photoUrl = await uploadAvatarUri(userId, profilePhotoUri, 'avatar.jpg');
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ profile_picture: photoUrl })
            .eq('id', userId);
          if (profileErr) throw profileErr;
          await supabase.from('photos').insert({ user_id: userId, photo_url: photoUrl });
        } catch (photoError) {
          console.error('Profile photo upload failed:', photoError);
          photoFailed = true;
        }
      }
      if (photoFailed) {
        Alert.alert(
          L('Fotoğraf yüklenemedi', 'Photo upload failed'),
          L('Hesabınız oluşturuldu ancak profil fotoğrafınız yüklenemedi. Profil sayfasından tekrar ekleyebilirsiniz.', 'Your account was created but the profile photo could not be uploaded. You can add it again from your profile.')
        );
      }
      setSuccess(L('Hesabınız oluşturuldu! Yönlendiriliyorsunuz...', 'Account created! Redirecting...'));
      setTimeout(() => {
        router.replace('/onboarding');
      }, 800);
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        setError(L('Bu e-posta adresi zaten kayıtlı', 'This email is already registered'));
      } else if (error.message?.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        setError(L('Bu kullanıcı adı zaten kullanılıyor', 'This username is already taken'));
      } else if (error.message?.includes('Database error')) {
        setError(L('Veritabanı hatası. Lütfen tekrar deneyin.', 'Database error. Please try again.'));
      } else {
        setError(error.message ? authErrorMessage(error.message) : L('Kayıt oluşturulamadı. Lütfen tekrar deneyin.', 'Registration failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <MessageCircle size={64} color="#FFFFFF" />
            <Text style={styles.title}>{t.register}</Text>
            <Text style={styles.subtitle}>{t.welcomeMessage}</Text>
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

            <Text style={styles.sectionLabel}>
              {L('Zorunlu alanlar', 'Required')}
            </Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={async () => {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert('', L('Fotoğraf seçmek için galeri izni gerekli.', 'Gallery permission needed to pick a photo.'));
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                const asset = result.canceled ? null : result.assets?.[0];
                if (asset?.uri) {
                  setProfilePhotoUri(asset.uri);
                }
              }}>
              {profilePhotoUri ? (
                <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={40} color={theme.primary} />
                  <Text style={styles.photoPlaceholderText}>
                    {L('Profil fotoğrafı (zorunlu)', 'Profile photo (required)')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <User size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.fullName}
                placeholderTextColor={theme.textSecondary}
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.username}
                placeholderTextColor={theme.textSecondary}
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text })
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.email}
                placeholderTextColor={theme.textSecondary}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Calendar size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowAgePicker(!showAgePicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.age && styles.pickerPlaceholder,
                  ]}>
                  {formData.age
                    ? `${formData.age} ${L('yaş', 'years old')}`
                    : (L('Yaş Seçin', 'Select Age'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showAgePicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {ageOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.age === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, age: option.value });
                        setShowAgePicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.age === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>{t.gender}:</Text>
              <View style={styles.genderButtons}>
                {['male', 'female', 'other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      formData.gender === g && styles.genderButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, gender: g })}>
                    <Text
                      style={[
                        styles.genderButtonText,
                        formData.gender === g && styles.genderButtonTextActive,
                      ]}>
                      {t[g as keyof typeof t] as string}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Ruler size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={L('Boy (cm)', 'Height (cm)')}
                placeholderTextColor={theme.textSecondary}
                value={formData.height}
                onChangeText={(text) =>
                  setFormData({ ...formData, height: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Weight size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={L('Kilo (kg)', 'Weight (kg)')}
                placeholderTextColor={theme.textSecondary}
                value={formData.weight}
                onChangeText={(text) =>
                  setFormData({ ...formData, weight: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCountryPicker(!showCountryPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.country && styles.pickerPlaceholder,
                  ]}>
                  {formData.country
                    ? (countries.find((opt) => opt.value === formData.country)?.label as any)?.[language] || countries.find((opt) => opt.value === formData.country)?.label.en
                    : (L('Ülke Seçin', 'Select Country'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showCountryPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {countries.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.country === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, country: option.value, city: '' });
                        setShowCountryPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.country === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {(option.label as any)[language] || option.label.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

          <View style={styles.inputContainer}>
            <User size={20} color={theme.primary} style={styles.inputIcon} />
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                if (!formData.country) return;
                setShowCityPicker(!showCityPicker);
              }}>
              <Text
                style={[
                  styles.pickerButtonText,
                  !formData.city && styles.pickerPlaceholder,
                ]}>
                {formData.city
                  ? formData.city
                  : !formData.country
                  ? L('Önce ülke seçin', 'Select country first')
                  : L('Şehir Seçin', 'Select City')}
              </Text>
            </TouchableOpacity>
          </View>
          {showCityPicker && getCitiesForCountry(formData.country).length > 0 && (
            <View style={styles.pickerContainer}>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {getCitiesForCountry(formData.country).map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.pickerOption,
                      formData.city === city && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, city });
                      setShowCityPicker(false);
                    }}>
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.city === city && styles.pickerOptionTextSelected,
                      ]}>
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
              {L('İsteğe bağlı — sonra ekleyebilirsiniz', 'Optional — you can add later')}
            </Text>
            <View style={styles.inputContainer}>
              <GraduationCap size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowEducationPicker(!showEducationPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.education && styles.pickerPlaceholder,
                  ]}>
                  {formData.education
                    ? educationOptions.find((opt) => opt.value === formData.education)?.label
                    : (L('Eğitim Durumu Seçin', 'Select Education'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showEducationPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {educationOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.education === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, education: option.value });
                        setShowEducationPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.education === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Briefcase size={20} color={theme.primary} style={styles.inputIcon} />
              <ComboBox
                options={professionOptions.map((opt) => ({
                  value: opt.value,
                  label: (opt.label as any)[language] || opt.label.en,
                }))}
                selectedValue={formData.profession}
                onValueChange={(value) => setFormData({ ...formData, profession: value as string })}
                placeholder={L('Meslek Seçin', 'Select Profession')}
              />
            </View>

            <View style={styles.inputContainer}>
              <Users size={20} color={theme.primary} style={styles.inputIcon} />
              <ComboBox
                options={bodyTypeOptions}
                selectedValue={formData.bodyType}
                onValueChange={(value) => setFormData({ ...formData, bodyType: value as string })}
                placeholder={L('Vücut Tipi Seçin', 'Select Body Type')}
              />
            </View>

            <View style={styles.inputContainer}>
              <Baby size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowChildrenPicker(!showChildrenPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.childrenStatus && styles.pickerPlaceholder,
                  ]}>
                  {formData.childrenStatus
                    ? childrenOptions.find((opt) => opt.value === formData.childrenStatus)?.label
                    : (L('Çocuk Durumu Seçin', 'Select Children Status'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showChildrenPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {childrenOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.childrenStatus === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, childrenStatus: option.value });
                        setShowChildrenPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.childrenStatus === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Cigarette size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowSmokingPicker(!showSmokingPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.smokingHabit && styles.pickerPlaceholder,
                  ]}>
                  {formData.smokingHabit
                    ? smokingOptions.find((opt) => opt.value === formData.smokingHabit)?.label
                    : (L('Sigara Alışkanlığı Seçin', 'Select Smoking Habit'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showSmokingPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {smokingOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.smokingHabit === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, smokingHabit: option.value });
                        setShowSmokingPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.smokingHabit === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Cigarette size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowAlcoholPicker(!showAlcoholPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.alcoholConsumption && styles.pickerPlaceholder,
                  ]}>
                  {formData.alcoholConsumption
                    ? (alcoholConsumptionOptions.find((opt) => opt.value === formData.alcoholConsumption)?.label as any)?.[language] || alcoholConsumptionOptions.find((opt) => opt.value === formData.alcoholConsumption)?.label.en
                    : (L('Alkol Tüketimi Seçin', 'Select Alcohol Consumption'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showAlcoholPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {alcoholConsumptionOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.alcoholConsumption === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, alcoholConsumption: option.value });
                        setShowAlcoholPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.alcoholConsumption === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {(option.label as any)[language] || option.label.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <User size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowReligionPicker(!showReligionPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.religion && styles.pickerPlaceholder,
                  ]}>
                  {formData.religion
                    ? (religionOptions.find((opt) => opt.value === formData.religion)?.label as any)?.[language] || religionOptions.find((opt) => opt.value === formData.religion)?.label.en
                    : (L('Din Seçin', 'Select Religion'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showReligionPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {religionOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.religion === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, religion: option.value });
                        setShowReligionPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.religion === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {(option.label as any)[language] || option.label.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <User size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setShowRelationshipGoalPicker(false);
                  setShowRelationshipPicker(!showRelationshipPicker);
                }}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.relationshipStatus && styles.pickerPlaceholder,
                  ]}>
                  {formData.relationshipStatus
                    ? relationshipStatusOptions.find((opt) => opt.value === formData.relationshipStatus)?.label
                    : (L('İlişki Durumu Seçin', 'Select Relationship Status'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showRelationshipPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {relationshipStatusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.relationshipStatus === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, relationshipStatus: option.value });
                        setShowRelationshipPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.relationshipStatus === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <User size={20} color={theme.primary} style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setShowRelationshipPicker(false);
                  setShowRelationshipGoalPicker(!showRelationshipGoalPicker);
                }}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.relationshipGoal && styles.pickerPlaceholder,
                  ]}>
                  {formData.relationshipGoal
                    ? relationshipGoalOptions.find((opt) => opt.value === formData.relationshipGoal)?.label
                    : (L('İlişki Arayışı Seçin', 'Select Relationship Goal'))}
                </Text>
              </TouchableOpacity>
            </View>
            {showRelationshipGoalPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {relationshipGoalOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        formData.relationshipGoal === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, relationshipGoal: option.value });
                      }}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.relationshipGoal === option.value && styles.pickerOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.password}
                placeholderTextColor={theme.textSecondary}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
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

            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.confirmPassword}
                placeholderTextColor={theme.textSecondary}
                value={formData.confirmPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, confirmPassword: text })
                }
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#999999" />
                ) : (
                  <Eye size={20} color="#999999" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.ageWarning}>{t.ageVerification}</Text>

            <RulesNotice />

            <ConsentChecklist
              items={consentItems}
              checked={consents}
              onToggle={(k) => setConsents((c) => ({ ...c, [k]: !c[k] }))}
            />

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}>
              <Text style={styles.registerButtonText}>
                {loading ? 'Loading...' : t.register}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t.alreadyHaveAccount} </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginLink}>{t.login}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
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
    paddingBottom: 88, // clears the Android navigation bar
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
  },
  formContainer: {
    backgroundColor: t.cardBackground,
    borderRadius: 30,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: t.primary,
    marginBottom: 12,
  },
  photoButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: t.primary,
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: t.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.inputBackground,
    borderRadius: 15,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  comboBoxContainer: {
    flex: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: t.text,
  },
  cityTextInput: {
    flex: 1,
    fontSize: 16,
    color: t.text,
    paddingVertical: 4,
  },
  placeholder: {
    color: t.textSecondary,
  },
  calendarButton: {
    padding: 10,
    marginLeft: 4,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: t.text,
    marginBottom: 12,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: t.inputBackground,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: t.primary,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textSecondary,
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  ageWarning: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 16,
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: t.primary,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: t.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: t.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: t.primary,
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
  pickerButton: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: t.text,
  },
  pickerPlaceholder: {
    color: t.textSecondary,
  },
  pickerContainer: {
    backgroundColor: t.cardBackground,
    borderRadius: 15,
    marginBottom: 16,
    marginHorizontal: 30,
    borderWidth: 1,
    borderColor: t.border,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  pickerScroll: {
    maxHeight: 250,
  },
  pickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionSelected: {
    backgroundColor: '#E8F4FF',
  },
  pickerOptionText: {
    fontSize: 15,
    color: t.text,
  },
  pickerOptionTextSelected: {
    color: t.primary,
    fontWeight: '600',
  },
});
