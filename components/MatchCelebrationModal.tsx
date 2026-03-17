import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { MessageCircle, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'expo-router';

type MatchedUser = {
  id: string;
  full_name: string;
  profile_picture: string | null;
};

type MatchCelebrationModalProps = {
  visible: boolean;
  matchedUser: MatchedUser | null;
  sessionId?: string;
  onClose: () => void;
};

export default function MatchCelebrationModal({
  visible,
  matchedUser,
  sessionId,
  onClose,
}: MatchCelebrationModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();

  const handleStartChat = () => {
    onClose();
    if (sessionId && matchedUser?.id) {
      router.push(`/conversation/${sessionId}?friendId=${matchedUser.id}`);
    } else {
      router.push('/(tabs)');
    }
  };

  if (!matchedUser) return null;

  const title =
    language === 'tr'
      ? '🎉 Eşleştiniz!'
      : "🎉 It's a match!";
  const subtitle =
    language === 'tr'
      ? `${matchedUser.full_name} ile birbirinizi beğendiniz. Artık mesajlaşabilirsiniz.`
      : `You and ${matchedUser.full_name} liked each other. You can now chat.`;
  const cta =
    language === 'tr'
      ? 'Sohbeti Başlat'
      : 'Start chat';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary + '20' }]}>
            <Sparkles size={40} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>

          <View style={styles.avatarWrap}>
            {matchedUser.profile_picture ? (
              <Image
                source={{ uri: matchedUser.profile_picture }}
                style={[styles.avatar, { borderColor: theme.primary }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarLetter}>{matchedUser.full_name?.charAt(0) || '?'}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: theme.primary }]}
            onPress={handleStartChat}
            activeOpacity={0.8}>
            <MessageCircle size={22} color="#FFFFFF" />
            <Text style={styles.chatButtonText}>{cta}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.dismiss}>
            <Text style={[styles.dismissText, { color: theme.textSecondary }]}>
              {language === 'tr' ? 'Şimdi değil' : 'Not now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  avatarWrap: {
    marginBottom: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
  },
  chatButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismiss: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontSize: 15,
  },
});
