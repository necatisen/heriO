import { useState } from 'react';
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

export default function RegisterScreen() {
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
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [profilePhotoBase64, setProfilePhotoBase64] = useState<string | null>(null);

  const educationOptions = [
    { value: 'no_diploma', label: language === 'tr' ? 'Diploması Yok' : 'No Diploma' },
    { value: 'private_school', label: language === 'tr' ? 'Özel Okul' : 'Private School' },
    { value: 'currently_in_high_school', label: language === 'tr' ? 'Halen Lisede' : 'Currently in High School' },
    { value: 'associate_degree', label: language === 'tr' ? 'Ön Lisans' : 'Associate Degree' },
    { value: 'high_school_graduate', label: language === 'tr' ? 'Lise Mezunu' : 'High School Graduate' },
    { value: 'currently_in_university', label: language === 'tr' ? 'Halen Yüksek Okulda' : 'Currently in University' },
    { value: 'university_graduate', label: language === 'tr' ? 'Üniversite Mezunu' : 'University Graduate' },
    { value: 'masters_degree', label: language === 'tr' ? 'Yüksek Lisans' : 'Master\'s Degree' },
    { value: 'phd_doctorate', label: language === 'tr' ? 'PhD/Doktora' : 'PhD/Doctorate' },
  ];

  const bodyTypeOptions = [
    { value: 'slim', label: language === 'tr' ? 'İnce' : 'Slim' },
    { value: 'normal', label: language === 'tr' ? 'Normal' : 'Normal' },
    { value: 'athletic', label: language === 'tr' ? 'Atletik' : 'Athletic' },
    { value: 'chubby', label: language === 'tr' ? 'Tombul' : 'Chubby' },
  ];

  const childrenOptions = [
    { value: 'want_someday', label: language === 'tr' ? 'Bir Gün İstiyor' : 'Want Someday' },
    { value: 'dont_want', label: language === 'tr' ? 'İstemiyor' : "Don't Want" },
    { value: 'have', label: language === 'tr' ? 'Sahibim' : 'Have' },
    { value: 'want_more', label: language === 'tr' ? 'Daha Fazla İstiyorum' : 'Want More' },
    { value: 'dont_want_more', label: language === 'tr' ? 'Daha Fazla İstemiyorum' : "Don't Want More" },
  ];

  const smokingOptions = [
    { value: 'yes', label: language === 'tr' ? 'Evet' : 'Yes' },
    { value: 'no', label: language === 'tr' ? 'Hayır' : 'No' },
  ];

  const relationshipStatusOptions = [
    { value: 'single', label: language === 'tr' ? 'Bekar' : 'Single' },
    { value: 'married', label: language === 'tr' ? 'Evli' : 'Married' },
    { value: 'divorced', label: language === 'tr' ? 'Boşanmış' : 'Divorced' },
    { value: 'widowed', label: language === 'tr' ? 'Dul' : 'Widowed' },
    { value: 'complicated', label: language === 'tr' ? 'Karışık' : 'Complicated' },
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
        setError(language === 'tr' ? '18 yaşından küçüksünüz!' : 'You must be 18 or older!');
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

    if (
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.fullName ||
      !formData.username ||
      !formData.age ||
      !formData.country ||
      !formData.city ||
      !profilePhotoUri
    ) {
      setError(language === 'tr' ? 'Lütfen tüm zorunlu alanları ve en az bir fotoğraf ekleyin' : 'Please fill all required fields and add at least one photo');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError(language === 'tr' ? 'Şifre en az 6 karakter olmalıdır' : 'Password must be at least 6 characters');
      return;
    }

    const age = parseInt(formData.age);
    if (age < 18) {
      setError(language === 'tr' ? '18 yaşından küçüksünüz!' : 'You must be 18 or older!');
      return;
    }

    if (!validateUsername(formData.username)) {
      setError(language === 'tr' ? 'Lütfen geçerli bir kullanıcı adı kullanın (sahte isimler yok)' : 'Please use a valid username (no fake names)');
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
        preferred_language: language,
      });
      if (userId && profilePhotoUri) {
        const photoUrl = await uploadAvatarUri(userId, profilePhotoUri, 'avatar.jpg', profilePhotoBase64);
        await supabase.from('profiles').update({ profile_picture: photoUrl }).eq('id', userId);
        await supabase.from('photos').insert({ user_id: userId, photo_url: photoUrl });
      }
      setSuccess(language === 'tr' ? 'Hesabınız oluşturuldu! Yönlendiriliyorsunuz...' : 'Account created! Redirecting...');
      setTimeout(() => {
        router.replace('/onboarding');
      }, 800);
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        setError(language === 'tr' ? 'Bu e-posta adresi zaten kayıtlı' : 'This email is already registered');
      } else if (error.message?.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        setError(language === 'tr' ? 'Bu kullanıcı adı zaten kullanılıyor' : 'This username is already taken');
      } else if (error.message?.includes('Database error')) {
        setError(language === 'tr' ? 'Veritabanı hatası. Lütfen tekrar deneyin.' : 'Database error. Please try again.');
      } else {
        setError(error.message || error.error_description || (language === 'tr' ? 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.' : 'Registration failed. Please try again.'));
      }
    } finally {
      setLoading(false);
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
              {language === 'tr' ? 'Zorunlu alanlar' : 'Required'}
            </Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={async () => {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert('', language === 'tr' ? 'Fotoğraf seçmek için galeri izni gerekli.' : 'Gallery permission needed to pick a photo.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                  base64: true,
                });
                const asset = result.canceled ? null : result.assets?.[0];
                if (asset?.uri) {
                  setProfilePhotoUri(asset.uri);
                  setProfilePhotoBase64(asset.base64 ?? null);
                }
              }}>
              {profilePhotoUri ? (
                <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={40} color="#4A90E2" />
                  <Text style={styles.photoPlaceholderText}>
                    {language === 'tr' ? 'Profil fotoğrafı (zorunlu)' : 'Profile photo (required)'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <User size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.fullName}
                placeholderTextColor="#999999"
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.username}
                placeholderTextColor="#999999"
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text })
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.email}
                placeholderTextColor="#999999"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Calendar size={20} color="#4A90E2" style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowAgePicker(!showAgePicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.age && styles.pickerPlaceholder,
                  ]}>
                  {formData.age
                    ? `${formData.age} ${language === 'tr' ? 'yaş' : 'years old'}`
                    : (language === 'tr' ? 'Yaş Seçin' : 'Select Age')}
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
              <Ruler size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === 'tr' ? 'Boy (cm)' : 'Height (cm)'}
                placeholderTextColor="#999999"
                value={formData.height}
                onChangeText={(text) =>
                  setFormData({ ...formData, height: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Weight size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === 'tr' ? 'Kilo (kg)' : 'Weight (kg)'}
                placeholderTextColor="#999999"
                value={formData.weight}
                onChangeText={(text) =>
                  setFormData({ ...formData, weight: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color="#4A90E2" style={styles.inputIcon} />
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
                    : (language === 'tr' ? 'Ülke Seçin' : 'Select Country')}
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
            <User size={20} color="#4A90E2" style={styles.inputIcon} />
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
                  ? language === 'tr'
                    ? 'Önce ülke seçin'
                    : 'Select country first'
                  : language === 'tr'
                  ? 'Şehir Seçin'
                  : 'Select City'}
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
              {language === 'tr' ? 'İsteğe bağlı — sonra ekleyebilirsiniz' : 'Optional — you can add later'}
            </Text>
            <View style={styles.inputContainer}>
              <GraduationCap size={20} color="#4A90E2" style={styles.inputIcon} />
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
                    : (language === 'tr' ? 'Eğitim Durumu Seçin' : 'Select Education')}
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
              <Briefcase size={20} color="#4A90E2" style={styles.inputIcon} />
              <ComboBox
                options={professionOptions.map((opt) => ({
                  value: opt.value,
                  label: (opt.label as any)[language] || opt.label.en,
                }))}
                selectedValue={formData.profession}
                onValueChange={(value) => setFormData({ ...formData, profession: value as string })}
                placeholder={language === 'tr' ? 'Meslek Seçin' : 'Select Profession'}
              />
            </View>

            <View style={styles.inputContainer}>
              <Users size={20} color="#4A90E2" style={styles.inputIcon} />
              <ComboBox
                options={bodyTypeOptions}
                selectedValue={formData.bodyType}
                onValueChange={(value) => setFormData({ ...formData, bodyType: value as string })}
                placeholder={language === 'tr' ? 'Vücut Tipi Seçin' : 'Select Body Type'}
              />
            </View>

            <View style={styles.inputContainer}>
              <Baby size={20} color="#4A90E2" style={styles.inputIcon} />
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
                    : (language === 'tr' ? 'Çocuk Durumu Seçin' : 'Select Children Status')}
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
              <Cigarette size={20} color="#4A90E2" style={styles.inputIcon} />
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
                    : (language === 'tr' ? 'Sigara Alışkanlığı Seçin' : 'Select Smoking Habit')}
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
              <Cigarette size={20} color="#4A90E2" style={styles.inputIcon} />
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
                    : (language === 'tr' ? 'Alkol Tüketimi Seçin' : 'Select Alcohol Consumption')}
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
              <User size={20} color="#4A90E2" style={styles.inputIcon} />
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
                    : (language === 'tr' ? 'Din Seçin' : 'Select Religion')}
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
              <User size={20} color="#4A90E2" style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowRelationshipPicker(!showRelationshipPicker)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.relationshipStatus && styles.pickerPlaceholder,
                  ]}>
                  {formData.relationshipStatus
                    ? relationshipStatusOptions.find((opt) => opt.value === formData.relationshipStatus)?.label
                    : (language === 'tr' ? 'İlişki Durumu Seçin' : 'Select Relationship Status')}
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
              <Lock size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.password}
                placeholderTextColor="#999999"
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
              <Lock size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.confirmPassword}
                placeholderTextColor="#999999"
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
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
    borderColor: '#4A90E2',
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: '#4A90E2',
    marginTop: 8,
    textAlign: 'center',
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
  comboBoxContainer: {
    flex: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  cityTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 4,
  },
  placeholder: {
    color: '#999999',
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
    color: '#333333',
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#4A90E2',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
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
    color: '#666666',
  },
  loginLink: {
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
  pickerButton: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  pickerPlaceholder: {
    color: '#999999',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 16,
    marginHorizontal: 30,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#333333',
  },
  pickerOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});
