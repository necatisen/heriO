import { useEffect, useMemo } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';

type HeartLoaderProps = {
  size?: number;
  color?: string;
  style?: ViewStyle;
};

export default function HeartLoader({
  size = 72,
  color = '#FF4D6D',
  style,
}: HeartLoaderProps) {
  const pulse = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.07] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Heart size={size} color={color} fill={color} strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

