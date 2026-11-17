import { useState, useMemo } from 'react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { L } from '@/lib/l10n';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

type Option = {
  value: string | number;
  label: string;
};

type ComboBoxProps = {
  label?: string;
  value?: string | number;
  selectedValue?: string | number;
  options: Option[];
  onSelect?: (value: string | number) => void;
  onValueChange?: (value: string | number) => void;
  placeholder?: string;
  icon?: React.ReactNode;
};

export default function ComboBox({
  label,
  value,
  selectedValue,
  options,
  onSelect,
  onValueChange,
  placeholder,
  icon,
}: ComboBoxProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modalVisible, setModalVisible] = useState(false);

  const currentValue = selectedValue ?? value;
  const selectedOption = options.find((opt) => opt.value === currentValue);
  const handleSelect = onValueChange ?? onSelect;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={[styles.text, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder || label}
        </Text>
        <ChevronDown size={20} color={theme.primary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || placeholder || L('Seçin', 'Select')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    option.value === currentValue && styles.optionSelected,
                  ]}
                  onPress={() => {
                    handleSelect?.(option.value);
                    setModalVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      option.value === currentValue && styles.optionTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 8,
  },
  icon: {
    width: 20,
    height: 20,
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: t.text,
  },
  placeholder: {
    color: t.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.text,
  },
  optionsList: {
    paddingHorizontal: 20,
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  optionSelected: {
    backgroundColor: t.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: t.text,
  },
  optionTextSelected: {
    color: t.primary,
    fontWeight: '600',
  },
});
