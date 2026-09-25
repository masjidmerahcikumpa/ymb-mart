import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ShoppingBag, ArrowRight } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { useCartStore } from '@/stores/useCartStore';

interface FloatingCartBarProps {
  onPress?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onPress }) => {
  const items = useCartStore((state) => state.items);
  const cartList = useMemo(() => Object.values(items), [items]);
  const totalItems = useMemo(() => cartList.reduce((acc, it) => acc + it.qty, 0), [cartList]);
  const subtotal = useMemo(() => {
    return cartList.reduce((acc, item) => {
      const price = item.product.promoActive && item.product.promoPrice ? item.product.promoPrice : item.product.price;
      return acc + price * item.qty;
    }, 0);
  }, [cartList]);

  if (totalItems === 0) return null;

  return (
    <View style={styles.floatingContainer}>
      <TouchableOpacity 
        style={styles.bar} 
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Left: Bag Icon & Items count */}
        <View style={styles.leftRow}>
          <View style={styles.bagIcon}>
            <ShoppingBag size={18} color="#FFF" />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalItems}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.itemsLabel}>{totalItems} Barang Dipilih</Text>
            <Text style={styles.priceValue}>{formatRupiah(subtotal)}</Text>
          </View>
        </View>

        {/* Right: Checkout Action */}
        <View style={styles.rightAction}>
          <Text style={styles.viewCartText}>Lihat Keranjang</Text>
          <ArrowRight size={16} color="#FFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 60,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 99,
  },
  bar: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bagIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: Colors.light.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: Colors.light.secondary,
    fontSize: 9,
    fontWeight: '800',
  },
  itemsLabel: {
    color: Colors.light.primaryFixed,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  viewCartText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
