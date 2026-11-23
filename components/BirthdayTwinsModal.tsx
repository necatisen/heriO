/**
 * "Doğum günü ikizlerin": people born on the same day and month who chose to share their birthday.
 * Tap a twin → a small sheet: "Doğum gününü kutla" (in the birthday week) or "İkiz selamı gönder", plus "Profili gör".
 * No direct message: the receiver thanks the greeting and that opens the chat.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Modal,
  Pressable,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Cake, User, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FullScreenModal } from '@/components/FullScreenModal';
import ProfileModal from '@/components/ProfileModal';
import MatchCelebrationModal from '@/components/MatchCelebrationModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { L } from '@/lib/l10n';
import { birthdayWeekDay, dayMonthLabel, loadBirthDateExact, loadBirthdayTwins, type BirthdayTwin } from '@/lib/birthday';
import { GREETING_NOTE_MAX, loadSentGreetingIds, loadShareBirthday, saveShareBirthday, sendGreeting } from '@/lib/birthdayGreetings';
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
  const [sharing, setSharing] = useState(false);
  const [twins, setTwins] = useState<BirthdayTwin[]>([]);
  const [sent, setSent] = useState<Set<string>>(() => new Set());
  const [picked, setPicked] = useState<BirthdayTwin | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [opened, setOpened] = useState<any | null>(null);
  const [match, setMatch] = useState<{ user: BirthdayTwin; sessionId?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [isExact, share] = await Promise.all([loadBirthDateExact(user?.id), loadShareBirthday(user?.id)]);
    setExact(isExact);
    setSharing(share);
    if (isExact && user?.id) {
      const [list, sentIds] = await Promise.all([loadBirthdayTwins(), loadSentGreetingIds(user.id)]);
      setTwins(list);
      setSent(sentIds);
    } else {
      setTwins([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const toggleSharing = async (v: boolean) => {
    if (!user?.id) return;
    setSharing(v);
    try {
      await saveShareBirthday(user.id, v);
    } catch (e: any) {
      setSharing(!v);
      Alert.alert(L('Hata', 'Error'), e?.message || '');
    }
  };

  const inWeek = (t: BirthdayTwin | null) => !!t && birthdayWeekDay(t.birth_date, true) !== null;

  const pick = (t: BirthdayTwin) => {
    setNote(
      inWeek(t)
        ? L('İyi ki doğdun ikizim! Nice güzel yaşlara 🎂', 'Happy birthday, twin! Have a wonderful year 🎂')
        : L('Selam! Aynı gün doğmuşuz 👋', 'Hi! We were born on the same day 👋')
    );
    setPicked(t);
  };

  const send = async () => {
    if (!user?.id || !picked) return;
    setSending(true);
    try {
      await sendGreeting(user.id, profile?.full_name || '', picked.id, inWeek(picked) ? 'wish' : 'hello', note);
      setSent((prev) => new Set(prev).add(picked.id));
      setPicked(null);
      Alert.alert(L('Gönderildi', 'Sent'), L('Teşekkür ederse sohbetiniz açılır.', 'If they thank you, your chat opens.'));
    } catch (e: any) {
      if (e?.message === 'already') {
        setSent((prev) => new Set(prev).add(picked.id));
        Alert.alert(L('Zaten gönderdin', 'Already sent'), L('Bu kişiye bu yıl zaten bir not gönderdin.', 'You already sent this person a note this year.'));
      } else {
        Alert.alert(L('Hata', 'Error'), e?.message || L('Gönderilemedi.', 'Could not send.'));
      }
    } finally {
      setSending(false);
    }
  };

  const openProfile = async (t: BirthdayTwin) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', t.id).maybeSingle();
    setPicked(null);
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

  const Avatar = ({ uri, size }: { uri: string | null; size: number }) =>
    uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <User size={size * 0.4} color={theme.primary} />
      </View>
    );

  const pickedSent = !!picked && sent.has(picked.id);

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose} animationType="slide" contentStyle={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <Cake size={24} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{L('Doğum günü ikizlerin', 'Your birthday twins')}</Text>
          {exact && profile?.birth_date ? (
            <Text style={[styles.sub, { color: theme.textSecondary }]}>{L('{0} tarihinde doğanlar', 'Born on {0}', [dayMonthLabel(profile.birth_date)])}</Text>
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
      ) : (
        <>
          <View style={[styles.shareRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shareTitle, { color: theme.text }]}>{L('İkizlerim beni görsün', 'Let my twins see me')}</Text>
              <Text style={[styles.shareSub, { color: theme.textSecondary }]}>
                {sharing
                  ? L('Bu listede görünüyorsun ve doğum günü haftanda öne çıkıyorsun.', 'You appear in this list and get boosted in your birthday week.')
                  : L('Kapalıyken ikizlerin seni görmez; sen onları yine görebilirsin.', 'While off, your twins cannot see you; you can still see them.')}
              </Text>
            </View>
            <Switch value={sharing} onValueChange={toggleSharing} trackColor={{ true: theme.primary, false: theme.border }} thumbColor="#FFFFFF" />
          </View>

          {twins.length === 0 ? (
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
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} onPress={() => pick(item)}>
                  <Avatar uri={item.profile_picture} size={64} />
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                      {item.full_name}, {ageOf(item.birth_date)}
                    </Text>
                    {item.verification_status === 'verified' && <VerifiedBadge size={14} verified />}
                  </View>
                  <Text style={[styles.city, { color: theme.textSecondary }]} numberOfLines={1}>
                    {sent.has(item.id) ? L('Selam gönderildi ✓', 'Greeting sent ✓') : item.city || ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      <Modal visible={!!picked} transparent animationType="slide" onRequestClose={() => setPicked(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.overlay} onPress={() => setPicked(null)} accessibilityLabel={L('Kapat', 'Close')} />
          <View style={[styles.sheet, { backgroundColor: theme.cardBackground, paddingBottom: Math.max(18, insets.bottom + 10) }]}>
            <View style={styles.sheetHead}>
              <Avatar uri={picked?.profile_picture ?? null} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetName, { color: theme.text }]} numberOfLines={1}>
                  {picked?.full_name}, {ageOf(picked?.birth_date ?? null)}
                </Text>
                <Text style={[styles.sub, { color: theme.textSecondary }]}>
                  {inWeek(picked) ? L('Doğum günü haftasında 🎂', 'In their birthday week 🎂') : L('Seninle aynı gün doğdu', 'Born on the same day as you')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPicked(null)} style={styles.close} accessibilityLabel={L('Kapat', 'Close')}>
                <X size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            {pickedSent ? (
              <View style={[styles.sentBox, { backgroundColor: theme.inputBackground }]}>
                <Check size={18} color={theme.primary} />
                <Text style={{ color: theme.text, flex: 1, fontSize: 14 }}>
                  {L('Bu yıl notunu gönderdin. Teşekkür ederse sohbetiniz açılır.', 'You sent your note this year. If they thank you, your chat opens.')}
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  maxLength={GREETING_NOTE_MAX}
                  multiline
                  placeholder={L('Kısa bir not yaz', 'Write a short note')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                />
                <Text style={[styles.counter, { color: theme.textSecondary }]}>
                  {note.length}/{GREETING_NOTE_MAX}
                </Text>
                <TouchableOpacity disabled={sending} onPress={send} style={{ opacity: sending ? 0.6 : 1 }}>
                  <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendBtn}>
                    <Text style={[styles.sendText, { color: theme.onGradient }]}>
                      {sending
                        ? L('Gönderiliyor...', 'Sending...')
                        : inWeek(picked)
                          ? L('🎂 Doğum gününü kutla', '🎂 Wish a happy birthday')
                          : L('👋 İkiz selamı gönder', '👋 Send a twin hello')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  {L('Notun bildirim olarak gider. Teşekkür ederse aranızda sohbet açılır.', 'Your note arrives as a notification. If they thank you, a chat opens between you.')}
                </Text>
              </>
            )}
            <TouchableOpacity onPress={() => picked && openProfile(picked)} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: theme.primary }]}>{L('Profili gör', 'View profile')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ProfileModal visible={!!opened} profile={opened} onClose={() => setOpened(null)} onLike={handleLike} showActionButtons allowDirectChat={false} />
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
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 12, marginBottom: 0, padding: 14, borderRadius: 16, borderWidth: 1 },
  shareTitle: { fontSize: 15, fontWeight: '700' },
  shareSub: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  card: { flex: 1 / 3, borderWidth: 1, borderRadius: 16, padding: 10, alignItems: 'center', gap: 6, maxWidth: '32%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  name: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  city: { fontSize: 11 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetName: { fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 76, textAlignVertical: 'top' },
  counter: { fontSize: 11, alignSelf: 'flex-end', marginTop: -6 },
  sendBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  sentBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  linkBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 15, fontWeight: '700' },
});
