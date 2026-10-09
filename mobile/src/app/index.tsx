import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Header } from '@/components/common/Header';
import { SearchBar } from '@/components/common/SearchBar';
import { LoyaltyRibbon } from '@/components/home/LoyaltyRibbon';
import { PromoBanner } from '@/components/home/PromoBanner';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { FlashSaleSection } from '@/components/home/FlashSaleSection';
import { ProductCard } from '@/components/product/ProductCard';
import { FloatingCartBar } from '@/components/home/FloatingCartBar';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import { AddressModal } from '@/components/common/AddressModal';
import { BarcodeScannerModal } from '@/components/common/BarcodeScannerModal';
import { useAddressStore } from '@/stores/useAddressStore';
import { useAuthStore } from '@/stores/useAuthStore';

import { fetchCategories, fetchProducts } from '@/services/api';
import { Category, Product } from '@/types/product';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { Colors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string | number>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

  const selectedAddress = useAddressStore((state) => state.getSelectedAddress());
  const user = useAuthStore((state) => state.user);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [fetchedCats, fetchedProds] = await Promise.all([
        fetchCategories(),
        fetchProducts(),
      ]);

      // Add "Semua" / All category at the beginning if not present
      const allCategory: Category = { id: 'all', name: 'Semua', icon: '🛒' };
      const formattedCats = fetchedCats.some((c) => c.id === 'all')
        ? fetchedCats
        : [allCategory, ...fetchedCats];

      setCategories(formattedCats);
      setProducts(fetchedProds);
    } catch (err) {
      console.warn('[HomeScreen] Error loading data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));

    const matchesCategory =
      selectedCategory === 'all' ||
      p.category.toLowerCase() === String(selectedCategory).toLowerCase() ||
      categories.find((c) => c.id === selectedCategory)?.name.toLowerCase() === p.category.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleScanBarcode = () => {
    setShowScannerModal(true);
  };

  const handleRedeemPoints = () => {
    router.push('/profile' as any);
  };

  const handleViewCart = () => {
    router.push('/cart' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Header (Alamat & Garansi 15-30 Menit) */}
      <Header
        address={`${selectedAddress.label} - ${selectedAddress.addressLine.split(',')[0]}`}
        onPressAddress={() => setShowAddressModal(true)}
        onPressNotification={() => Alert.alert('Notifikasi', 'Tidak ada notifikasi baru.')}
        onPressWishlist={() => Alert.alert('Favorit', 'Daftar produk favorit Anda.')}
      />

      {/* 2. Search Bar + Barcode Scanner */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onPressScan={handleScanBarcode}
      />

      {/* 3. Main Scrollable Canvas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
      >
        {/* Member Loyalty Ribbon */}
        <LoyaltyRibbon
          points={user.points}
          tier={user.tier}
          onPressRedeem={handleRedeemPoints}
        />

        {/* Hero Promo Banner */}
        <PromoBanner onPressClaim={() => Alert.alert('Promo', 'Kupon Gratis Ongkir Rp 10.000 berhasil diklaim!')} />

        {/* Categories Section */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Kategori Pilihan</Text>
        </View>
        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(id) => setSelectedCategory(id)}
        />

        {/* Flash Sale Section */}
        <FlashSaleSection onPressViewAll={() => Alert.alert('Flash Sale', 'Semua promo flash sale aktif.')} />

        {/* Products Grid */}
        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.gridItem}>
              <ProductCard
                product={product}
                onPress={() => router.push(`/product/${product.id}` as any)}
              />
            </View>
          ))}
        </View>

        {/* Space for bottom floating bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 4. Floating Cart Summary Bar */}
      <FloatingCartBar onPress={handleViewCart} />

      {/* 5. Mobile Bottom Navigation Bar */}
      <BottomNavBar activeTab="home" />

      {/* 6. Address Selection & Creation Modal */}
      <AddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
      />

      {/* 7. In-Store Barcode & Price Checker Scanner */}
      <BarcodeScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  scrollContent: {
    paddingVertical: Spacing.xs,
  },
  sectionTitleRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '50%',
    padding: 2,
  },
});
