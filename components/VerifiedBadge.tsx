import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';

const VERIFIED_BLUE = '#1D9BF0';
const UNVERIFIED_GREY = '#8E8E93';

type VerifiedBadgeProps = {
  size?: number;
  /** false = doğrulanmamış (gri, tıklanınca yüz doğrulaması). */
  verified?: boolean;
  /** Kendi profilinde doğrulanmamışsa tıklanabilir (yüz doğrulaması). */
  onPress?: () => void;
};

export default function VerifiedBadge({ size = 18, verified = true, onPress }: VerifiedBadgeProps) {
  const color = verified ? VERIFIED_BLUE : UNVERIFIED_GREY;
  const icon = (
    <BadgeCheck size={size} color={color} strokeWidth={2.5} style={styles.icon} />
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {icon}
      </TouchableOpacity>
    );
  }
  return <View style={styles.wrap}>{icon}</View>;
}

const styles = StyleSheet.create({
  wrap: {},
  icon: {},
});
