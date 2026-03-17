import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { X, Save } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { religionOptions, alcoholConsumptionOptions, generateAgeOptions, getCitiesForCountry, countries } from '@/lib/constants';
import ComboBox from '@/components/ComboBox';

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

  const ageOptions = generateAgeOptions();

  const childrenOptions = [
    { value: 'want_someday', label: language === 'tr' ? 'Bir Gün İstiyor' : 'Want Someday' },
    { value: 'dont_want', label: language === 'tr' ? 'İstemiyor' : "Don't Want" },
    { value: 'have', label: language === 'tr' ? 'Sahibim' : 'Have' },
    { value: 'want_more', label: language === 'tr' ? 'Daha Fazla İstiyorum' : 'Want More' },
    { value: 'dont_want_more', label: language === 'tr' ? 'Daha Fazla İstemiyorum' : "Don't Want More" },
  ];

  const relationshipStatusOptions = [
    { value: 'single', label: language === 'tr' ? 'Bekar' : 'Single' },
    { value: 'married', label: language === 'tr' ? 'Evli' : 'Married' },
    { value: 'divorced', label: language === 'tr' ? 'Boşanmış' : 'Divorced' },
    { value: 'widowed', label: language === 'tr' ? 'Dul' : 'Widowed' },
    { value: 'complicated', label: language === 'tr' ? 'Karışık' : 'Complicated' },
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

  const professionOptions = [
    { value: 'student', label: language === 'tr' ? 'Öğrenci' : 'Student' },
    { value: 'academic', label: language === 'tr' ? 'Akademisyen / Öğretmen' : 'Academic / Teacher' },
    { value: 'researcher', label: language === 'tr' ? 'Araştırmacı' : 'Researcher' },
    { value: 'engineer', label: language === 'tr' ? 'Mühendis' : 'Engineer' },
    { value: 'doctor', label: language === 'tr' ? 'Doktor / Sağlık çalışanı' : 'Doctor / Healthcare' },
    { value: 'lawyer', label: language === 'tr' ? 'Avukat / Hukuk' : 'Lawyer / Legal' },
    { value: 'finance', label: language === 'tr' ? 'Finans / Bankacılık' : 'Finance / Banking' },
    { value: 'manager', label: language === 'tr' ? 'Yönetici / Müdür' : 'Manager / Director' },
    { value: 'hr', label: language === 'tr' ? 'İnsan kaynakları' : 'Human Resources' },
    { value: 'software_dev', label: language === 'tr' ? 'Yazılım geliştirici' : 'Software Developer' },
    { value: 'it_admin', label: language === 'tr' ? 'IT / Sistem yöneticisi' : 'IT / System Admin' },
    { value: 'data_analyst', label: language === 'tr' ? 'Veri analisti' : 'Data Analyst' },
    { value: 'designer', label: language === 'tr' ? 'Tasarımcı (UI/UX, Grafik)' : 'Designer (UI/UX, Graphic)' },
    { value: 'sales', label: language === 'tr' ? 'Satış / Pazarlama' : 'Sales / Marketing' },
    { value: 'entrepreneur', label: language === 'tr' ? 'Girişimci' : 'Entrepreneur' },
    { value: 'tradesman', label: language === 'tr' ? 'Esnaf' : 'Tradesman' },
    { value: 'tourism', label: language === 'tr' ? 'Turizm / Otelcilik' : 'Tourism / Hospitality' },
    { value: 'customer_service', label: language === 'tr' ? 'Müşteri hizmetleri' : 'Customer Service' },
    { value: 'artist', label: language === 'tr' ? 'Sanatçı' : 'Artist' },
    { value: 'photographer', label: language === 'tr' ? 'Fotoğrafçı' : 'Photographer' },
    { value: 'writer', label: language === 'tr' ? 'Yazar / İçerik üreticisi' : 'Writer / Content Creator' },
    { value: 'musician', label: language === 'tr' ? 'Müzisyen' : 'Musician' },
    { value: 'technician', label: language === 'tr' ? 'Teknisyen' : 'Technician' },
    { value: 'craftsman', label: language === 'tr' ? 'Usta / Zanaatkar' : 'Craftsman / Artisan' },
    { value: 'construction', label: language === 'tr' ? 'İnşaat çalışanı' : 'Construction Worker' },
    { value: 'freelancer', label: language === 'tr' ? 'Freelancer / Serbest çalışan' : 'Freelancer' },
    { value: 'self_employed', label: language === 'tr' ? 'Serbest meslek' : 'Self-employed' },
    { value: 'not_working', label: language === 'tr' ? 'Çalışmıyor' : 'Not Working' },
    { value: 'retired', label: language === 'tr' ? 'Emekli' : 'Retired' },
    { value: 'homemaker', label: language === 'tr' ? 'Ev hanımı / Ev yöneticisi' : 'Homemaker' },
    { value: 'other', label: language === 'tr' ? 'Diğer' : 'Other' },
  ];

  const smokingOptions = [
    { value: 'yes', label: language === 'tr' ? 'Evet' : 'Yes' },
    { value: 'no', label: language === 'tr' ? 'Hayır' : 'No' },
    { value: 'sometimes', label: language === 'tr' ? 'Bazen' : 'Sometimes' },
    { value: 'trying_to_quit', label: language === 'tr' ? 'Bırakmaya Çalışıyor' : 'Trying to Quit' },
  ];

  const bodyTypeOptions = [
    { value: 'slim', label: language === 'tr' ? 'İnce' : 'Slim' },
    { value: 'average', label: language === 'tr' ? 'Ortalama' : 'Average' },
    { value: 'athletic', label: language === 'tr' ? 'Atletik' : 'Athletic' },
    { value: 'muscular', label: language === 'tr' ? 'Kaslı' : 'Muscular' },
    { value: 'curvy', label: language === 'tr' ? 'Dolgun' : 'Curvy' },
    { value: 'heavyset', label: language === 'tr' ? 'İri Yapılı' : 'Heavyset' },
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

      const message = language === 'tr' ? 'Profil güncellendi' : 'Profile updated';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(language === 'tr' ? 'Başarılı' : 'Success', message);
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const message = language === 'tr'
        ? 'Profil güncellenirken hata oluştu'
        : 'Error updating profile';

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (visible && !profile) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {language === 'tr' ? 'Ad Soyad' : 'Full name'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder={language === 'tr' ? 'Ad Soyad' : 'Full name'}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {language === 'tr' ? 'Kullanıcı adı' : 'Username'}
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
                {language === 'tr' ? 'Yaş' : 'Age'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowAgePicker(!showAgePicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.age ? theme.text : theme.textSecondary }]}>
                  {formData.age
                    ? `${formData.age} ${language === 'tr' ? 'yaş' : 'years'}`
                    : (language === 'tr' ? 'Yaş Seçin' : 'Select Age')}
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
                {language === 'tr' ? 'Cinsiyet' : 'Gender'}
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
                      {language === 'tr' ? (g === 'male' ? 'Erkek' : g === 'female' ? 'Kadın' : 'Diğer') : g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {language === 'tr' ? 'Boy (cm)' : 'Height (cm)'}
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
                {language === 'tr' ? 'Kilo (kg)' : 'Weight (kg)'}
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
                {language === 'tr' ? 'Eğitim Durumu' : 'Education'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowEducationPicker(!showEducationPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.education ? theme.text : theme.textSecondary }]}>
                  {formData.education
                    ? getEducationLabel(formData.education)
                    : (language === 'tr' ? 'Eğitim Durumu Seçin' : 'Select Education')}
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
                {language === 'tr' ? 'Meslek' : 'Profession'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowProfessionPicker(!showProfessionPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.profession ? theme.text : theme.textSecondary }]}>
                  {formData.profession
                    ? getProfessionLabel(formData.profession)
                    : (language === 'tr' ? 'Meslek Seçin' : 'Select Profession')}
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
                {language === 'tr' ? 'Sigara' : 'Smoking'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowSmokingPicker(!showSmokingPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.smoking_habit ? theme.text : theme.textSecondary }]}>
                  {formData.smoking_habit
                    ? getSmokingLabel(formData.smoking_habit)
                    : (language === 'tr' ? 'Sigara Durumu Seçin' : 'Select Smoking Status')}
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
                {language === 'tr' ? 'Vücut Tipi' : 'Body Type'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowBodyTypePicker(!showBodyTypePicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.body_type ? theme.text : theme.textSecondary }]}>
                  {formData.body_type
                    ? getBodyTypeLabel(formData.body_type)
                    : (language === 'tr' ? 'Vücut Tipi Seçin' : 'Select Body Type')}
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
                {language === 'tr' ? 'Din' : 'Religion'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowReligionPicker(!showReligionPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.religion ? theme.text : theme.textSecondary }]}>
                  {formData.religion
                    ? ((religionOptions.find((o) => o.value === formData.religion)?.label as { tr?: string; en?: string })?.tr && (religionOptions.find((o) => o.value === formData.religion)?.label as { tr?: string; en?: string })?.[language as 'tr' | 'en']) || (religionOptions.find((o) => o.value === formData.religion)?.label as { en?: string })?.en || formData.religion
                    : (language === 'tr' ? 'Din Seçin' : 'Select Religion')}
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
                {language === 'tr' ? 'Alkol' : 'Alcohol'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowAlcoholPicker(!showAlcoholPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.alcohol_consumption ? theme.text : theme.textSecondary }]}>
                  {formData.alcohol_consumption
                    ? ((alcoholConsumptionOptions.find((o) => o.value === formData.alcohol_consumption)?.label as { tr?: string; en?: string })?.[language as 'tr' | 'en']) || (alcoholConsumptionOptions.find((o) => o.value === formData.alcohol_consumption)?.label as { en?: string })?.en || formData.alcohol_consumption
                    : (language === 'tr' ? 'Alkol Seçin' : 'Select Alcohol')}
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
                {language === 'tr' ? 'Çocuk Durumu' : 'Children'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowChildrenPicker(!showChildrenPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.children_status ? theme.text : theme.textSecondary }]}>
                  {formData.children_status
                    ? (childrenOptions.find((o) => o.value === formData.children_status)?.label ?? formData.children_status)
                    : (language === 'tr' ? 'Çocuk Durumu Seçin' : 'Select Children Status')}
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
                {language === 'tr' ? 'İlişki Durumu' : 'Relationship Status'}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowRelationshipPicker(!showRelationshipPicker)}>
                <Text style={[styles.pickerButtonText, { color: formData.relationship_status ? theme.text : theme.textSecondary }]}>
                  {formData.relationship_status
                    ? (relationshipStatusOptions.find((o) => o.value === formData.relationship_status)?.label ?? formData.relationship_status)
                    : (language === 'tr' ? 'İlişki Durumu Seçin' : 'Select Relationship Status')}
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
                {language === 'tr' ? 'Ülke' : 'Country'}
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
                    : language === 'tr'
                    ? 'Ülke Seçin'
                    : 'Select Country'}
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
                {language === 'tr' ? 'Şehir' : 'City'}
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
                    ? language === 'tr'
                      ? 'Önce ülke seçin'
                      : 'Select country first'
                    : language === 'tr'
                    ? 'Şehir Seçin'
                    : 'Select City'}
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

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={onClose}
              disabled={loading}>
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={loading}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {loading ? (language === 'tr' ? 'Kaydediliyor...' : 'Saving...') : (language === 'tr' ? 'Kaydet' : 'Save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
