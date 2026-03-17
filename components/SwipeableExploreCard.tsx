import { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';

const SWIPE_THRESHOLD = 100;
const MAX_ROTATION = 12;

type SwipeableExploreCardProps = {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: object;
};

export default function SwipeableExploreCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  style,
}: SwipeableExploreCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 8;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(lastOffset.current);
        translateX.setValue(0);
        rotate.setOffset(0);
        rotate.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx;
        translateX.setValue(dx);
        const rot = Math.min(Math.max((dx / 200) * MAX_ROTATION, -MAX_ROTATION), MAX_ROTATION);
        rotate.setValue(rot);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        rotate.flattenOffset();
        const dx = gestureState.dx;
        const vx = gestureState.vx;
        const shouldSwipeRight = dx > SWIPE_THRESHOLD || (dx > 40 && vx > 0.3);
        const shouldSwipeLeft = dx < -SWIPE_THRESHOLD || (dx < -40 && vx < -0.3);

        if (shouldSwipeRight) {
          lastOffset.current = 0;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 400,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: MAX_ROTATION,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            translateX.setValue(0);
            rotate.setValue(0);
            lastOffset.current = 0;
            onSwipeRight();
          });
        } else if (shouldSwipeLeft) {
          lastOffset.current = 0;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -400,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: -MAX_ROTATION,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            translateX.setValue(0);
            rotate.setValue(0);
            lastOffset.current = 0;
            onSwipeLeft();
          });
        } else {
          lastOffset.current = 0;
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }),
          ]).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    translateX.setValue(0);
    rotate.setValue(0);
    lastOffset.current = 0;
  }, [children]);

  const animatedStyle = {
    transform: [
      { translateX },
      { rotate: rotate.interpolate({ inputRange: [-MAX_ROTATION, MAX_ROTATION], outputRange: [`-${MAX_ROTATION}deg`, `${MAX_ROTATION}deg`] }) },
    ],
  };

  return (
    <Animated.View style={[styles.wrapper, style, animatedStyle]} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
