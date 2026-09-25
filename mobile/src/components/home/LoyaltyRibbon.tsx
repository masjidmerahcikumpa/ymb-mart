import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface LoyaltyRibbonProps {
  points?: number;
  tier?: string;
  onPressRedeem?: () => void;
}

export const LoyaltyRibbon: React.FC<LoyaltyRibbonProps> = ({
  points = 1450,
  tier = 'VIP GOLD',
  onPressRedeem,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <View style={styles.iconCircle}>
          <Sparkles size={20} color={Colors.light.secondaryContainer} fill={Colors.light.secondaryContainer} />
        </View>
        <View>
          <View style={styles.badgeRow}>
            <Text style={styles.memberTitle}>YMB Member</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{tier}</Text>
            </View>
          </View>
          <Text style={styles.pointsText}>
            <Text style={styles.pointsBold}>{points.toLocaleString('id-ID')}</Text> Poin Tersedia
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.redeemBtn} 
        onPress={onPressRedeem}
        activeOpacity={0.8}
      >
        <Text style={styles.redeemText}>Tukar Hadiah</Text>
        <ChevronRight size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFEFA6',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F6DF80',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.secondary,
  },
  tierBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  pointsText: {
    fontSize: 11,
    color: '#5C4800',
    marginTop: 2,
  },
  pointsBold: {
    fontWeight: '800',
    color: Colors.light.secondary,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  redeemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
