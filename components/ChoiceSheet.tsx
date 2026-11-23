/**
 * Bottom sheet with a list of choices, an X and "Vazgeç".
 * Use instead of Alert.alert when there are more than 2 choices: Android's alert shows at most 3 buttons,
 * so the extra choices (and the cancel button) silently disappear.
 */
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { L } from '@/lib/l10n';

export type Choice = { label: string; onPress: () => void; destructive?: boolean };

export default function ChoiceSheet({
  visible,
  title,
  message,
  choices,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  choices: Choice[];
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel={L('Kapat', 'Close')} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground, paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {message ? <Text style={[styles.sub, { color: theme.textSecondary }]}>{message}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.x} accessibilityLabel={L('Kapat', 'Close')}>
            <X size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 420 }}>
          {choices.map((c, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                onClose();
                c.onPress();
              }}
              style={[styles.row, { borderBottomColor: theme.border }]}>
              <Text style={[styles.rowText, { color: c.destructive ? theme.error : theme.text }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: theme.textSecondary }]}>{L('Vazgeç', 'Cancel')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  title: { fontSize: 19, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  x: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -8 },
  row: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { fontSize: 16, fontWeight: '600' },
  cancel: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
