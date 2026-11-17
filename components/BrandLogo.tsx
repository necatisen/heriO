import { memo, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  /** light = white wordmark (for dark/gradient backgrounds) */
  variant?: 'light' | 'dark';
  /** Soft breathing glow behind the icon. */
  glow?: boolean;
  showWordmark?: boolean;
  style?: ViewStyle;
};

const SIZES = { sm: { icon: 40, font: 22 }, md: { icon: 64, font: 30 }, lg: { icon: 96, font: 38 } };

/** App icon + "Birthchat" wordmark. */
export const BrandLogo = memo(function BrandLogo({
  size = 'md',
  variant = 'light',
  glow = false,
  showWordmark = true,
  style,
}: Props) {
  const s = SIZES[size];
  const { theme } = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!glow) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [glow, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + pulse.value * 0.12,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <View style={{ width: s.icon, height: s.icon, alignItems: 'center', justifyContent: 'center' }}>
        {glow && (
          <Animated.View
            style={[
              styles.glow,
              { width: s.icon * 1.5, height: s.icon * 1.5, borderRadius: s.icon },
              glowStyle,
            ]}
          />
        )}
        <Image
          source={require('@/assets/images/birthchat-logo-256.png')}
          style={{ width: s.icon, height: s.icon, borderRadius: s.icon * 0.24 }}
        />
      </View>
      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            { fontSize: s.font, color: variant === 'light' ? '#FFFFFF' : theme.text },
          ]}>
          Birth<Text style={{ color: variant === 'light' ? '#FFFFFF' : theme.primary, fontWeight: variant === 'light' ? '600' : '900' }}>chat</Text>
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  glow: { position: 'absolute', backgroundColor: '#FFFFFF' },
  wordmark: { fontWeight: '900', letterSpacing: -0.8 },
});
