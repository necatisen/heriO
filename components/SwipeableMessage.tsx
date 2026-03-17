import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { Reply } from 'lucide-react-native';

type SwipeableMessageProps = {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  isMyMessage: boolean;
  showReplyIcon?: boolean;
  style?: any;
};

export default function SwipeableMessage({
  children,
  onSwipeLeft,
  isMyMessage,
  showReplyIcon = true,
  style,
}: SwipeableMessageProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(lastOffset.current);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isMyMessage) {
          if (gestureState.dx > 0) {
            translateX.setValue(Math.min(gestureState.dx, 60));
          }
        } else {
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -60));
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();

        const threshold = 50;
        const shouldTrigger = isMyMessage
          ? gestureState.dx > threshold
          : gestureState.dx < -threshold;

        if (shouldTrigger) {
          onSwipeLeft();
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 10,
        }).start();

        lastOffset.current = 0;
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.messageContainer,
          style,
          {
            transform: [{ translateX }],
          },
        ]}>
        {children}
      </Animated.View>

      {showReplyIcon && (isMyMessage ? (
        <View style={styles.replyIconLeft}>
          <Reply size={20} color="#999999" />
        </View>
      ) : (
        <View style={styles.replyIconRight}>
          <Reply size={20} color="#999999" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  messageContainer: {
    zIndex: 1,
  },
  replyIconLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -10,
    zIndex: 0,
  },
  replyIconRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -10,
    zIndex: 0,
  },
});
