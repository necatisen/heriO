import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Vivid theme gradient at the top of a screen that melts smoothly into the page
 * background. Place it as the first child of a screen; content renders on top.
 */
export default function HeroFade({ height = 280, fadeFrom = 0.45 }: { height?: number; fadeFrom?: number }) {
  const { theme } = useTheme();
  const bg = theme.background;
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[`${bg}00`, `${bg}00`, `${bg}CC`, bg]}
        locations={[0, fadeFrom, fadeFrom + (1 - fadeFrom) * 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
});
