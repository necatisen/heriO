/** "Seni tanısınlar" card: profile score ring + the missing steps, each one tappable. Hidden at 100%. */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ChevronDown, ChevronRight, ChevronUp, Sparkles } from 'lucide-react-native';
import BouncyButton from '@/components/BouncyButton';
import { useTheme } from '@/contexts/ThemeContext';
import { L } from '@/lib/l10n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 64;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type P = Record<string, any> | null | undefined;

export type StrengthAction = 'photo' | 'verify' | 'edit';

type Step = { key: string; done: boolean; w: number; emoji: string; tip: string; why: string; action: StrengthAction };

/** Fields that make a profile attractive, with their weight, a hint and why it matters. Weights add up to 100. */
function checklist(p: P, photoCount: number, interestsCount: number): Step[] {
  return [
    { key: 'avatar', done: !!p?.profile_picture, w: 18, emoji: '📸', action: 'photo', tip: L('Profil fotoğrafı ekle', 'Add a profile photo'), why: L('Fotoğrafsız profiller neredeyse hiç beğeni almaz.', 'Profiles without a photo get almost no likes.') },
    { key: 'photos', done: photoCount >= 3, w: 12, emoji: '🖼️', action: 'photo', tip: L('En az 3 fotoğraf ekle', 'Add at least 3 photos'), why: L('Farklı ortamlardan fotoğraflar güven verir.', 'Photos from different moments build trust.') },
    { key: 'bio', done: (p?.bio || '').trim().length >= 20, w: 14, emoji: '✍️', action: 'edit', tip: L('Kendini 2 cümleyle anlat', 'Describe yourself in 2 sentences'), why: L('İlk mesaj genelde biyografinden çıkar.', 'First messages usually start from your bio.') },
    { key: 'interests', done: interestsCount >= 3, w: 12, emoji: '🎯', action: 'edit', tip: L('En az 3 ilgi alanı / aktivite seç', 'Pick at least 3 interests / activities'), why: L('Ortak hobiler eşleşmede öne çıkarır.', 'Shared hobbies boost you in matches.') },
    { key: 'verify', done: p?.verification_status === 'verified', w: 14, emoji: '✅', action: 'verify', tip: L('Doğrula, mavi tik al', 'Verify and get the blue tick'), why: L('Doğrulanmış profiller daha çok güven ve yanıt alır.', 'Verified profiles get more trust and replies.') },
    { key: 'goal', done: !!p?.relationship_goal, w: 8, emoji: '❤️', action: 'edit', tip: L('Ne aradığını seç', 'Say what you are looking for'), why: L('Aynı şeyi arayan kişilerle buluşursun.', 'Meet people who want the same thing.') },
    { key: 'languages', done: Array.isArray(p?.languages) && p.languages.length > 0, w: 5, emoji: '🗣️', action: 'edit', tip: L('Konuştuğun dilleri ekle', 'Add the languages you speak'), why: L('Yabancı kullanıcılarla tanışmanı kolaylaştırır.', 'Makes it easier to meet people from abroad.') },
    { key: 'profession', done: !!p?.profession, w: 5, emoji: '💼', action: 'edit', tip: L('Mesleğini ekle', 'Add your profession'), why: L('Sohbet başlatmak için güzel bir konu.', 'A good topic to start a chat.') },
    { key: 'education', done: !!p?.education, w: 4, emoji: '🎓', action: 'edit', tip: L('Eğitim durumunu ekle', 'Add your education'), why: L('Uyum puanını etkiler.', 'Affects your match score.') },
    { key: 'height', done: !!p?.height, w: 3, emoji: '📏', action: 'edit', tip: L('Boyunu ekle', 'Add your height'), why: L('Filtrelerde görünmeni sağlar.', 'Lets you appear in filters.') },
    { key: 'city', done: !!p?.city, w: 3, emoji: '📍', action: 'edit', tip: L('Şehrini ekle', 'Add your city'), why: L('Yakınındaki kişilere gösterilirsin.', 'You are shown to people near you.') },
    { key: 'habits', done: !!(p?.smoking_habit && p?.alcohol_consumption), w: 2, emoji: '🍷', action: 'edit', tip: L('Alışkanlıklarını ekle', 'Add your habits'), why: L('Uyum puanını etkiler.', 'Affects your match score.') },
  ];
}

/** Score 0–100 (also used for the Explore reminder). */
export function profileScore(p: P, photoCount: number, interestsCount: number): number {
  return checklist(p, photoCount, interestsCount).reduce((n, i) => n + (i.done ? i.w : 0), 0);
}

export default function ProfileStrength({
  profile,
  photoCount,
  interestsCount = 0,
  onAction,
}: {
  profile: P;
  photoCount: number;
  interestsCount?: number;
  onAction: (a: StrengthAction) => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const items = checklist(profile, photoCount, interestsCount);
  const score = items.reduce((n, i) => n + (i.done ? i.w : 0), 0);
  const missing = items.filter((i) => !i.done).sort((a, b) => b.w - a.w);
  const next = missing[0];
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [score, progress]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.value) }));

  if (score >= 100) return null;
  const shown = open ? missing : missing.slice(0, 3);

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(500)} style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <BouncyButton onPress={() => next && onAction(next.action)} pressedScale={0.97} style={styles.head}>
        <View>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Defs>
              <SvgGradient id="ps" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.gradient[0]} />
                <Stop offset="0.5" stopColor={theme.gradient[1]} />
                <Stop offset="1" stopColor={theme.gradient[2] ?? theme.gradient[1]} />
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
            <Sparkles size={14} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>{L('Seni tanısınlar', 'Let people know you')}</Text>
          </View>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            {score < 50
              ? L('Profilin yarım. Tam profiller 3 kat daha fazla eşleşme alır.', 'Your profile is half empty. Complete profiles get 3x more matches.')
              : L('Az kaldı! {0} adım daha tamamla, daha çok kişi seni görsün.', 'Almost there! {0} more steps and more people will see you.', [missing.length])}
          </Text>
        </View>
        <ChevronRight size={20} color={theme.textSecondary} />
      </BouncyButton>

      <View style={[styles.list, { borderTopColor: theme.border }]}>
        {shown.map((i) => (
          <TouchableOpacity key={i.key} onPress={() => onAction(i.action)} style={styles.row} accessibilityRole="button">
            <Text style={styles.emoji}>{i.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{i.tip}</Text>
              <Text style={[styles.rowWhy, { color: theme.textSecondary }]} numberOfLines={2}>
                {i.why}
              </Text>
            </View>
            <Text style={[styles.plus, { color: theme.primary }]}>+{i.w}</Text>
          </TouchableOpacity>
        ))}
        {missing.length > 3 ? (
          <TouchableOpacity onPress={() => setOpen((o) => !o)} style={styles.more}>
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
              {open ? L('Daha az göster', 'Show less') : L('{0} adım daha', '{0} more steps', [missing.length - 3])}
            </Text>
            {open ? <ChevronUp size={16} color={theme.primary} /> : <ChevronDown size={16} color={theme.primary} />}
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 15, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  list: { marginTop: 12, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  emoji: { fontSize: 22, width: 30, textAlign: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowWhy: { fontSize: 12, marginTop: 1 },
  plus: { fontSize: 12, fontWeight: '800' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6 },
});
