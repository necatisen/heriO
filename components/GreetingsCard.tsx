/**
 * "Kutlamalar": birthday greetings I received this year (only I see them).
 * "Teşekkür et" opens a chat with the sender; X removes the note.
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Cake, User, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { L } from '@/lib/l10n';
import { deleteGreeting, loadReceivedGreetings, thankGreeting, type Greeting } from '@/lib/birthdayGreetings';
import { openChatBetween } from '@/lib/likeUser';

export default function GreetingsCard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Greeting[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadReceivedGreetings(user.id).then(setItems);
    }, [user?.id])
  );

  if (!items.length) return null;

  const openChat = (sessionId: string | undefined, friendId: string, draft?: string) => {
    if (!sessionId) return;
    const q = draft ? `&draft=${encodeURIComponent(draft)}` : '';
    router.push(`/conversation/${sessionId}?friendId=${friendId}${q}` as any);
  };

  const thank = async (g: Greeting) => {
    if (!user?.id) return;
    setBusy(g.id);
    try {
      if (g.thanked_at) {
        openChat(await openChatBetween(user.id, g.from_user), g.from_user);
        return;
      }
      const sessionId = await thankGreeting(g, user.id);
      setItems((prev) => prev.map((x) => (x.id === g.id ? { ...x, thanked_at: new Date().toISOString() } : x)));
      openChat(sessionId, g.from_user, L('Çok teşekkür ederim, çok naziksin! 😊', 'Thank you so much, that is so kind! 😊'));
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || L('İşlem yapılamadı.', 'Something went wrong.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = (g: Greeting) =>
    Alert.alert(L('Notu sil', 'Delete note'), L('Bu not listenden kaldırılsın mı?', 'Remove this note from your list?'), [
      { text: L('Vazgeç', 'Cancel'), style: 'cancel' },
      {
        text: L('Sil', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGreeting(g.id);
            setItems((prev) => prev.filter((x) => x.id !== g.id));
          } catch (e: any) {
            Alert.alert(L('Hata', 'Error'), e?.message || '');
          }
        },
      },
    ]);

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.head}>
        <Cake size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>{L('Kutlamalar ({0})', 'Greetings ({0})', [items.length])}</Text>
      </View>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        {L('Sadece sen görürsün. Teşekkür edersen sohbet açılır.', 'Only you can see these. Thank someone to open a chat.')}
      </Text>
      {items.map((g) => (
        <View key={g.id} style={[styles.row, { borderTopColor: theme.border }]}>
          {g.sender?.profile_picture ? (
            <Image source={{ uri: g.sender.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
              <User size={18} color={theme.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {g.kind === 'wish' ? '🎂 ' : '👋 '}
              {g.sender?.full_name}
            </Text>
            {g.note ? <Text style={[styles.note, { color: theme.text }]}>{g.note}</Text> : null}
            <TouchableOpacity
              disabled={busy === g.id}
              onPress={() => thank(g)}
              style={[styles.btn, { backgroundColor: g.thanked_at ? theme.inputBackground : theme.primary, opacity: busy === g.id ? 0.6 : 1 }]}>
              <Text style={[styles.btnText, { color: g.thanked_at ? theme.text : '#FFFFFF' }]}>
                {g.thanked_at ? L('Sohbete git', 'Go to chat') : L('Teşekkür et', 'Say thanks')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => remove(g)} style={styles.x} accessibilityLabel={L('Notu sil', 'Delete note')}>
            <X size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 4, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10, paddingTop: 12, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  name: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  btn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  btnText: { fontSize: 13, fontWeight: '700' },
  x: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
