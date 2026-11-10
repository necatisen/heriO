import { forwardRef, useImperativeHandle, useLayoutEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const VELOCITY_THRESHOLD = 800;
const MAX_ROTATION = 14;

export type SwipeDirection = 'left' | 'right';
export type SwipeDeckHandle = { swipe: (dir: SwipeDirection) => void };

type Props = {
  /** Changes whenever the top card changes; used to reset the position. */
  cardKey: string;
  top: ReactNode;
  next?: ReactNode;
  onSwiped: (dir: SwipeDirection) => void;
  onTap?: () => void;
  likeLabel?: string;
  nopeLabel?: string;
};

function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Tinder-style card stack: drag or call ref.swipe() to fling the top card. */
const SwipeDeck = forwardRef<SwipeDeckHandle, Props>(function SwipeDeck(
  { cardKey, top, next, onSwiped, onTap, likeLabel = 'LIKE', nopeLabel = 'NOPE' },
  ref
) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const flying = useSharedValue(false);
  const pastThreshold = useSharedValue(false);

  // New top card: snap back to the centre before it is painted.
  useLayoutEffect(() => {
    tx.value = 0;
    ty.value = 0;
    flying.value = false;
    pastThreshold.value = false;
  }, [cardKey, tx, ty, flying, pastThreshold]);

  const flyOut = (dir: SwipeDirection, velocityX = 0) => {
    'worklet';
    if (flying.value) return;
    flying.value = true;
    const sign = dir === 'right' ? 1 : -1;
    const duration = Math.max(160, 300 - Math.min(Math.abs(velocityX), 2000) / 12);
    tx.value = withTiming(sign * SCREEN_W * 1.5, { duration }, (finished) => {
      if (finished) runOnJS(onSwiped)(dir);
    });
    ty.value = withTiming(ty.value + 40, { duration });
  };

  useImperativeHandle(ref, () => ({
    swipe: (dir: SwipeDirection) => {
      hapticMedium();
      // Small anticipation tilt so button presses feel like a real swipe.
      ty.value = withTiming(-10, { duration: 90 });
      flyOut(dir);
    },
  }));

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-25, 25])
    .onUpdate((e) => {
      if (flying.value) return;
      tx.value = e.translationX;
      ty.value = e.translationY * 0.35;
      const past = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      if (past !== pastThreshold.value) {
        pastThreshold.value = past;
        if (past) runOnJS(hapticLight)();
      }
    })
    .onEnd((e) => {
      if (flying.value) return;
      if (tx.value > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD) {
        runOnJS(hapticMedium)();
        flyOut('right', e.velocityX);
      } else if (tx.value < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD) {
        runOnJS(hapticMedium)();
        flyOut('left', e.velocityX);
      } else {
        tx.value = withSpring(0, { damping: 15, stiffness: 180 });
        ty.value = withSpring(0, { damping: 15, stiffness: 180 });
      }
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (success && onTap) runOnJS(onTap)();
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      {
        rotate: `${interpolate(tx.value, [-SCREEN_W, 0, SCREEN_W], [-MAX_ROTATION, 0, MAX_ROTATION], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const nextStyle = useAnimatedStyle(() => {
    const p = interpolate(Math.abs(tx.value), [0, SWIPE_THRESHOLD * 1.5], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(p, [0, 1], [0.7, 1]),
      transform: [{ scale: interpolate(p, [0, 1], [0.92, 1]) }, { translateY: interpolate(p, [0, 1], [18, 0]) }],
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(tx.value, [20, SWIPE_THRESHOLD], [1.4, 1], Extrapolation.CLAMP) }, { rotate: '-18deg' }],
  }));

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(tx.value, [-SWIPE_THRESHOLD, -20], [1, 1.4], Extrapolation.CLAMP) }, { rotate: '18deg' }],
  }));

  // Soft colour wash over the card in the swipe direction.
  const likeTint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, SWIPE_THRESHOLD * 1.4], [0, 0.28], Extrapolation.CLAMP),
  }));
  const nopeTint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_THRESHOLD * 1.4, 0], [0.28, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.deck}>
      {next ? (
        <Animated.View style={[styles.card, nextStyle]} pointerEvents="none">
          {next}
        </Animated.View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <Animated.View key={cardKey} style={[styles.card, styles.topCard, topStyle]}>
          {top}
          <Animated.View pointerEvents="none" style={[styles.tint, { backgroundColor: '#22C55E' }, likeTint]} />
          <Animated.View pointerEvents="none" style={[styles.tint, { backgroundColor: '#EF4444' }, nopeTint]} />
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.likeStamp, likeStyle]}>
            <Text style={[styles.stampText, { color: '#22C55E' }]}>{likeLabel}</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.nopeStamp, nopeStyle]}>
            <Text style={[styles.stampText, { color: '#EF4444' }]}>{nopeLabel}</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default SwipeDeck;

const styles = StyleSheet.create({
  deck: { flex: 1 },
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  topCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  tint: { ...StyleSheet.absoluteFillObject },
  stamp: {
    position: 'absolute',
    top: 48,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 4,
    borderRadius: 10,
  },
  likeStamp: { left: 24, borderColor: '#22C55E' },
  nopeStamp: { right: 24, borderColor: '#EF4444' },
  stampText: { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
});
