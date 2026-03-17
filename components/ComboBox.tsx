import { useState } from 'react';
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
        <ChevronDown size={20} color="#4A90E2" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || placeholder || 'Select'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#333333" />
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

const styles = StyleSheet.create({
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
    color: '#333333',
  },
  placeholder: {
    color: '#999999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  optionsList: {
    paddingHorizontal: 20,
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionSelected: {
    backgroundColor: '#F0F7FF',
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
  },
  optionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});
