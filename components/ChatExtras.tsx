/**
 * Chat add-ons: polite close sheet ("Kibar kapanış"), waiting-reply reminder, birthday banner and the
 * closed-chat notice. Kept out of app/conversation/[id].tsx so that screen only wires them up.
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Cake, Lock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { L } from '@/lib/l10n';

export function politeCloseTemplates(): string[] {
  return [
    L('Seninle konuşmak güzeldi ama devam etmek istemiyorum. İyi şanslar!', "It was nice talking to you, but I don't want to continue. Good luck!"),
    L('Şu an kimseyle tanışmaya hazır değilim. Kendine iyi bak.', "I'm not ready to meet anyone right now. Take care."),
    L('Aradığımız şeyler farklı gibi. Sana uygun birini bulmanı dilerim.', 'It seems we are looking for different things. I hope you find the right person.'),
  ];
}

export function PoliteCloseSheet({
  visible,
  onClose,
  onSend,
  sending,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  sending?: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const templates = politeCloseTemplates();
  const [picked, setPicked] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel={L('Kapat', 'Close')} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground, paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <Text style={[styles.title, { color: theme.text }]}>{L('Sohbeti kibarca bitir', 'End the chat kindly')}</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          {L(
            'Cevapsız bırakmak yerine kısa bir not gönder. Mesaj gittikten sonra sohbet iki taraf için de kapanır.',
            'Instead of ghosting, send a short note. After it is sent, the chat is closed for both of you.'
          )}
        </Text>
        {templates.map((t, i) => {
          const active = picked === i;
          return (
            <TouchableOpacity
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setPicked(i)}
              style={[
                styles.option,
                { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : 'transparent' },
              ]}>
              <View style={[styles.radio, { borderColor: active ? theme.primary : theme.textSecondary }]}>
                {active && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>"{t}"</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity disabled={sending} onPress={() => onSend(templates[picked])} style={{ marginTop: 6, opacity: sending ? 0.6 : 1 }}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendBtn}>
            <Text style={[styles.sendText, { color: theme.onGradient }]}>
              {sending ? L('Gönderiliyor...', 'Sending...') : L('Gönder ve sohbeti kapat', 'Send and close the chat')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: theme.textSecondary }]}>{L('Vazgeç', 'Cancel')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/** Days the other person has been waiting for my reply (last message is theirs), or 0. */
export function waitingDays(messages: { sender_id: string; created_at: string }[], myId: string | undefined): number {
  const last = messages[messages.length - 1];
  if (!last || !myId || last.sender_id === myId) return 0;
  const days = Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400000);
  return days >= 2 ? days : 0;
}

export function WaitingReplyBanner({ name, days, onClose }: { name: string; days: number; onClose: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
      <Clock size={18} color={theme.primary} />
      <Text style={[styles.bannerText, { color: theme.text }]}>
        {L('{0} {1} gündür cevabını bekliyor.', '{0} has been waiting {1} days for your reply.', [name, days])}
      </Text>
      <TouchableOpacity onPress={onClose} style={styles.bannerBtn}>
        <Text style={[styles.bannerBtnText, { color: theme.primary }]}>{L('Kibarca bitir', 'End kindly')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function BirthdayBanner({ name, today, onCelebrate }: { name: string; today: boolean; onCelebrate: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
      <Cake size={18} color={theme.primary} />
      <Text style={[styles.bannerText, { color: theme.text }]}>
        {today
          ? L('Bugün {0} doğum gününü kutluyor!', "It's {0}'s birthday today!", [name])
          : L('{0} doğum günü haftasında.', '{0} is in their birthday week.', [name])}
      </Text>
      <TouchableOpacity onPress={onCelebrate} style={styles.bannerBtn}>
        <Text style={[styles.bannerBtnText, { color: theme.primary }]}>{L('Kutla', 'Celebrate')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function birthdayWish(name: string): string {
  return L('🎂 İyi ki doğdun {0}! Yeni yaşın sana güzellikler getirsin.', '🎂 Happy birthday {0}! Wishing you a wonderful year ahead.', [name]);
}

export function ClosedChatNotice({ closedByMe, name }: { closedByMe: boolean; name: string }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.closed, { backgroundColor: theme.cardBackground, borderTopColor: theme.border, paddingBottom: Math.max(14, insets.bottom + 8) }]}>
      <Lock size={18} color={theme.textSecondary} />
      <Text style={[styles.closedText, { color: theme.textSecondary }]}>
        {closedByMe
          ? L('Bu sohbeti kibarca kapattın. Artık mesaj gönderilemez.', 'You closed this chat kindly. No more messages can be sent.')
          : L('{0} bu sohbeti kibarca kapattı. Artık mesaj gönderilemez.', '{0} closed this chat kindly. No more messages can be sent.', [name])}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, gap: 10 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  title: { fontSize: 19, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  option: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1.5, borderRadius: 16, padding: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  sendBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 16, fontWeight: '700' },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  bannerBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  bannerBtnText: { fontSize: 13, fontWeight: '800' },
  closed: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1 },
  closedText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
