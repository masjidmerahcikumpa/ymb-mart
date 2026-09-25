import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
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

import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { Colors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | number>('sembako');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleScanBarcode = () => {
    Alert.alert(
      'Barcode Scanner',
      'Arahkan kamera ke barcode produk di rak toko Baiturrahman Mart untuk melihat ulasan & promo member.',
      [{ text: 'OK' }]
    );
  };

  const handleRedeemPoints = () => {
    Alert.alert(
      'Tukar Poin YMB Gold',
      'Anda memiliki 1.450 Poin. Poin dapat ditukarkan dengan Voucher Belanja Rp 15.000 atau Minyak Goreng 1L.',
      [{ text: 'Tutup' }]
    );
  };

  const handleViewCart = () => {
    router.push('/cart' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Header (Alamat & Garansi 15-30 Menit) */}
      <Header
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
      >
        {/* Member Loyalty Ribbon */}
        <LoyaltyRibbon onPressRedeem={handleRedeemPoints} />

        {/* Hero Promo Banner */}
        <PromoBanner onPressClaim={() => Alert.alert('Promo', 'Kupon Gratis Ongkir Rp 10.000 berhasil diklaim!')} />

        {/* Categories Section */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Kategori Pilihan</Text>
        </View>
        <CategoryGrid
          categories={MOCK_CATEGORIES}
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
