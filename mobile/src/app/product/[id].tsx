import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  ShoppingBag,
  Zap,
  CheckCircle2,
  MessageSquare,
  Plus,
  Minus,
  ShieldCheck,
  Store,
} from 'lucide-react-native';

import { MOCK_PRODUCTS } from '@/constants/mockData';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { useCartStore } from '@/stores/useCartStore';
import { fetchProductById } from '@/services/api';
import { Product } from '@/types/product';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product>(
    () => MOCK_PRODUCTS.find((p) => p.id === Number(id)) ?? MOCK_PRODUCTS[0]
  );

  React.useEffect(() => {
    let isMounted = true;
    if (id) {
      fetchProductById(Number(id)).then((found) => {
        if (isMounted && found) {
          setProduct(found);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  const items = useCartStore((state) => state.items);
  const cartItem = items[product.id];
  const addItem = useCartStore((state) => state.addItem);
  const totalCartItems = useMemo(
    () => Object.values(items).reduce((acc, it) => acc + it.qty, 0),
    [items]
  );

  const [qty, setQty] = useState(cartItem?.qty || 1);
  const [shopperNote, setShopperNote] = useState(cartItem?.shopperNote || '');
  const [deliveryMethod, setDeliveryMethod] = useState<'express' | 'pickup'>('express');

  const isDiscounted = product.promoActive && product.promoPrice;
  const finalPrice = isDiscounted ? product.promoPrice! : product.price;

  const handleAddToCart = () => {
    addItem(product, qty, shopperNote);
    Alert.alert(
      'Berhasil Ditambahkan! 🛍️',
      `${qty}x ${product.name} telah dimasukkan ke keranjang belanja.`,
      [
        { text: 'Lanjut Belanja', style: 'cancel' },
        { text: 'Lihat Keranjang', onPress: () => router.push('/cart' as any) },
      ]
    );
  };

  const handleShare = () => {
    Alert.alert('Bagikan Produk', `Bagikan tautan ${product.name} ke WhatsApp warga.`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          Detail Produk
        </Text>

        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navBtn} onPress={handleShare} activeOpacity={0.7}>
            <Share2 size={19} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.push('/cart' as any)}
            activeOpacity={0.7}
          >
            <ShoppingBag size={19} color={Colors.light.primary} />
            {totalCartItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalCartItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Scrollable Body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Hero Image */}
        <View style={styles.imageBox}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={{ fontSize: 60 }}>📦</Text>
            </View>
          )}

          {/* Halal Certified Tag */}
          {product.isHalal && (
            <View style={styles.halalPill}>
              <ShieldCheck size={14} color="#FFF" />
              <Text style={styles.halalPillText}>HALAL RESMI</Text>
            </View>
          )}

          {/* Discount Tag */}
          {product.discountPercent && (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>HEMAT {product.discountPercent}%</Text>
            </View>
          )}
        </View>

        {/* Product Basic Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.unitText}>KEMASAN {product.unit.toUpperCase()}</Text>
          <Text style={styles.productName}>{product.name}</Text>

          {/* Price Row */}
          <View style={styles.priceRow}>
            <Text style={styles.finalPrice}>{formatRupiah(finalPrice)}</Text>
            {isDiscounted && (
              <Text style={styles.originalPrice}>{formatRupiah(product.price)}</Text>
            )}
          </View>

          {/* Stock info */}
          <View style={styles.stockRow}>
            <CheckCircle2 size={14} color={Colors.light.tertiaryContainer} />
            <Text style={styles.stockText}>
              Stok Tersedia di Toko ({product.stock} {product.unit})
            </Text>
          </View>
        </View>

        {/* Delivery Mode Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Opsi Pengambilan / Antar</Text>
          <View style={styles.deliveryOptions}>
            {/* Express Delivery */}
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryMethod === 'express' && styles.deliveryOptionActive,
              ]}
              onPress={() => setDeliveryMethod('express')}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconBox}>
                <Zap size={18} color={deliveryMethod === 'express' ? Colors.light.primary : Colors.light.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Express 15-30 Menit</Text>
                <Text style={styles.optionSub}>Diantar kurir langsung ke depan pintu</Text>
              </View>
            </TouchableOpacity>

            {/* Self Pickup */}
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryMethod === 'pickup' && styles.deliveryOptionActive,
              ]}
              onPress={() => setDeliveryMethod('pickup')}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconBox}>
                <Store size={18} color={deliveryMethod === 'pickup' ? Colors.light.primary : Colors.light.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Ambil Sendiri (Pickup)</Text>
                <Text style={styles.optionSub}>Disiapkan staf toko, tinggal ambil tanpa antre</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌟 Personal Shopper Note Section */}
        <View style={styles.sectionCard}>
          <View style={styles.shopperHeader}>
            <MessageSquare size={16} color={Colors.light.primary} />
            <Text style={styles.sectionHeader}>Catatan untuk Personal Shopper</Text>
          </View>
          <Text style={styles.shopperSub}>
            Tulis permintaan khusus untuk staf toko saat mengambil barang ini.
          </Text>
          <TextInput
            style={styles.shopperInput}
            value={shopperNote}
            onChangeText={setShopperNote}
            placeholder="Contoh: Tolong pilihkan kemasan yang tidak penyok dan expired terlama..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Product Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Deskripsi Produk</Text>
          <Text style={styles.descText}>
            {product.description || 'Produk kualitas pilihan terbaik dari Baiturrahman Mart. Dijamin higienis, halal, dan amanah.'}
          </Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Kode SKU</Text>
            <Text style={styles.specValue}>{product.sku}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Barcode Toko</Text>
            <Text style={styles.specValue}>{product.barcode}</Text>
          </View>
        </View>

        {/* Bottom padding so content isn't hidden under sticky bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 3. Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {/* Quantity Stepper */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setQty((prev) => Math.max(1, prev - 1))}
            activeOpacity={0.7}
          >
            <Minus size={16} color={Colors.light.primary} />
          </TouchableOpacity>
          <Text style={styles.stepText}>{qty}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setQty((prev) => Math.min(product.stock, prev + 1))}
            activeOpacity={0.7}
          >
            <Plus size={16} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        {/* Add to Cart CTA */}
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <ShoppingBag size={18} color="#FFF" />
          <Text style={styles.addToCartText}>
            + Keranjang • {formatRupiah(finalPrice * qty)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3FA',
    backgroundColor: '#FFFFFF',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F7FC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  navActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.light.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.light.secondary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  imageBox: {
    width: '100%',
    height: 280,
    backgroundColor: '#F7FAFE',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halalPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tertiaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  halalPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  discountPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.light.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F9',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
    lineHeight: 24,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: Spacing.sm,
  },
  finalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textDecorationLine: 'line-through',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tertiaryContainer,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F9',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
  },
  deliveryOptions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
  },
  deliveryOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  optionSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  shopperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopperSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  shopperInput: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    fontSize: 12,
    color: Colors.light.text,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  descText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F3FA',
    marginTop: Spacing.xs,
  },
  specLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F9',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F7FC',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
