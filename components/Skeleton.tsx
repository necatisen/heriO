import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

/** Pulsing placeholder block shown while content loads (instead of a full-screen spinner). */
export function SkeletonBlock({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t]);
  const anim = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.4 }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: theme.border }, anim, style]} />;
}

/** Skeleton of the chat list: a row of match bubbles and a few conversation rows. */
export function ChatListSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.matchRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 8 }}>
            <SkeletonBlock width={64} height={64} radius={32} />
            <SkeletonBlock width={48} height={10} />
          </View>
        ))}
      </View>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock width={56} height={56} radius={28} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock width="45%" height={14} />
            <SkeletonBlock width="75%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  matchRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
});
