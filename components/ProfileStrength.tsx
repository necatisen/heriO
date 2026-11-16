import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import BouncyButton from '@/components/BouncyButton';
import { useTheme } from '@/contexts/ThemeContext';
import { BRAND } from '@/lib/brand';
import { L } from '@/lib/l10n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 64;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type P = Record<string, any> | null | undefined;

/** Fields that make a profile attractive, with their weight and a hint for the next step. */
function checklist(p: P, photoCount: number) {
  return [
    { done: !!p?.profile_picture, w: 20, tip: L('Profil fotoğrafı ekle', 'Add a profile photo') },
    { done: photoCount >= 3, w: 15, tip: L('En az 3 fotoğraf ekle', 'Add at least 3 photos') },
    { done: (p?.bio || '').trim().length >= 20, w: 15, tip: L('Kendinden biraz bahset', 'Write a short bio') },
    { done: p?.verification_status === 'verified', w: 15, tip: L('Yüz doğrulamasını tamamla', 'Complete face verification') },
    { done: !!p?.relationship_goal, w: 10, tip: L('İlişki hedefini seç', 'Choose your relationship goal') },
    { done: !!p?.profession, w: 5, tip: L('Mesleğini ekle', 'Add your profession') },
    { done: !!p?.education, w: 5, tip: L('Eğitim durumunu ekle', 'Add your education') },
    { done: !!p?.height, w: 5, tip: L('Boyunu ekle', 'Add your height') },
    { done: !!p?.city, w: 5, tip: L('Şehrini ekle', 'Add your city') },
    { done: !!(p?.smoking_habit && p?.alcohol_consumption), w: 5, tip: L('Alışkanlıklarını ekle', 'Add your habits') },
  ];
}

export default function ProfileStrength({ profile, photoCount, onPress }: { profile: P; photoCount: number; onPress: () => void }) {
  const { theme } = useTheme();
  const items = checklist(profile, photoCount);
  const score = items.reduce((n, i) => n + (i.done ? i.w : 0), 0);
  const next = items.find((i) => !i.done);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [score, progress]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.value) }));

  if (score >= 100) return null;

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(500)}>
      <BouncyButton onPress={onPress} pressedScale={0.97} style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <View>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Defs>
              <SvgGradient id="ps" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={BRAND.blue} />
                <Stop offset="0.5" stopColor={BRAND.violet} />
                <Stop offset="1" stopColor={BRAND.pink} />
              </SvgGradient>
            </Defs>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={theme.border} strokeWidth={STROKE} fill="none" />
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke="url(#ps)"
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              animatedProps={ringProps}
            />
          </Svg>
          <View style={styles.center}>
            <Text style={[styles.pct, { color: theme.text }]}>{L('%{0}', '{0}%', [score])}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Sparkles size={14} color={BRAND.pink} />
            <Text style={[styles.title, { color: theme.text }]}>{L('Profil gücü', 'Profile strength')}</Text>
          </View>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            {L('Tam profiller 3 kat daha fazla eşleşme alır.', 'Complete profiles get 3x more matches.')}
          </Text>
          {next && <Text style={[styles.next, { color: theme.primary }]}>{next.tip}</Text>}
        </View>
        <ChevronRight size={20} color={theme.textSecondary} />
      </BouncyButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: '#1E1450',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 15, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  next: { fontSize: 13, fontWeight: '700', marginTop: 6 },
});
