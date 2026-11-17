import type { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BouncyButton from '@/components/BouncyButton';

type Props = {
  title: string;
  onPress?: () => void;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** primary = brand gradient, glass = translucent (on dark backgrounds), outline = bordered */
  variant?: 'primary' | 'glass' | 'outline';
  style?: StyleProp<ViewStyle>;
};

/** Brand button with gradient fill, spring press animation and haptics. */
export default function GradientButton({ title, onPress, icon, loading, disabled, variant = 'primary', style }: Props) {
  const { theme } = useTheme();
  const content = (
    <View style={styles.row}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : icon}
      <Text style={[styles.text, variant === 'outline' && { color: theme.primary }]}>{title}</Text>
    </View>
  );

  return (
    <BouncyButton onPress={onPress} disabled={disabled || loading} pressedScale={0.96} style={[styles.base, { shadowColor: theme.primary }, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, variant === 'glass' ? styles.glass : [styles.outline, { borderColor: theme.primary }]]}>{content}</View>
      )}
    </BouncyButton>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  fill: { borderRadius: 18, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  glass: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
});
