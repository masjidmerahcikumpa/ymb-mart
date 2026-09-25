import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  ShoppingBag,
  ArrowLeft,
  SlidersHorizontal,
  Plus,
  Minus,
  CheckCircle2,
  Tag,
  Zap,
} from 'lucide-react-native';

import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { useCartStore, CartItem } from '@/stores/useCartStore';
import { FloatingCartBar } from '@/components/home/FloatingCartBar';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import { Product } from '@/types/product';

export default function ExploreScreen() {
  const router = useRouter();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | number>('all');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');

  // Cart store
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQty = useCartStore((state) => state.updateQty);

  const cartList: CartItem[] = useMemo(() => Object.values(items), [items]);
  const totalCartCount = useMemo(
    () => cartList.reduce((acc, it) => acc + it.qty, 0),
    [cartList]
  );

  // Categories list with "Semua" option
  const allCategories = useMemo(
    () => [{ id: 'all', name: 'Semua', icon: '🏪' }, ...MOCK_CATEGORIES],
    []
  );

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = MOCK_PRODUCTS.filter((product) => {
      // Category filter
      if (selectedCatId !== 'all' && String(product.category) !== String(selectedCatId)) {
        return false;
      }
      // Promo filter
      if (onlyPromo && !product.promoActive) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(query);
        const matchDesc = product.description ? product.description.toLowerCase().includes(query) : false;
        const matchCategory = product.category.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCategory) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => {
        const pA = a.promoActive && a.promoPrice ? a.promoPrice : a.price;
        const pB = b.promoActive && b.promoPrice ? b.promoPrice : b.price;
        return pA - pB;
      });
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => {
        const pA = a.promoActive && a.promoPrice ? a.promoPrice : a.price;
        const pB = b.promoActive && b.promoPrice ? b.promoPrice : b.price;
        return pB - pA;
      });
    }

    return result;
  }, [selectedCatId, onlyPromo, searchQuery, sortBy]);

  const activeCategoryName = useMemo(() => {
    if (selectedCatId === 'all') return 'Semua Kategori Produk';
    const found = MOCK_CATEGORIES.find((c) => String(c.id) === String(selectedCatId));
    return found ? found.name : 'Produk';
  }, [selectedCatId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Jelajah Katalog</Text>
          <Text style={styles.headerSubtitle}>Baiturrahman Mart • Supermarket Halal</Text>
        </View>

        <TouchableOpacity
          style={styles.cartIconBtn}
          onPress={() => router.push('/cart' as any)}
          activeOpacity={0.7}
        >
          <ShoppingBag size={20} color={Colors.light.primary} />
          {totalCartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={Colors.light.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari beras, minyak, susu, daging halal..."
            placeholderTextColor={Colors.light.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Promo Toggle */}
        <TouchableOpacity
          style={[styles.promoChip, onlyPromo && styles.promoChipActive]}
          onPress={() => setOnlyPromo(!onlyPromo)}
          activeOpacity={0.8}
        >
          <Zap size={14} color={onlyPromo ? '#FFFFFF' : '#D97706'} fill={onlyPromo ? '#FFFFFF' : '#D97706'} />
          <Text style={[styles.promoChipText, onlyPromo && styles.promoChipTextActive]}>
            Diskon 🔥
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Main Split View: Left Categories Sidebar + Right Product List */}
      <View style={styles.mainSplit}>
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
            {allCategories.map((cat) => {
              const isActive = selectedCatId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                  onPress={() => setSelectedCatId(cat.id)}
                  activeOpacity={0.75}
                >
                  {isActive && <View style={styles.activeBar} />}
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[styles.categoryName, isActive && styles.categoryNameActive]}
                    numberOfLines={2}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Right Content Pane */}
        <View style={styles.rightPane}>
          {/* Subheader: Category Title & Count */}
          <View style={styles.rightHeader}>
            <View>
              <Text style={styles.rightHeaderTitle}>{activeCategoryName}</Text>
              <Text style={styles.rightHeaderCount}>
                {filteredProducts.length} Produk Tersedia
              </Text>
            </View>

            {/* Sort Dropdown / Toggle */}
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => {
                if (sortBy === 'default') setSortBy('priceAsc');
                else if (sortBy === 'priceAsc') setSortBy('priceDesc');
                else setSortBy('default');
              }}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={13} color={Colors.light.primary} />
              <Text style={styles.sortBtnText}>
                {sortBy === 'default' ? 'Urutkan' : sortBy === 'priceAsc' ? 'Termurah' : 'Tertinggi'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Product Items List */}
          <ScrollView
            style={styles.productListScroll}
            contentContainerStyle={styles.productListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const cartItem = items[product.id];
                const currentQty = cartItem?.qty ?? 0;
                const isDiscounted = product.promoActive && product.promoPrice;
                const finalPrice = isDiscounted ? product.promoPrice! : product.price;

                return (
                  <View key={product.id} style={styles.productCard}>
                    {/* Thumbnail & Badges */}
                    <TouchableOpacity
                      style={styles.productImageWrap}
                      onPress={() => router.push(`/product/${product.id}` as any)}
                      activeOpacity={0.85}
                    >
                      {product.imageUrl ? (
                        <Image source={{ uri: product.imageUrl }} style={styles.productImg} resizeMode="cover" />
                      ) : (
                        <View style={styles.productImgFallback}>
                          <Text style={{ fontSize: 24 }}>📦</Text>
                        </View>
                      )}

                      {/* Halal Badge */}
                      {product.isHalal && (
                        <View style={styles.halalBadge}>
                          <Text style={styles.halalBadgeText}>HALAL</Text>
                        </View>
                      )}

                      {/* Discount Badge */}
                      {isDiscounted && product.discountPercent && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>-{product.discountPercent}%</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Product Info & Actions */}
                    <View style={styles.productInfo}>
                      <TouchableOpacity
                        onPress={() => router.push(`/product/${product.id}` as any)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.productUnit}>Per {product.unit}</Text>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.priceRow}>
                        <View>
                          {isDiscounted && (
                            <Text style={styles.strikePrice}>{formatRupiah(product.price)}</Text>
                          )}
                          <Text style={styles.finalPrice}>{formatRupiah(finalPrice)}</Text>
                        </View>

                        {/* Add to Cart Stepper */}
                        {currentQty === 0 ? (
                          <TouchableOpacity
                            style={styles.addCartBtn}
                            onPress={() => addItem(product, 1)}
                            activeOpacity={0.85}
                          >
                            <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.addCartText}>Beli</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.stepperContainer}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => updateQty(product.id, currentQty - 1)}
                            >
                              <Minus size={12} color={Colors.light.primary} />
                            </TouchableOpacity>
                            <Text style={styles.stepQtyText}>{currentQty}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => updateQty(product.id, currentQty + 1)}
                            >
                              <Plus size={12} color={Colors.light.primary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              /* Empty Search / Filter State */
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 44, marginBottom: Spacing.sm }}>🔍</Text>
                <Text style={styles.emptyTitle}>Produk Tidak Ditemukan</Text>
                <Text style={styles.emptySub}>
                  Tidak ada barang untuk pencarian "{searchQuery}". Silakan coba kata kunci lain.
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCatId('all');
                    setOnlyPromo(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetFilterText}>Lihat Semua Produk</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Padding for floating bar & tabs */}
            <View style={{ height: 110 }} />
          </ScrollView>
        </View>
      </View>

      {/* 4. Floating Cart Summary Bar */}
      <FloatingCartBar onPress={() => router.push('/cart' as any)} />

      {/* 5. Mobile Bottom Navigation Bar */}
      <BottomNavBar activeTab="categories" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },
  cartIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: Colors.light.secondary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '800',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.text,
    paddingVertical: 0,
  },
  promoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  promoChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  promoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  promoChipTextActive: {
    color: '#FFFFFF',
  },
  mainSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 86,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  sidebarContent: {
    paddingVertical: 6,
  },
  categoryTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    backgroundColor: Colors.light.primary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  categoryIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 13,
  },
  categoryNameActive: {
    color: Colors.light.primary,
    fontWeight: '800',
  },
  rightPane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  rightHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.text,
  },
  rightHeaderCount: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  productListScroll: {
    flex: 1,
  },
  productListContent: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productImageWrap: {
    width: 78,
    height: 78,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productImgFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halalBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  halalBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.light.danger,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 16,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  strikePrice: {
    fontSize: 9,
    color: Colors.light.textMuted,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCartText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepBtn: {
    padding: 3,
  },
  stepQtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.primary,
    minWidth: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  resetFilterBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
