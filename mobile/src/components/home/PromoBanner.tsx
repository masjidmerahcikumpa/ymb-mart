import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ticket } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface PromoBannerProps {
  onPressClaim?: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ onPressClaim }) => {
  return (
    <View style={styles.banner}>
      {/* Decorative Badge */}
      <View style={styles.tag}>
        <Text style={styles.tagText}>🎉 Promo Berkah Baiturrahman Mart</Text>
      </View>

      {/* Main Text */}
      <Text style={styles.headline}>Diskon s/d 40%{'\n'}Sembako & Dapur</Text>
      <Text style={styles.subtitle}>Gratis Ongkir min. belanja Rp 30rb</Text>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity 
          style={styles.claimBtn} 
          onPress={onPressClaim}
          activeOpacity={0.85}
        >
          <Text style={styles.claimText}>Klaim Kupon</Text>
          <Ticket size={14} color={Colors.light.secondary} />
        </TouchableOpacity>

        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.light.primary,
    borderRadius: 20,
    padding: Spacing.md + 4,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: Spacing.sm,
  },
  tagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headline: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.light.primaryFixed,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  claimText: {
    color: Colors.light.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    width: 16,
    backgroundColor: Colors.light.secondaryContainer,
  },
});
