import { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import BouncyButton from '@/components/BouncyButton';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const AVATAR = Math.min(132, SCREEN_W * 0.34);

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

function Avatar({ uri, name }: { uri: string | null | undefined; name: string }) {
  return uri ? (
    <Image source={{ uri }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarPlaceholder]}>
      <Text style={styles.avatarLetter}>{name?.charAt(0) || '?'}</Text>
    </View>
  );
}

/** One heart that floats up from the bottom and fades out, on a loop. */
function FloatingHeart({ delay, x, size }: { delay: number; x: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 8 : 0.8 * (1 - t.value),
    transform: [
      { translateY: -t.value * SCREEN_H * 0.75 },
      { translateX: Math.sin(t.value * Math.PI * 3) * 18 },
      { scale: 0.6 + t.value * 0.6 },
    ],
  }));
  return (
    <Animated.View style={[styles.floatHeart, { left: x }, style]} pointerEvents="none">
      <Heart size={size} color="#FFFFFF" fill="rgba(255,255,255,0.85)" />
    </Animated.View>
  );
}

const HEARTS = Array.from({ length: 10 }).map((_, i) => ({
  delay: i * 320,
  x: (SCREEN_W / 10) * i + 6,
  size: 14 + ((i * 7) % 16),
}));

export default function MatchCelebrationModal({ visible, matchedUser, sessionId, onClose }: MatchCelebrationModalProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const isTr = language === 'tr';

  const leftX = useSharedValue(-SCREEN_W);
  const rightX = useSharedValue(SCREEN_W);
  const titleScale = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const ctaY = useSharedValue(60);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    leftX.value = -SCREEN_W;
    rightX.value = SCREEN_W;
    titleScale.value = 0;
    heartScale.value = 0;
    ctaY.value = 60;
    ctaOpacity.value = 0;

    titleScale.value = withSpring(1, { damping: 9, stiffness: 120 });
    leftX.value = withDelay(150, withSpring(0, { damping: 13, stiffness: 90 }));
    rightX.value = withDelay(150, withSpring(0, { damping: 13, stiffness: 90 }));
    heartScale.value = withDelay(
      650,
      withSequence(
        withSpring(1.3, { damping: 6 }),
        withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(1.18, { duration: 450 })), -1, true)
      )
    );
    ctaY.value = withDelay(800, withSpring(0, { damping: 14 }));
    ctaOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, [visible, leftX, rightX, titleScale, heartScale, ctaY, ctaOpacity]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleScale.value,
    transform: [{ scale: titleScale.value }, { rotate: `${(1 - titleScale.value) * -8}deg` }],
  }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }, { rotate: '-8deg' }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rightX.value }, { rotate: '8deg' }] }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value, transform: [{ translateY: ctaY.value }] }));

  const handleStartChat = () => {
    onClose();
    if (sessionId && matchedUser?.id) {
      router.push(`/conversation/${sessionId}?friendId=${matchedUser.id}`);
    } else {
      router.push('/(tabs)');
    }
  };

  if (!matchedUser) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <LinearGradient colors={['#FF5E8A', '#FF7A59', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
        {HEARTS.map((h, i) => (
          <FloatingHeart key={i} {...h} />
        ))}

        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={styles.titleSmall}>{isTr ? 'Tebrikler!' : 'Congrats!'}</Text>
          <Text style={styles.title}>{isTr ? 'Eşleştiniz!' : "It's a Match!"}</Text>
          <Text style={styles.subtitle}>
            {isTr
              ? `Sen ve ${matchedUser.full_name} birbirinizi beğendiniz.`
              : `You and ${matchedUser.full_name} liked each other.`}
          </Text>
        </Animated.View>

        <View style={styles.avatars}>
          <Animated.View style={[styles.avatarFrame, leftStyle]}>
            <Avatar uri={profile?.profile_picture} name={profile?.full_name ?? ''} />
          </Animated.View>
          <Animated.View style={[styles.heartBadge, heartStyle]}>
            <Heart size={30} color="#FF5E8A" fill="#FF5E8A" />
          </Animated.View>
          <Animated.View style={[styles.avatarFrame, rightStyle]}>
            <Avatar uri={matchedUser.profile_picture} name={matchedUser.full_name} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.actions, ctaStyle]}>
          <BouncyButton style={styles.chatButton} onPress={handleStartChat} pressedScale={0.95}>
            <MessageCircle size={22} color="#FF5E8A" />
            <Text style={styles.chatButtonText}>{isTr ? 'Mesaj gönder' : 'Send a message'}</Text>
          </BouncyButton>
          <BouncyButton style={styles.dismiss} onPress={onClose} pressedScale={0.95} haptic={false}>
            <Text style={styles.dismissText}>{isTr ? 'Keşfetmeye devam et' : 'Keep swiping'}</Text>
          </BouncyButton>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  floatHeart: { position: 'absolute', bottom: -30 },
  titleWrap: { alignItems: 'center', marginBottom: 40 },
  titleSmall: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  title: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  subtitle: { color: 'rgba(255,255,255,0.95)', fontSize: 16, marginTop: 10, textAlign: 'center' },
  avatars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 56 },
  avatarFrame: {
    borderRadius: AVATAR / 2 + 5,
    padding: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    marginHorizontal: -10,
  },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarPlaceholder: { backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 48, fontWeight: '800', color: '#FFFFFF' },
  heartBadge: {
    zIndex: 2,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 12,
  },
  actions: { width: '100%', gap: 12 },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
  },
  chatButtonText: { fontSize: 17, fontWeight: '800', color: '#FF5E8A' },
  dismiss: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  dismissText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
