/** "Plan paylaş": category, what, where, when. City comes from the user's profile. */
import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MapPin } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenModal } from '@/components/FullScreenModal';
import ComboBox from '@/components/ComboBox';
import { L } from '@/lib/l10n';
import { PLAN_CATEGORIES, createPlan, type PlanCategory } from '@/lib/plans';

const DAY_NAMES: [string, string][] = [
  ['Paz', 'Sun'], ['Pzt', 'Mon'], ['Sal', 'Tue'], ['Çar', 'Wed'], ['Per', 'Thu'], ['Cum', 'Fri'], ['Cmt', 'Sat'],
];

export default function CreatePlanModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<PlanCategory>('coffee');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState('19:00');
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const label =
        i === 0 ? L('Bugün', 'Today') : i === 1 ? L('Yarın', 'Tomorrow') : `${L(DAY_NAMES[d.getDay()][0], DAY_NAMES[d.getDay()][1])} ${d.getDate()}`;
      return { offset: i, label };
    });
  }, [visible]);

  const times = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const h = 6 + Math.floor(i / 2);
        const m = i % 2 ? '30' : '00';
        const v = `${String(h).padStart(2, '0')}:${m}`;
        return { value: v, label: v };
      }),
    []
  );

  const startsAt = () => {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m);
  };

  const reset = () => {
    setTitle('');
    setPlace('');
    setDayOffset(0);
    setTime('19:00');
    setCategory('coffee');
  };

  const submit = async () => {
    if (!user?.id) return;
    if (title.trim().length < 3) {
      Alert.alert(L('Eksik bilgi', 'Missing information'), L('Ne yapmak istediğini kısaca yaz.', 'Briefly write what you want to do.'));
      return;
    }
    const when = startsAt();
    if (when.getTime() < Date.now()) {
      Alert.alert(L('Saat geçmiş', 'Time has passed'), L('İleri bir saat seç.', 'Pick a later time.'));
      return;
    }
    setSaving(true);
    try {
      await createPlan({
        userId: user.id,
        category,
        title,
        place,
        startsAt: when,
        city: profile?.city ?? null,
        country: (profile as any)?.country ?? null,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || L('Plan paylaşılamadı.', 'Could not share the plan.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose} animationType="slide" contentStyle={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.title, { color: theme.text }]}>{L('Plan paylaş', 'Share a plan')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel={L('Kapat', 'Close')}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: theme.text }]}>{L('Ne yapmak istiyorsun?', 'What do you want to do?')}</Text>
          <View style={styles.wrap}>
            {PLAN_CATEGORIES.map((c) => {
              const active = c.value === category;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  style={[styles.chip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : theme.cardBackground }]}>
                  <Text style={{ color: active ? theme.primary : theme.text, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                    {c.emoji} {L(c.tr, c.en)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>{L('Planın', 'Your plan')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={140}
            multiline
            placeholder={L('Örn. Cumartesi sabah sahilde yürüyüş, sonra kahve', 'E.g. Saturday morning walk by the sea, then coffee')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
          />
          <Text style={[styles.counter, { color: theme.textSecondary }]}>{title.length}/140</Text>

          <Text style={[styles.label, { color: theme.text }]}>{L('Nerede? (isteğe bağlı)', 'Where? (optional)')}</Text>
          <TextInput
            value={place}
            onChangeText={setPlace}
            maxLength={80}
            placeholder={L('Semt veya mekân, ör. Kadıköy sahil', 'Area or venue, e.g. city centre')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
          />
          {profile?.city ? (
            <View style={styles.cityRow}>
              <MapPin size={14} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {L('Planın {0} şehrindeki kişilere öncelikli gösterilir.', 'Your plan is shown first to people in {0}.', [profile.city])}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.text }]}>{L('Ne zaman?', 'When?')}</Text>
          <View style={styles.wrap}>
            {days.map((d) => {
              const active = d.offset === dayOffset;
              return (
                <TouchableOpacity
                  key={d.offset}
                  onPress={() => setDayOffset(d.offset)}
                  style={[styles.chip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : theme.cardBackground }]}>
                  <Text style={{ color: active ? theme.primary : theme.text, fontWeight: active ? '700' : '500', fontSize: 13 }}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ marginTop: 6 }}>
            <ComboBox options={times} selectedValue={time} onValueChange={(v) => setTime(String(v))} placeholder={L('Saat', 'Time')} />
          </View>

          <Text style={[styles.note, { color: theme.textSecondary }]}>
            {L(
              'Güvenliğin için ilk buluşmayı kalabalık ve herkese açık bir yerde yap. Planında telefon numarası veya sosyal medya hesabı paylaşma.',
              'For your safety, meet in a busy public place the first time. Do not share phone numbers or social media accounts in your plan.'
            )}
          </Text>

          <TouchableOpacity disabled={saving} onPress={submit} style={{ marginTop: 10, opacity: saving ? 0.6 : 1 }}>
            <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submit}>
              <Text style={[styles.submitText, { color: theme.onGradient }]}>{saving ? L('Paylaşılıyor...', 'Sharing...') : L('Planı paylaş', 'Share plan')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  counter: { fontSize: 11, alignSelf: 'flex-end' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 14 },
  submit: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontWeight: '700' },
});
