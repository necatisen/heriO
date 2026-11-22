/**
 * Hobbies / pets / exercise: editor (EditProfileModal) and read-only view (ProfileModal),
 * plus load/save helpers that never break older databases (columns from migration 20261122120000).
 */
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';
import {
  INTEREST_OPTIONS,
  PET_OPTIONS,
  EXERCISE_OPTIONS,
  MAX_INTERESTS,
  EMPTY_EXTRAS,
  interestLabel,
  petLabel,
  exerciseLabel,
  type Option,
  type ProfileExtras,
} from '@/lib/profileExtras';

export async function loadProfileExtras(userId: string | undefined | null): Promise<ProfileExtras> {
  if (!userId) return EMPTY_EXTRAS;
  try {
    const { data, error } = await supabase.from('profiles').select('interests, pets, exercise').eq('id', userId).maybeSingle();
    if (error || !data) return EMPTY_EXTRAS;
    const d = data as any;
    return { interests: Array.isArray(d.interests) ? d.interests : [], pets: d.pets ?? null, exercise: d.exercise ?? null };
  } catch {
    return EMPTY_EXTRAS;
  }
}

export async function saveProfileExtras(userId: string, extras: ProfileExtras): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ interests: extras.interests.slice(0, MAX_INTERESTS), pets: extras.pets, exercise: extras.exercise })
    .eq('id', userId);
  if (error) throw error;
}

export function useProfileExtras(userId: string | undefined | null, reloadKey?: unknown) {
  const [extras, setExtras] = useState<ProfileExtras>(EMPTY_EXTRAS);
  useEffect(() => {
    let alive = true;
    loadProfileExtras(userId).then((e) => alive && setExtras(e));
    return () => {
      alive = false;
    };
  }, [userId, reloadKey]);
  return extras;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : theme.inputBackground },
      ]}>
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.text, fontWeight: active ? '700' : '500' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const label = (o: Option) => `${o.emoji} ${L(o.tr, o.en)}`;

export function ProfileExtrasEditor({ value, onChange }: { value: ProfileExtras; onChange: (v: ProfileExtras) => void }) {
  const { theme } = useTheme();
  const toggleInterest = (v: string) => {
    const has = value.interests.includes(v);
    if (!has && value.interests.length >= MAX_INTERESTS) return;
    onChange({ ...value, interests: has ? value.interests.filter((x) => x !== v) : [...value.interests, v] });
  };
  return (
    <View>
      <Text style={[styles.title, { color: theme.text }]}>
        {L('Hobiler ve ilgi alanları', 'Hobbies and interests')}{' '}
        <Text style={{ color: theme.textSecondary, fontWeight: '400' }}>
          ({value.interests.length}/{MAX_INTERESTS})
        </Text>
      </Text>
      <View style={styles.wrap}>
        {INTEREST_OPTIONS.map((o) => (
          <Chip key={o.value} label={label(o)} active={value.interests.includes(o.value)} onPress={() => toggleInterest(o.value)} />
        ))}
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{L('Evcil hayvan', 'Pets')}</Text>
      <View style={styles.wrap}>
        {PET_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={label(o)}
            active={value.pets === o.value}
            onPress={() => onChange({ ...value, pets: value.pets === o.value ? null : o.value })}
          />
        ))}
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{L('Spor alışkanlığı', 'Exercise')}</Text>
      <View style={styles.wrap}>
        {EXERCISE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={label(o)}
            active={value.exercise === o.value}
            onPress={() => onChange({ ...value, exercise: value.exercise === o.value ? null : o.value })}
          />
        ))}
      </View>
    </View>
  );
}

/** Read-only chips shown on a profile. Renders nothing when the user filled none of them. */
export function ProfileExtrasView({ extras }: { extras: ProfileExtras }) {
  const { theme } = useTheme();
  const lifestyle = [petLabel(extras.pets), exerciseLabel(extras.exercise)].filter(Boolean);
  if (extras.interests.length === 0 && lifestyle.length === 0) return null;
  const chip = (text: string) => (
    <View key={text} style={[styles.viewChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
      <Text style={[styles.chipText, { color: theme.text }]}>{text}</Text>
    </View>
  );
  return (
    <View>
      {extras.interests.length > 0 && (
        <>
          <Text style={[styles.viewTitle, { color: theme.text }]}>{L('Hobiler ve ilgi alanları', 'Hobbies and interests')}</Text>
          <View style={styles.wrap}>{extras.interests.map((v) => interestLabel(v)).filter(Boolean).map(chip)}</View>
        </>
      )}
      {lifestyle.length > 0 && (
        <>
          <Text style={[styles.viewTitle, { color: theme.text }]}>{L('Yaşam tarzı', 'Lifestyle')}</Text>
          <View style={styles.wrap}>{lifestyle.map(chip)}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  viewTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  viewChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13 },
});
