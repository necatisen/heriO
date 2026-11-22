/**
 * "Doğum günü ikizlerin": people born on the same day and month. Tap one to open their profile and like.
 * Users who have not set their real birthday get a short explanation and a shortcut to add it.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Cake, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FullScreenModal } from '@/components/FullScreenModal';
import ProfileModal from '@/components/ProfileModal';
import MatchCelebrationModal from '@/components/MatchCelebrationModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { L } from '@/lib/l10n';
import { dayMonthLabel, loadBirthDateExact, loadBirthdayTwins, type BirthdayTwin } from '@/lib/birthday';
import { likeUser } from '@/lib/likeUser';

const ageOf = (d: string | null) => {
  if (!d) return '';
  const b = new Date(d);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return String(a);
};

export default function BirthdayTwinsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [exact, setExact] = useState(false);
  const [twins, setTwins] = useState<BirthdayTwin[]>([]);
  const [opened, setOpened] = useState<any | null>(null);
  const [match, setMatch] = useState<{ user: BirthdayTwin; sessionId?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const isExact = await loadBirthDateExact(user?.id);
    setExact(isExact);
    setTwins(isExact ? await loadBirthdayTwins() : []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const openProfile = async (t: BirthdayTwin) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', t.id).maybeSingle();
    if (data) setOpened(data);
  };

  const handleLike = async () => {
    if (!user?.id || !opened) return;
    const target = opened;
    try {
      const res = await likeUser(user.id, profile?.full_name || '', target.id, target.full_name || '');
      setOpened(null);
      if (res.matched) {
        setMatch({ user: target, sessionId: res.sessionId });
      } else {
        Alert.alert(
          L('Beğeni gönderildi', 'Like sent'),
          res.alreadyLiked ? L('Bu kişiyi zaten beğenmiştin.', 'You already liked this person.') : L('Karşılık verirse eşleşeceksiniz.', "If they like you back, you'll match.")
        );
      }
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || L('Beğeni gönderilemedi.', 'Could not send like.'));
    }
  };

  return (
    <FullScreenModal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      contentStyle={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <Cake size={24} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{L('Doğum günü ikizlerin', 'Your birthday twins')}</Text>
          {exact && profile?.birth_date ? (
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              {L('{0} tarihinde doğanlar', 'Born on {0}', [dayMonthLabel(profile.birth_date)])}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel={L('Kapat', 'Close')}>
          <X size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? null : !exact ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{L('Önce doğum gününü ekle', 'Add your birthday first')}</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {L(
              'Doğum günü ikizlerini görmek ve doğum günü haftanda Keşfet\'te öne çıkmak için Profilim → Profili düzenle bölümünden doğum gününü seç.',
              'To see your birthday twins and get boosted in Explore during your birthday week, pick your birthday in My profile → Edit profile.'
            )}
          </Text>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: theme.primary }]}
            onPress={() => {
              onClose();
              router.push('/(tabs)/profile' as any);
            }}>
            <Text style={styles.ctaText}>{L('Profilime git', 'Go to my profile')}</Text>
          </TouchableOpacity>
        </View>
      ) : twins.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{L('Henüz doğum günü ikizin yok', 'No birthday twins yet')}</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {L('Seninle aynı gün doğan biri katıldığında burada görünecek.', 'When someone born on your day joins, they will show up here.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={twins}
          keyExtractor={(t) => t.id}
          numColumns={3}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
          columnWrapperStyle={{ gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => openProfile(item)}>
              {item.profile_picture ? (
                <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                  <User size={26} color={theme.primary} />
                </View>
              )}
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                  {item.full_name}, {ageOf(item.birth_date)}
                </Text>
                {item.verification_status === 'verified' && <VerifiedBadge size={14} verified />}
              </View>
              <Text style={[styles.city, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.city || ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <ProfileModal
        visible={!!opened}
        profile={opened}
        onClose={() => setOpened(null)}
        onLike={handleLike}
        showActionButtons
      />
      <MatchCelebrationModal
        visible={!!match}
        matchedUser={match ? { id: match.user.id, full_name: match.user.full_name, profile_picture: match.user.profile_picture } : null}
        sessionId={match?.sessionId}
        onClose={() => setMatch(null)}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 28, alignItems: 'center', gap: 10, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  cta: { marginTop: 10, paddingHorizontal: 22, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  card: { flex: 1 / 3, borderWidth: 1, borderRadius: 16, padding: 10, alignItems: 'center', gap: 6, maxWidth: '32%' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  name: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  city: { fontSize: 11 },
});
