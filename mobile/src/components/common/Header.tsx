import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, ChevronDown, Bell, Zap, Heart } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface HeaderProps {
  address?: string;
  onPressAddress?: () => void;
  onPressNotification?: () => void;
  onPressWishlist?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  address = 'Rumah - Jl. Cikumpa No. 12',
  onPressAddress,
  onPressNotification,
  onPressWishlist,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Location Section */}
        <TouchableOpacity 
          style={styles.locationContainer} 
          onPress={onPressAddress}
          activeOpacity={0.7}
        >
          <View style={styles.pinWrapper}>
            <MapPin size={20} color={Colors.light.primary} />
          </View>
          <View style={styles.locationTextWrapper}>
            <View style={styles.addressRow}>
              <Text style={styles.addressLabel} numberOfLines={1}>
                Kirim ke: <Text style={styles.addressBold}>{address}</Text>
              </Text>
              <ChevronDown size={16} color={Colors.light.primary} />
            </View>
            
            {/* Express Guarantee Pill */}
            <View style={styles.pillRow}>
              <View style={styles.expressPill}>
                <Zap size={11} color={Colors.light.secondary} fill={Colors.light.secondary} />
                <Text style={styles.expressText}>15-30 Menit</Text>
              </View>
              <Text style={styles.subtext}>• Cepat & Segar</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={onPressWishlist}
            activeOpacity={0.7}
          >
            <Heart size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={onPressNotification}
            activeOpacity={0.7}
          >
            <Bell size={20} color={Colors.light.primary} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3FA',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: Spacing.sm,
  },
  pinWrapper: {
    marginRight: Spacing.xs,
  },
  locationTextWrapper: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addressLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  addressBold: {
    fontWeight: '700',
    color: Colors.light.primary,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  expressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.light.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  expressText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.secondary,
  },
  subtext: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F7FC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.danger,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
