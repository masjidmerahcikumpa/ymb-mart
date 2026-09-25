import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, ScanLine } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onPressScan?: () => void;
  onPressInput?: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onPressScan,
  onPressInput,
  placeholder = 'Cari beras, minyak, susu, snack...',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search size={18} color={Colors.light.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textMuted}
          onPressIn={onPressInput}
        />
        <TouchableOpacity 
          style={styles.scanBtn} 
          onPress={onPressScan}
          activeOpacity={0.7}
        >
          <ScanLine size={19} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: Colors.light.text,
    paddingVertical: 0,
  },
  scanBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
