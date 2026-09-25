import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { Product } from '@/types/product';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { useCartStore } from '@/stores/useCartStore';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const cartItem = useCartStore((state) => state.items[product.id]);
  const addItem = useCartStore((state) => state.addItem);
  const updateQty = useCartStore((state) => state.updateQty);

  const currentQty = cartItem?.qty ?? 0;
  const isDiscounted = product.promoActive && product.promoPrice;
  const finalPrice = isDiscounted ? product.promoPrice! : product.price;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Product Image & Badges */}
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>📦</Text>
          </View>
        )}

        {/* Halal Badge */}
        {product.isHalal && (
          <View style={styles.halalBadge}>
            <Text style={styles.halalText}>HALAL</Text>
          </View>
        )}

        {/* Discount Badge */}
        {product.discountPercent ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discountPercent}%</Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.unit}>{product.unit ? `Per ${product.unit}` : ''}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price Section */}
        <View style={styles.priceRow}>
          <Text style={styles.finalPrice}>{formatRupiah(finalPrice)}</Text>
          {isDiscounted && (
            <Text style={styles.strikePrice}>{formatRupiah(product.price)}</Text>
          )}
        </View>

        {/* Action Button: "+ Tambah" or Quantity Stepper */}
        <View style={styles.actionRow}>
          {currentQty === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addItem(product, 1)}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#FFF" />
              <Text style={styles.addBtnText}>Tambah</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => updateQty(product.id, currentQty - 1)}
                activeOpacity={0.7}
              >
                <Minus size={14} color={Colors.light.tertiaryContainer} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{currentQty}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => updateQty(product.id, currentQty + 1)}
                activeOpacity={0.7}
              >
                <Plus size={14} color={Colors.light.tertiaryContainer} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFF2F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    margin: Spacing.xs,
    cursor: 'pointer' as any,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#F7FAFE',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F9',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  halalBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.light.tertiaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  halalText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.light.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  content: {
    padding: Spacing.sm,
    flex: 1,
    justifyContent: 'space-between',
  },
  unit: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    lineHeight: 16,
    marginTop: 2,
    minHeight: 32,
  },
  priceRow: {
    marginTop: 6,
  },
  finalPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  strikePrice: {
    fontSize: 10,
    color: Colors.light.textMuted,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  actionRow: {
    marginTop: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.light.tertiaryContainer,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDF7F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C3E7D5',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.tertiaryContainer,
  },
});
