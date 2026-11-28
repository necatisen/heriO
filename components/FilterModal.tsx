import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { countries, getCitiesForCountry } from '@/lib/constants';
import ComboBox from '@/components/ComboBox';

import { L } from '@/lib/l10n';
import { SPOKEN_LANGUAGES } from '@/lib/languages';
export type FilterOptions = {
  gender: string[];
  ageRange: [number, number];
  distanceKm: number;
  heightRange: [number, number];
  bodyTypes: string[];
  languages: string[];
  religions: string[];
  alcoholConsumption: string[];
  smokingHabit: string[];
  childrenStatus: string[];
  relationshipStatus: string[];
  relationshipGoals: string[];
  verifiedOnly: boolean;
  onlineOnly: boolean;
  countries: string[];
  cities: string[];
};

type CountryOption = {
  value: string;
  label: { tr: string; en: string };
};

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  initialFilters: FilterOptions;
};

export default function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const selectedCountry = filters.countries[0] || '';
  const cityOptions = selectedCountry ? getCitiesForCountry(selectedCountry) : getCitiesForCountry('turkey');
  const ageSliderLength = Math.max(220, Math.min(280, windowWidth - 120));

  const t = {
    filters: L('Filtreler', 'Filters'),
    apply: L('Uygula', 'Apply'),
    reset: L('Sıfırla', 'Reset'),
    meetingPerson: L('Tanışmak İstediği Kişi', 'Looking For'),
    male: L('Erkek', 'Male'),
    female: L('Kadın', 'Female'),
    other: L('Diğer', 'Other'),
    ageRange: L('Yaş Aralığı', 'Age Range'),
    distance: L('Mesafe', 'Distance'),
    height: L('Boy', 'Height'),
    bodyType: L('Vücut Tipi', 'Body Type'),
    languages: L('Diller', 'Languages'),
    religion: L('İnanç', 'Religion'),
    alcoholConsumption: L('Alkol Tüketimi', 'Alcohol Consumption'),
    smokingHabit: L('Sigara Alışkanlığı', 'Smoking Habit'),
    children: L('Çocuk', 'Children'),
    relationshipStatus: L('İlişki Durumu', 'Relationship Status'),
    relationshipGoal: L('İlişki Arayışı', 'Relationship Goal'),
    verifiedProfiles: L('Yalnızca Doğrulanmış Profiller', 'Verified Profiles Only'),
    onlineUsers: L('Yalnızca Çevrimiçi Kullanıcılar', 'Online Users Only'),
    country: L('Ülke', 'Country'),
    city: L('Şehir', 'City'),
  };

  const bodyTypes = [
    { value: 'slim', label: L('İnce', 'Slim') },
    { value: 'average', label: L('Ortalama', 'Average') },
    { value: 'athletic', label: L('Atletik', 'Athletic') },
    { value: 'muscular', label: L('Kaslı', 'Muscular') },
    { value: 'curvy', label: L('Dolgun', 'Curvy') },
    { value: 'heavyset', label: L('İri Yapılı', 'Heavyset') },
  ];

  const languageOptions = SPOKEN_LANGUAGES;

  const religionOptions = [
    { value: 'muslim', label: L('Müslüman', 'Muslim') },
    { value: 'christian', label: L('Hristiyan', 'Christian') },
    { value: 'jewish', label: L('Yahudi', 'Jewish') },
    { value: 'hindu', label: L('Hindu', 'Hindu') },
    { value: 'buddhist', label: L('Budist', 'Buddhist') },
    { value: 'atheist', label: L('Ateist', 'Atheist') },
    { value: 'agnostic', label: L('Agnostik', 'Agnostic') },
    { value: 'other', label: L('Diğer', 'Other') },
  ];

  const alcoholOptions = [
    { value: 'yes', label: L('Evet', 'Yes') },
    { value: 'no', label: L('Hayır', 'No') },
    { value: 'sometimes', label: L('Bazen', 'Sometimes') },
    { value: 'socially', label: L('Sosyal Ortamlarda', 'Socially') },
  ];

  const smokingOptions = [
    { value: 'yes', label: L('Evet', 'Yes') },
    { value: 'no', label: L('Hayır', 'No') },
    { value: 'sometimes', label: L('Bazen', 'Sometimes') },
    { value: 'trying_to_quit', label: L('Bırakmaya Çalışıyor', 'Trying to Quit') },
  ];

  const childrenOptions = [
    { value: 'no_children', label: L('Çocuk Yok', 'No Children') },
    { value: 'has_children', label: L('Çocuk Var', 'Has Children') },
    { value: 'want_children', label: L('Çocuk İstiyor', 'Wants Children') },
    { value: 'dont_want', label: L('Çocuk İstemiyor', 'Doesn\'t Want Children') },
  ];

  const relationshipOptions = [
    { value: 'single', label: L('Bekar', 'Single') },
    { value: 'divorced', label: L('Boşanmış', 'Divorced') },
    { value: 'widowed', label: L('Dul', 'Widowed') },
    { value: 'separated', label: L('Ayrı', 'Separated') },
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

  const toggleFilter = (key: keyof FilterOptions, value: string) => {
    const currentValues = filters[key] as string[];
    setFilters({
      ...filters,
      [key]: currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value],
    });
  };

  const handleReset = () => {
    setFilters({
      gender: [],
      ageRange: [18, 80],
      distanceKm: 500,
      heightRange: [0, 220],
      bodyTypes: [],
      languages: [],
      religions: [],
      alcoholConsumption: [],
      smokingHabit: [],
      childrenStatus: [],
      relationshipStatus: [],
      relationshipGoals: [],
      verifiedOnly: false,
      onlineOnly: false,
      countries: [],
      cities: [],
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t.filters}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.relationshipStatus}
            </Text>
            <View style={styles.optionsGrid}>
              {relationshipOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.relationshipStatus.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('relationshipStatus', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.relationshipStatus.includes(option.value) && {
                        color: '#FFFFFF',
                      },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.relationshipGoal}
            </Text>
            <View style={styles.optionsGrid}>
              {relationshipGoalOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.relationshipGoals.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('relationshipGoals', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.relationshipGoals.includes(option.value) && {
                        color: '#FFFFFF',
                      },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.meetingPerson}
            </Text>
            <View style={styles.genderButtons}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    { backgroundColor: theme.cardBackground },
                    filters.gender.includes(g) && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => toggleFilter('gender', g)}>
                  <Text
                    style={[
                      styles.genderButtonText,
                      { color: theme.text },
                      filters.gender.includes(g) && { color: '#FFFFFF' },
                    ]}>
                    {t[g as keyof typeof t] as string}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.ageRange}: {filters.ageRange[0]} - {filters.ageRange[1]} {L('yaş', 'years')}
            </Text>
            <View style={styles.multiSliderRow}>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>18</Text>
              <View style={styles.multiSliderWrap}>
                <MultiSlider
                  values={[filters.ageRange[0], filters.ageRange[1]]}
                  min={18}
                  max={80}
                  step={1}
                  sliderLength={ageSliderLength}
                  onValuesChange={(values) => {
                    const [minV, maxV] = values as number[];
                    setFilters({ ...filters, ageRange: [minV, maxV] });
                  }}
                  selectedStyle={{
                    backgroundColor: theme.primary,
                    height: 3,
                    borderRadius: 999,
                  }}
                  unselectedStyle={{
                    backgroundColor: theme.border,
                    height: 3,
                    borderRadius: 999,
                  }}
                  markerStyle={{
                    backgroundColor: theme.primary,
                    height: 14,
                    width: 14,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 2,
                  }}
                  trackStyle={{ height: 3, borderRadius: 999 }}
                  containerStyle={{ height: 38 }}
                />
              </View>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>80</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.distance}: {filters.distanceKm} km
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>10</Text>
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={1000}
                step={10}
                value={filters.distanceKm}
                onValueChange={(value) => setFilters({ ...filters, distanceKm: value })}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.primary}
              />
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>1000</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.height}: {filters.heightRange[0]} - {filters.heightRange[1]} cm
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>0</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={220}
                step={1}
                value={filters.heightRange[1]}
                onValueChange={(value) => setFilters({ ...filters, heightRange: [filters.heightRange[0], value] })}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.primary}
              />
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>220</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.country}</Text>
            <ComboBox
              options={countries.map((c: CountryOption) => ({
                value: c.value,
                label: L(c.label.tr, c.label.en),
              }))}
              selectedValue={filters.countries[0] || ''}
              onValueChange={(value) => {
                const nextCountry = value ? String(value) : '';
                setFilters((prev) => {
                  const nextCities = getCitiesForCountry(nextCountry);
                  const currentCity = prev.cities[0] || '';
                  const keepCity =
                    !nextCountry ||
                    nextCities.length === 0 ||
                    (currentCity && nextCities.includes(currentCity));
                  return {
                    ...prev,
                    countries: nextCountry ? [nextCountry] : [],
                    cities: keepCity ? prev.cities : [],
                  };
                });
              }}
              placeholder={L('Ülke seçin', 'Select country')}
            />
            {filters.countries.length > 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                {L(
                  'Başka bir ülke seçtiğinde mesafe sınırı dikkate alınmaz; o ülkedeki herkes gösterilir.',
                  'When you pick another country, the distance limit is ignored and everyone there is shown.'
                )}
              </Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.city}</Text>
            {cityOptions.length > 0 ? (
              <ComboBox
                options={cityOptions.map((city) => ({ value: city, label: city }))}
                selectedValue={filters.cities[0] || ''}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    cities: value ? [String(value)] : [],
                  })
                }
                placeholder={L('Şehir seçin', 'Select city')}
              />
            ) : (
              <TextInput
                style={[
                  styles.textInput,
                  { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground },
                ]}
                value={filters.cities[0] || ''}
                onChangeText={(text) =>
                  setFilters({
                    ...filters,
                    cities: text.trim() ? [text] : [],
                  })
                }
                placeholder={
                  L('Şehir yazın (örn. New York)', 'Type a city (e.g. New York)')
                }
                placeholderTextColor={theme.textSecondary}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.bodyType}</Text>
            <View style={styles.optionsGrid}>
              {bodyTypes.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.bodyTypes.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('bodyTypes', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.bodyTypes.includes(option.value) && { color: '#FFFFFF' },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.languages}</Text>
            <View style={styles.optionsGrid}>
              {languageOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.languages.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('languages', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.languages.includes(option.value) && { color: '#FFFFFF' },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.religion}</Text>
            <View style={styles.optionsGrid}>
              {religionOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.religions.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('religions', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.religions.includes(option.value) && { color: '#FFFFFF' },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t.alcoholConsumption}
            </Text>
            <View style={styles.optionsGrid}>
              {alcoholOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.alcoholConsumption.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('alcoholConsumption', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.alcoholConsumption.includes(option.value) && {
                        color: '#FFFFFF',
                      },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.smokingHabit}</Text>
            <View style={styles.optionsGrid}>
              {smokingOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.smokingHabit.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('smokingHabit', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.smokingHabit.includes(option.value) && { color: '#FFFFFF' },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.children}</Text>
            <View style={styles.optionsGrid}>
              {childrenOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.cardBackground },
                    filters.childrenStatus.includes(option.value) && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleFilter('childrenStatus', option.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      filters.childrenStatus.includes(option.value) && { color: '#FFFFFF' },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t.verifiedProfiles}
              </Text>
              <Switch
                value={filters.verifiedOnly}
                onValueChange={(value) => setFilters({ ...filters, verifiedOnly: value })}
                trackColor={{ false: theme.textSecondary, true: theme.primary }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.onlineUsers}</Text>
              <Switch
                value={filters.onlineOnly}
                onValueChange={(value) => setFilters({ ...filters, onlineOnly: value })}
                trackColor={{ false: theme.textSecondary, true: theme.primary }}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.cardBackground,
              // Mesaj ekranındaki input bar ile aynı alt safe-area hizası.
              paddingBottom: Platform.OS === 'android'
                ? (insets.bottom > 0 ? insets.bottom + 6 : 10)
                : Math.max(insets.bottom, 10),
            },
          ]}>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: theme.background }]}
            onPress={handleReset}>
            <Text style={[styles.resetButtonText, { color: theme.text }]}>{t.reset}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              onApply(filters);
              onClose();
            }}>
            <Text style={styles.applyButtonText}>{t.apply}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeValue: {
    fontSize: 14,
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    minWidth: 35,
    textAlign: 'center',
  },
  multiSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multiSliderWrap: {
    flex: 1,
    alignItems: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    // Mesajlar ekranındaki input bar ile aynı dikey yükseklik hissi için.
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
});
