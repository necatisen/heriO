import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Save } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { religionOptions, alcoholConsumptionOptions, generateAgeOptions, getCitiesForCountry, countries } from '@/lib/constants';
import ComboBox from '@/components/ComboBox';
import { FullScreenModal } from '@/components/FullScreenModal';

import { L } from '@/lib/l10n';
type Profile = {
  full_name?: string | null;
  username?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  education?: string | null;
  profession?: string | null;
  smoking_habit?: string | null;
  body_type?: string | null;
  country?: string | null;
  city?: string | null;
  children_status?: string | null;
  alcohol_consumption?: string | null;
  religion?: string | null;
  relationship_status?: string | null;
  relationship_goal?: string | null;
};

type EditProfileModalProps = {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
  userId: string;
  onUpdate: () => void;
};

export default function EditProfileModal({
  visible,
  onClose,
  profile,
  userId,
  onUpdate,
}: EditProfileModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    age: '',
    gender: 'other',
    height: '',
    weight: '',
    education: '',
    profession: '',
    smoking_habit: '',
    body_type: '',
    country: '',
    city: '',
    children_status: '',
    alcohol_consumption: '',
    religion: '',
    relationship_status: '',
    relationship_goal: '',
  });
  const [loading, setLoading] = useState(false);
  const [showEducationPicker, setShowEducationPicker] = useState(false);
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [showSmokingPicker, setShowSmokingPicker] = useState(false);
  const [showBodyTypePicker, setShowBodyTypePicker] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showReligionPicker, setShowReligionPicker] = useState(false);
  const [showAlcoholPicker, setShowAlcoholPicker] = useState(false);
  const [showChildrenPicker, setShowChildrenPicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [showRelationshipGoalPicker, setShowRelationshipGoalPicker] = useState(false);

  const ageOptions = generateAgeOptions();

  const childrenOptions = [
    { value: 'want_someday', label: L('Bir Gün İstiyor', 'Want Someday') },
    { value: 'dont_want', label: L('İstemiyor', 'Don\'t Want') },
    { value: 'have', label: L('Sahibim', 'Have') },
    { value: 'want_more', label: L('Daha Fazla İstiyorum', 'Want More') },
    { value: 'dont_want_more', label: L('Daha Fazla İstemiyorum', 'Don\'t Want More') },
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

  const calculateAgeFromBirthDate = (birthDateStr: string | null | undefined): string => {
    if (!birthDateStr) return '';
    const d = new Date(birthDateStr);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 18 && age <= 100 ? String(age) : '';
  };

  const calculateBirthDateFromAge = (ageStr: string): string | null => {
    const age = parseInt(ageStr, 10);
    if (isNaN(age) || age < 18 || age > 100) return null;
    const today = new Date();
    const year = today.getFullYear() - age;
    return `${year}-01-01`;
  };

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

  const professionOptionsBase = [
    { value: 'academic', labelTr: 'Akademisyen / Öğretmen', labelEn: 'Academic / Teacher' },
    { value: 'artist', labelTr: 'Sanatçı', labelEn: 'Artist' },
    { value: 'construction', labelTr: 'İnşaat çalışanı', labelEn: 'Construction Worker' },
    { value: 'craftsman', labelTr: 'Usta / Zanaatkar', labelEn: 'Craftsman / Artisan' },
    { value: 'customer_service', labelTr: 'Müşteri hizmetleri', labelEn: 'Customer Service' },
    { value: 'data_analyst', labelTr: 'Veri analisti', labelEn: 'Data Analyst' },
    { value: 'designer', labelTr: 'Tasarımcı (UI/UX, Grafik)', labelEn: 'Designer (UI/UX, Graphic)' },
    { value: 'doctor', labelTr: 'Doktor / Sağlık çalışanı', labelEn: 'Doctor / Healthcare' },
    { value: 'entrepreneur', labelTr: 'Girişimci', labelEn: 'Entrepreneur' },
    { value: 'finance', labelTr: 'Finans / Bankacılık', labelEn: 'Finance / Banking' },
    { value: 'freelancer', labelTr: 'Freelancer / Serbest çalışan', labelEn: 'Freelancer' },
    { value: 'homemaker', labelTr: 'Ev hanımı / Ev yöneticisi', labelEn: 'Homemaker' },
    { value: 'hr', labelTr: 'İnsan kaynakları', labelEn: 'Human Resources' },
    { value: 'it_admin', labelTr: 'IT / Sistem yöneticisi', labelEn: 'IT / System Admin' },
    { value: 'lawyer', labelTr: 'Avukat / Hukuk', labelEn: 'Lawyer / Legal' },
    { value: 'manager', labelTr: 'Yönetici / Müdür', labelEn: 'Manager / Director' },
    { value: 'musician', labelTr: 'Müzisyen', labelEn: 'Musician' },
    { value: 'photographer', labelTr: 'Fotoğrafçı', labelEn: 'Photographer' },
    { value: 'researcher', labelTr: 'Araştırmacı', labelEn: 'Researcher' },
    { value: 'retired', labelTr: 'Emekli', labelEn: 'Retired' },
    { value: 'sales', labelTr: 'Satış / Pazarlama', labelEn: 'Sales / Marketing' },
    { value: 'self_employed', labelTr: 'Serbest meslek', labelEn: 'Self-employed' },
    { value: 'software_dev', labelTr: 'Yazılım geliştirici', labelEn: 'Software Developer' },
    { value: 'student', labelTr: 'Öğrenci', labelEn: 'Student' },
    { value: 'technician', labelTr: 'Teknisyen', labelEn: 'Technician' },
    { value: 'tourism', labelTr: 'Turizm / Otelcilik', labelEn: 'Tourism / Hospitality' },
    { value: 'tradesman', labelTr: 'Esnaf', labelEn: 'Tradesman' },
    { value: 'other', labelTr: 'Diğer', labelEn: 'Other' },
  ] as const;

  const professionOptions = [
    // "Çalışmıyor" seçeneğini başa sabitle
    { value: 'not_working', label: L('Çalışmıyor', 'Not Working') },
    // Diğerlerini ada göre alfabetik sırayla ekle
    ...[...professionOptionsBase].sort((a, b) => {
      const la = L(a.labelTr, a.labelEn).toLowerCase();
      const lb = L(b.labelTr, b.labelEn).toLowerCase();
      return la.localeCompare(lb);
    }).map((p) => ({
      value: p.value,
      label: L(p.labelTr, p.labelEn),
    })),
  ];

  const smokingOptions = [
    { value: 'yes', label: L('Evet', 'Yes') },
    { value: 'no', label: L('Hayır', 'No') },
    { value: 'sometimes', label: L('Bazen', 'Sometimes') },
    { value: 'social', label: L('Sosyal içici', 'Social smoker') },
    { value: 'trying_to_quit', label: L('Bırakmaya Çalışıyor', 'Trying to Quit') },
  ];

  const bodyTypeOptions = [
    { value: 'slim', label: L('İnce', 'Slim') },
    { value: 'average', label: L('Ortalama', 'Average') },
    { value: 'athletic', label: L('Atletik', 'Athletic') },
    { value: 'muscular', label: L('Kaslı', 'Muscular') },
    { value: 'curvy', label: L('Dolgun', 'Curvy') },
    { value: 'heavyset', label: L('İri Yapılı', 'Heavyset') },
  ];

  useEffect(() => {
    if (!visible || profile == null) return;
    const p = profile;
    setFormData({
      full_name: p.full_name ?? '',
      username: p.username ?? '',
      age: calculateAgeFromBirthDate(p.birth_date),
      gender: p.gender || 'other',
      height: p.height?.toString() || '',
      weight: p.weight?.toString() || '',
      education: p.education || '',
      profession: p.profession || '',
      smoking_habit: p.smoking_habit || '',
      body_type: p.body_type ?? '',
      country: p.country ?? '',
      city: p.city ?? '',
      children_status: p.children_status ?? '',
      alcohol_consumption: p.alcohol_consumption ?? '',
      religion: p.religion ?? '',
      relationship_status: p.relationship_status ?? '',
      relationship_goal: p.relationship_goal ?? '',
    });
  }, [visible, profile]);

  const getEducationLabel = (value: string) => {
    const option = educationOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const getProfessionLabel = (value: string) => {
    const option = professionOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const getSmokingLabel = (value: string) => {
    const option = smokingOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const getBodyTypeLabel = (value: string) => {
    const option = bodyTypeOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const updates: Record<string, unknown> = {
        full_name: formData.full_name?.trim() || null,
        username: formData.username?.trim() || null,
        gender: formData.gender || null,
        profession: formData.profession || null,
        education: formData.education || null,
        smoking_habit: formData.smoking_habit || null,
        body_type: formData.body_type || null,
        country: formData.country || null,
        city: formData.city || null,
        children_status: formData.children_status || null,
        alcohol_consumption: formData.alcohol_consumption || null,
        religion: formData.religion || null,
        relationship_status: formData.relationship_status || null,
        relationship_goal: formData.relationship_goal || null,
      };

      const birthDate = calculateBirthDateFromAge(formData.age);
      updates.birth_date = birthDate || null;

      if (formData.height) {
        const heightNum = parseInt(formData.height, 10);
        if (!isNaN(heightNum) && heightNum > 0 && heightNum < 300) {
          updates.height = heightNum;
        }
      } else {
        updates.height = null;
      }

      if (formData.weight) {
        const weightNum = parseInt(formData.weight, 10);
        if (!isNaN(weightNum) && weightNum > 0 && weightNum < 500) {
          updates.weight = weightNum;
        }
      } else {
        updates.weight = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      const message = L('Profil güncellendi', 'Profile updated');
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(L('Başarılı', 'Success'), message);
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const message = L('Profil güncellenirken hata oluştu', 'Error updating profile');

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(L('Hata', 'Error'), message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (visible && !profile) return null;

  return (
    <FullScreenModal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      overlayStyle={styles.modalOverlay}
      contentStyle={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}
    >
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {L('Profili Düzenle', 'Edit Profile')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Ad Soyad', 'Full name')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder={L('Ad Soyad', 'Full name')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Kullanıcı adı', 'Username')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text.replace(/\s/g, '') })}
                placeholder="@username"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Yaş', 'Age')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowAgePicker(!showAgePicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.age ? theme.text : theme.textSecondary }]}>
                  {formData.age
                    ? `${formData.age} ${L('yaş', 'years')}`
                    : (L('Yaş Seçin', 'Select Age'))}
                </Text>
              </TouchableOpacity>
              {showAgePicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {ageOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, { borderBottomColor: theme.border }, formData.age === option.value && { backgroundColor: theme.primary + '22' }]}
                        onPress={() => {
                          setFormData({ ...formData, age: option.value });
                          setShowAgePicker(false);
                        }}>
                        <Text style={[styles.pickerOptionText, { color: theme.text }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Cinsiyet', 'Gender')}
              </Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      { borderColor: theme.border },
                      formData.gender === g && { backgroundColor: theme.primary + '22', borderColor: theme.primary },
                    ]}
                    onPress={() => setFormData({ ...formData, gender: g })}>
                    <Text style={[styles.genderBtnText, { color: theme.text }, formData.gender === g && { color: theme.primary, fontWeight: '700' }]}>
                      {g === 'male' ? L('Erkek', 'Male') : g === 'female' ? L('Kadın', 'Female') : L('Diğer', 'Other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Boy (cm)', 'Height (cm)')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={formData.height}
                onChangeText={(text) => setFormData({ ...formData, height: text.replace(/[^0-9]/g, '') })}
                placeholder="170"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Kilo (kg)', 'Weight (kg)')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={formData.weight}
                onChangeText={(text) => setFormData({ ...formData, weight: text.replace(/[^0-9]/g, '') })}
                placeholder="70"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Eğitim Durumu', 'Education')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowEducationPicker(!showEducationPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.education ? theme.text : theme.textSecondary }]}>
                  {formData.education
                    ? getEducationLabel(formData.education)
                    : (L('Eğitim Durumu Seçin', 'Select Education'))}
                </Text>
              </TouchableOpacity>
              {showEducationPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {educationOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.border },
                          formData.education === option.value && { backgroundColor: theme.primaryLight || '#E8F4FF' },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, education: option.value });
                          setShowEducationPicker(false);
                        }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            formData.education === option.value && { color: theme.primary, fontWeight: '600' },
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Meslek', 'Profession')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowProfessionPicker(!showProfessionPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.profession ? theme.text : theme.textSecondary }]}>
                  {formData.profession
                    ? getProfessionLabel(formData.profession)
                    : (L('Meslek Seçin', 'Select Profession'))}
                </Text>
              </TouchableOpacity>
              {showProfessionPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {professionOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.border },
                          formData.profession === option.value && { backgroundColor: theme.primaryLight || '#E8F4FF' },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, profession: option.value });
                          setShowProfessionPicker(false);
                        }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            formData.profession === option.value && { color: theme.primary, fontWeight: '600' },
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Sigara', 'Smoking')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowSmokingPicker(!showSmokingPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.smoking_habit ? theme.text : theme.textSecondary }]}>
                  {formData.smoking_habit
                    ? getSmokingLabel(formData.smoking_habit)
                    : (L('Sigara Durumu Seçin', 'Select Smoking Status'))}
                </Text>
              </TouchableOpacity>
              {showSmokingPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {smokingOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.border },
                          formData.smoking_habit === option.value && { backgroundColor: theme.primaryLight || '#E8F4FF' },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, smoking_habit: option.value });
                          setShowSmokingPicker(false);
                        }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            formData.smoking_habit === option.value && { color: theme.primary, fontWeight: '600' },
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Vücut Tipi', 'Body Type')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowBodyTypePicker(!showBodyTypePicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.body_type ? theme.text : theme.textSecondary }]}>
                  {formData.body_type
                    ? getBodyTypeLabel(formData.body_type)
                    : (L('Vücut Tipi Seçin', 'Select Body Type'))}
                </Text>
              </TouchableOpacity>
              {showBodyTypePicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {bodyTypeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.border },
                          formData.body_type === option.value && { backgroundColor: theme.primaryLight || '#E8F4FF' },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, body_type: option.value });
                          setShowBodyTypePicker(false);
                        }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            formData.body_type === option.value && { color: theme.primary, fontWeight: '600' },
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Din', 'Religion')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowReligionPicker(!showReligionPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.religion ? theme.text : theme.textSecondary }]}>
                  {formData.religion
                    ? ((religionOptions.find((o) => o.value === formData.religion)?.label as { tr?: string; en?: string })?.tr && (religionOptions.find((o) => o.value === formData.religion)?.label as { tr?: string; en?: string })?.[language as 'tr' | 'en']) || (religionOptions.find((o) => o.value === formData.religion)?.label as { en?: string })?.en || formData.religion
                    : (L('Din Seçin', 'Select Religion'))}
                </Text>
              </TouchableOpacity>
              {showReligionPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {religionOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, { borderBottomColor: theme.border }, formData.religion === option.value && { backgroundColor: theme.primary + '22' }]}
                        onPress={() => {
                          setFormData({ ...formData, religion: option.value });
                          setShowReligionPicker(false);
                        }}>
                        <Text style={[styles.pickerOptionText, { color: theme.text }]}>
                          {(option.label as { tr?: string; en?: string })[language as 'tr' | 'en'] || (option.label as { en?: string }).en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Alkol', 'Alcohol')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowAlcoholPicker(!showAlcoholPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.alcohol_consumption ? theme.text : theme.textSecondary }]}>
                  {formData.alcohol_consumption
                    ? ((alcoholConsumptionOptions.find((o) => o.value === formData.alcohol_consumption)?.label as { tr?: string; en?: string })?.[language as 'tr' | 'en']) || (alcoholConsumptionOptions.find((o) => o.value === formData.alcohol_consumption)?.label as { en?: string })?.en || formData.alcohol_consumption
                    : (L('Alkol Seçin', 'Select Alcohol'))}
                </Text>
              </TouchableOpacity>
              {showAlcoholPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {alcoholConsumptionOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, { borderBottomColor: theme.border }, formData.alcohol_consumption === option.value && { backgroundColor: theme.primary + '22' }]}
                        onPress={() => {
                          setFormData({ ...formData, alcohol_consumption: option.value });
                          setShowAlcoholPicker(false);
                        }}>
                        <Text style={[styles.pickerOptionText, { color: theme.text }]}>
                          {(option.label as { tr?: string; en?: string })[language as 'tr' | 'en'] || (option.label as { en?: string }).en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Çocuk Durumu', 'Children')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowChildrenPicker(!showChildrenPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.children_status ? theme.text : theme.textSecondary }]}>
                  {formData.children_status
                    ? (childrenOptions.find((o) => o.value === formData.children_status)?.label ?? formData.children_status)
                    : (L('Çocuk Durumu Seçin', 'Select Children Status'))}
                </Text>
              </TouchableOpacity>
              {showChildrenPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {childrenOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, { borderBottomColor: theme.border }, formData.children_status === option.value && { backgroundColor: theme.primary + '22' }]}
                        onPress={() => {
                          setFormData({ ...formData, children_status: option.value });
                          setShowChildrenPicker(false);
                        }}>
                        <Text style={[styles.pickerOptionText, { color: theme.text }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('İlişki Durumu', 'Relationship Status')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setShowRelationshipGoalPicker(false);
                  setShowRelationshipPicker(!showRelationshipPicker);
                }}>
                <Text style={[styles.pickerButtonText, { color: formData.relationship_status ? theme.text : theme.textSecondary }]}>
                  {formData.relationship_status
                    ? (relationshipStatusOptions.find((o) => o.value === formData.relationship_status)?.label ?? formData.relationship_status)
                    : (L('İlişki Durumu Seçin', 'Select Relationship Status'))}
                </Text>
              </TouchableOpacity>
              {showRelationshipPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {relationshipStatusOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, { borderBottomColor: theme.border }, formData.relationship_status === option.value && { backgroundColor: theme.primary + '22' }]}
                        onPress={() => {
                          setFormData({ ...formData, relationship_status: option.value });
                          setShowRelationshipPicker(false);
                        }}>
                        <Text style={[styles.pickerOptionText, { color: theme.text }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('İlişki Arayışı', 'Relationship Goal')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setShowRelationshipPicker(false);
                  setShowRelationshipGoalPicker(!showRelationshipGoalPicker);
                }}>
                <Text style={[styles.pickerButtonText, { color: formData.relationship_goal ? theme.text : theme.textSecondary }]}>
                  {formData.relationship_goal
                    ? (relationshipGoalOptions.find((o) => o.value === formData.relationship_goal)?.label ?? formData.relationship_goal)
                    : (L('İlişki Arayışı Seçin', 'Select Relationship Goal'))}
                </Text>
              </TouchableOpacity>
              {showRelationshipGoalPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {relationshipGoalOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, { borderBottomColor: theme.border }, formData.relationship_goal === option.value && { backgroundColor: theme.primary + '22' }]}
                        onPress={() => {
                          setFormData({ ...formData, relationship_goal: option.value });
                          setShowRelationshipPicker(false);
                        }}>
                        <Text style={[styles.pickerOptionText, { color: theme.text }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Ülke', 'Country')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowCountryPicker((prev) => !prev)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    { color: formData.country ? theme.text : theme.textSecondary },
                  ]}>
                  {formData.country
                    ? ((countries.find((opt) => opt.value === formData.country)?.label as any)?.[language] ||
                        countries.find((opt) => opt.value === formData.country)?.label.en)
                    : L('Ülke Seçin', 'Select Country')}
                </Text>
              </TouchableOpacity>
              {showCountryPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {countries.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.border },
                          formData.country === option.value && { backgroundColor: theme.primaryLight || '#E8F4FF' },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, country: option.value, city: '' });
                          setShowCountryPicker(false);
                        }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            formData.country === option.value && { color: theme.primary, fontWeight: '600' },
                          ]}>
                          {(option.label as any)[language] || option.label.en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {L('Şehir', 'City')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  if (!formData.country) return;
                  setShowCityPicker((prev) => !prev);
                }}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    { color: formData.city ? theme.text : theme.textSecondary },
                  ]}>
                  {formData.city
                    ? formData.city
                    : !formData.country
                    ? L('Önce ülke seçin', 'Select country first')
                    : L('Şehir Seçin', 'Select City')}
                </Text>
              </TouchableOpacity>
              {showCityPicker && getCitiesForCountry(formData.country).length > 0 && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {getCitiesForCountry(formData.country).map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.border },
                          formData.city === city && { backgroundColor: theme.primaryLight || '#E8F4FF' },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, city });
                          setShowCityPicker(false);
                        }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            formData.city === city && { color: theme.primary, fontWeight: '600' },
                          ]}>
                          {city}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>

          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor: theme.border,
                paddingBottom: Math.max(20, insets.bottom + 16),
              },
            ]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={onClose}
              disabled={loading}>
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>
                {L('İptal', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={loading}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {loading ? (L('Kaydediliyor...', 'Saving...')) : (L('Kaydet', 'Save'))}
              </Text>
            </TouchableOpacity>
          </View>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  pickerButton: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerContainer: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnText: {
    fontSize: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
