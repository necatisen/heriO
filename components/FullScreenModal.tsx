import { ReactNode } from 'react';
import { Modal, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  animationType?: 'none' | 'slide' | 'fade';
  overlayStyle?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function FullScreenModal({
  visible,
  onRequestClose,
  children,
  animationType = 'slide',
  overlayStyle,
  contentStyle,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent
      onRequestClose={onRequestClose}
    >
      <View style={[styles.overlay, overlayStyle]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
});

