import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Category } from '@/types/product';
import { Colors, Spacing } from '@/constants/theme';

interface CategoryGridProps {
  categories: Category[];
  selectedCategory?: string | number;
  onSelectCategory?: (id: string | number) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.item}
              onPress={() => onSelectCategory?.(cat.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrapper, isSelected && styles.selectedWrapper]}>
                <Text style={styles.icon}>{cat.icon}</Text>
              </View>
              <Text 
                style={[styles.name, isSelected && styles.selectedName]} 
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  item: {
    width: '22%',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F6FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7ECF8',
  },
  selectedWrapper: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  icon: {
    fontSize: 24,
  },
  name: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  selectedName: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});
