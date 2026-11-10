import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  disabled?: boolean;
  /** How far the button shrinks while pressed (default 0.88). */
  pressedScale?: number;
  haptic?: boolean;
};

/** Button that springs down on press and bounces back. */
export default function BouncyButton({ onPress, style, children, disabled, pressedScale = 0.88, haptic = true }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(pressedScale, { damping: 12, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 8, stiffness: 300 });
      }}
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={[style, animatedStyle, disabled && { opacity: 0.5 }]}>
      {children}
    </AnimatedPressable>
  );
}
