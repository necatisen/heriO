/**
 * Explore reminder for thin profiles (score < 50): "Profilini doldur, daha çok kişi seni görsün".
 * Shown at most once a day; tapping opens the profile tab where the "Seni tanısınlar" card lists the steps.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, type Href } from 'expo-router';
import { Sparkles, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { profileScore } from '@/components/ProfileStrength';
import { L } from '@/lib/l10n';

const KEY = 'profileNudge:lastShown';
const today = () => new Date().toISOString().slice(0, 10);

export default function ProfileNudge() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id || !profile) return;
    let alive = true;
    (async () => {
      try {
        if ((await AsyncStorage.getItem(`${KEY}:${user.id}`)) === today()) return;
        const [{ count }, { data }] = await Promise.all([
          supabase.from('photos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('profiles').select('interests').eq('id', user.id).maybeSingle(),
        ]);
        const interests = Array.isArray((data as any)?.interests) ? (data as any).interests.length : 0;
        const s = profileScore(profile as any, count ?? 0, interests);
        if (!alive || s >= 50) return;
        setScore(s);
        await AsyncStorage.setItem(`${KEY}:${user.id}`, today());
      } catch {
        // Optional reminder; ignore errors.
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, !!profile]);

  if (score == null) return null;
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.box}
        activeOpacity={0.85}
        onPress={() => {
          setScore(null);
          router.push('/(tabs)/profile' as Href);
        }}>
        <Sparkles size={18} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{L('Profilin %{0} dolu', 'Your profile is {0}% complete', [score])}</Text>
          <Text style={styles.text}>{L('Profilini doldur, daha çok kişi seni görsün.', 'Complete your profile so more people see you.')}</Text>
        </View>
        <TouchableOpacity onPress={() => setScore(null)} hitSlop={10} accessibilityLabel={L('Kapat', 'Close')}>
          <X size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  text: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 1 },
});
