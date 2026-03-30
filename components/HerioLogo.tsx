import { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Heart } from 'lucide-react-native';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  style?: ViewStyle;
};

export const HerioLogo = memo(function HerioLogo({
  size = 'md',
  variant = 'light',
  style,
}: Props) {
  const s = size === 'lg' ? sizes.lg : size === 'sm' ? sizes.sm : sizes.md;
  const isLight = variant === 'light';
  const heartStyle: ViewStyle = {
    position: 'absolute',
    top: s.heartTop,
    right: s.heartRight,
  };

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <View style={styles.wordmarkWrap}>
        <Text
          style={[
            styles.wordmark,
            s.wordmark,
            isLight ? styles.wordmarkLight : styles.wordmarkDark,
            { lineHeight: s.wordmark.fontSize as number },
          ]}>
          heriO
        </Text>
        <Heart
          size={s.heartSize}
          color="#FF4D6D"
          fill="#FF4D6D"
          strokeWidth={1.9}
          style={heartStyle}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wordmark: {
    letterSpacing: -0.8,
    fontWeight: '900',
  } as TextStyle,
  wordmarkLight: {
    color: '#FFFFFF',
  } as TextStyle,
  wordmarkDark: {
    color: '#0B1220',
  } as TextStyle,
  wrap: {
    overflow: 'visible',
  },
  wordmarkWrap: {
    position: 'relative',
    overflow: 'visible',
  },
});

const sizes: Record<
  NonNullable<Props['size']>,
  { wordmark: TextStyle; heartSize: number; heartTop: number; heartRight: number }
> = {
  sm: {
    wordmark: { fontSize: 24, fontWeight: '800' },
    heartSize: 22,
    heartTop: -14,
    heartRight: -6,
  },
  md: {
    wordmark: { fontSize: 34, fontWeight: '900' },
    heartSize: 30,
    heartTop: -18,
    heartRight: -8,
  },
  lg: {
    wordmark: { fontSize: 44, fontWeight: '900' },
    // O'nun üst-sağına gelecek şekilde bindirmeyi azaltıyoruz.
    heartSize: 15,
    heartTop: -8,
    heartRight: -10,
  },
};

