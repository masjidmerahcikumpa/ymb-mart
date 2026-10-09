import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  Store,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Receipt,
  HelpCircle,
  Zap,
} from 'lucide-react-native';

import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { useCartStore, CartItem, PlacedOrder } from '@/stores/useCartStore';
import { fetchOrderDetails, BackendOrder } from '@/services/api';

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Read order from cart store fallback
  const getOrderById = useCartStore((state) => state.getOrderById);
  const rawLastOrder = useCartStore((state) => state.lastOrder);
  const lastOrder = useMemo(() => {
    if (typeof id === 'string' && id) {
      return getOrderById(id) || rawLastOrder;
    }
    return rawLastOrder;
  }, [id, getOrderById, rawLastOrder]);
  const items = useCartStore((state) => state.items);

  const orderId =
    (typeof id === 'string' && id) ||
    lastOrder?.orderId ||
    'YMB-20261002-881';

  // Live Backend State
  const [backendOrder, setBackendOrder] = useState<BackendOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await fetchOrderDetails(orderId);
      if (data) {
        setBackendOrder(data);
      }
    } catch (err) {
      console.warn('Error fetching order tracking:', err);
    }
  }, [orderId]);

  useEffect(() => {
    setIsLoadingOrder(true);
    loadOrder().finally(() => setIsLoadingOrder(false));

    // Poll status every 10 seconds if order not yet completed or cancelled
    const timer = setInterval(() => {
      loadOrder();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadOrder]);

  const cartItems: CartItem[] = useMemo(() => {
    if (lastOrder && lastOrder.items.length > 0) {
      return lastOrder.items;
    }
    return Object.values(items);
  }, [lastOrder, items]);

  // Derived step & courier info
  const orderStatus = backendOrder?.status || (lastOrder?.status === 'active' ? 'delivering' : 'completed');

  const activeStep = useMemo(() => {
    if (orderStatus === 'pending_payment') return 1;
    if (orderStatus === 'paid') return 2;
    if (orderStatus === 'delivering') return 3;
    if (orderStatus === 'completed') return 4;
    return 3;
  }, [orderStatus]);

  const driverName = backendOrder?.driver_name || lastOrder?.driverName || 'Pak Joko (Kurir Kilat Masjid)';
  const driverPhone = backendOrder?.driver_phone || lastOrder?.driverPhone || '+628123456789';
  const etaMinutes = backendOrder?.eta_minutes ?? 12;

  const [showReceipt, setShowReceipt] = useState(false);

  const handleCallCourier = () => {
    const cleanPhone = driverPhone.replace(/[^0-9]/g, '');
    Alert.alert(
      'Hubungi Kurir',
      `Menghubungi ${driverName} (${driverPhone})?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Panggil', onPress: () => Linking.openURL(`tel:${cleanPhone}`).catch(() => {}) },
      ]
    );
  };

  const handleWhatsAppCourier = () => {
    let cleanPhone = driverPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    const msg = `Halo ${driverName}, saya pemesan pesanan #${orderId} di Baiturrahman Mart.`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert('Gagal Membuka WhatsApp', 'Pastikan aplikasi WhatsApp terpasang di perangkat Anda.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Header Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.navTitle}>Lacak Pesanan</Text>
          <Text style={styles.orderIdSub}>#{orderId}</Text>
        </View>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => Alert.alert('Bantuan Toko', 'Hubungi CS Baiturrahman Mart: 0811-2233-4455')}
          activeOpacity={0.7}
        >
          <HelpCircle size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 2. Scrollable Body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 🗺️ Live Map Simulation Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapCanvas}>
            {/* Background Map Grid Pattern */}
            <View style={styles.gridLineHorizontal1} />
            <View style={styles.gridLineHorizontal2} />
            <View style={styles.gridLineVertical1} />
            <View style={styles.gridLineVertical2} />

            {/* Store Pin (Start) */}
            <View style={styles.storePin}>
              <View style={styles.storeIconCircle}>
                <Store size={14} color="#FFF" />
              </View>
              <Text style={styles.pinLabel}>Baiturrahman Mart</Text>
            </View>

            {/* Route Dashed Path */}
            <View style={styles.routeLine} />

            {/* Courier Motor Indicator */}
            <View style={[
              styles.courierPin,
              activeStep <= 2 && { left: '16%' },
              activeStep >= 4 && { left: '80%' },
            ]}>
              <View style={styles.pulseRing} />
              <View style={styles.courierIconCircle}>
                <Text style={{ fontSize: 16 }}>{activeStep >= 4 ? '🏠' : '🛵'}</Text>
              </View>
              <View style={styles.courierTag}>
                <Text style={styles.courierTagText}>
                  {activeStep === 4 ? 'Tiba di Rumah' : activeStep <= 2 ? 'Di Toko' : `${driverName.split(' ')[0]} (1.2 km)`}
                </Text>
              </View>
            </View>

            {/* Destination Pin (Home) */}
            <View style={styles.homePin}>
              <View style={styles.homeIconCircle}>
                <MapPin size={14} color="#FFF" />
              </View>
              <Text style={styles.pinLabel}>Rumah Anda</Text>
            </View>
          </View>

          {/* Express Guarantee Tag */}
          <View style={styles.mapFooter}>
            <View style={styles.expressTag}>
              <Zap size={13} color={Colors.light.secondary} fill={Colors.light.secondary} />
              <Text style={styles.expressTagText}>Pengiriman Kilat Express • Kurir Toko Baiturrahman</Text>
            </View>
          </View>
        </View>

        {/* ⏱️ ETA Arrival Banner */}
        <View style={styles.etaCard}>
          <View style={styles.etaLeft}>
            <View style={styles.etaClockCircle}>
              <Clock size={22} color={Colors.light.primary} />
            </View>
            <View>
              <Text style={styles.etaTitle}>
                {activeStep === 4 ? 'Pesanan Selesai' : activeStep === 3 ? 'Estimasi Tiba Dalam' : 'Status Pengiriman'}
              </Text>
              <Text style={styles.etaTime}>
                {activeStep === 4 ? 'Sudah Diterima' : activeStep === 3 ? `${etaMinutes} Menit Lagi` : 'Sedang Diproses Toko'}
              </Text>
            </View>
          </View>
          <View style={[
            styles.etaStatusPill,
            activeStep === 4 && { backgroundColor: '#E8F5E9' },
            activeStep <= 2 && { backgroundColor: '#FFF3E0' },
          ]}>
            <Text style={[
              styles.etaStatusText,
              activeStep === 4 && { color: '#059669' },
              activeStep <= 2 && { color: '#D97706' },
            ]}>
              {activeStep === 4 ? 'Selesai' : activeStep === 3 ? 'Di Jalan' : activeStep === 2 ? 'Dikemas' : 'Menunggu'}
            </Text>
          </View>
        </View>

        {/* 🛵 Courier Profile & Quick Actions */}
        <View style={styles.courierCard}>
          <View style={styles.courierHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👨‍💼</Text>
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <View style={styles.courierNameRow}>
                <Text style={styles.courierName}>{driverName}</Text>
                <View style={styles.badgeVerified}>
                  <Text style={styles.badgeVerifiedText}>KURIR RESMI</Text>
                </View>
              </View>
              <Text style={styles.vehicleInfo}>Honda Vario • B 1234 XYZ</Text>
              <Text style={styles.ratingText}>⭐ 4.9 • Pengantaran Amanah & Cepat</Text>
            </View>
          </View>

          {/* Action Buttons: Chat WA & Call */}
          <View style={styles.courierActionsRow}>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={handleWhatsAppCourier}
              activeOpacity={0.8}
            >
              <MessageCircle size={16} color="#059669" />
              <Text style={styles.chatBtnText}>Chat WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={handleCallCourier}
              activeOpacity={0.8}
            >
              <Phone size={16} color={Colors.light.primary} />
              <Text style={styles.callBtnText}>Telepon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 📋 Order Progress Stepper (Timeline) */}
        <View style={styles.stepperCard}>
          <Text style={styles.sectionTitle}>Status Perjalanan Pesanan</Text>

          <View style={styles.timeline}>
            {/* Step 1: Diterima */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepDot, activeStep >= 1 ? styles.stepDotDone : undefined]}>
                  <CheckCircle2 size={14} color="#FFF" />
                </View>
                <View style={[styles.stepLine, activeStep >= 2 ? styles.stepLineDone : undefined]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={activeStep >= 1 ? styles.stepTitleDone : styles.stepTitlePending}>Pesanan Diterima</Text>
                <Text style={styles.stepSub}>Pembayaran QRIS telah terverifikasi otomatis</Text>
              </View>
            </View>

            {/* Step 2: Dikemas Personal Shopper */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[
                  styles.stepDot,
                  activeStep > 2 ? styles.stepDotDone : activeStep === 2 ? styles.stepDotActive : undefined
                ]}>
                  {activeStep > 2 ? <CheckCircle2 size={14} color="#FFF" /> : <Text style={{ fontSize: 10 }}>📦</Text>}
                </View>
                <View style={[styles.stepLine, activeStep >= 3 ? styles.stepLineDone : undefined]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={activeStep > 2 ? styles.stepTitleDone : activeStep === 2 ? styles.stepTitleActive : styles.stepTitlePending}>
                  Sedang Dikemas Personal Shopper
                </Text>
                <Text style={styles.stepSub}>Staf toko memilihkan barang segar sesuai catatan belanja</Text>
              </View>
            </View>

            {/* Step 3: Kurir Menuju Lokasi */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[
                  styles.stepDot,
                  activeStep > 3 ? styles.stepDotDone : activeStep === 3 ? styles.stepDotActive : undefined
                ]}>
                  {activeStep > 3 ? <CheckCircle2 size={14} color="#FFF" /> : <Text style={{ fontSize: 10 }}>🛵</Text>}
                </View>
                <View style={[styles.stepLine, activeStep >= 4 ? styles.stepLineDone : undefined]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={activeStep > 3 ? styles.stepTitleDone : activeStep === 3 ? styles.stepTitleActive : styles.stepTitlePending}>
                  Kurir Sedang Menuju Lokasimu
                </Text>
                <Text style={activeStep === 3 ? styles.stepSubActive : styles.stepSub}>
                  {driverName} sedang meluncur ke alamat tujuan
                </Text>
              </View>
            </View>

            {/* Step 4: Selesai */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepDot, activeStep === 4 ? styles.stepDotDone : undefined]}>
                  {activeStep === 4 ? <CheckCircle2 size={14} color="#FFF" /> : <View style={styles.dotInner} />}
                </View>
              </View>
              <View style={styles.stepContent}>
                <Text style={activeStep === 4 ? styles.stepTitleDone : styles.stepTitlePending}>Pesanan Tiba & Selesai</Text>
                <Text style={styles.stepSub}>Pesanan telah diterima oleh pembeli</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 🧾 Order Items Receipt Accordion */}
        <View style={styles.receiptCard}>
          <TouchableOpacity
            style={styles.receiptHeader}
            onPress={() => setShowReceipt(!showReceipt)}
            activeOpacity={0.8}
          >
            <View style={styles.receiptHeaderLeft}>
              <Receipt size={18} color={Colors.light.primary} />
              <Text style={styles.receiptTitle}>Rincian Barang yang Diantar</Text>
            </View>
            {showReceipt ? (
              <ChevronUp size={18} color={Colors.light.textMuted} />
            ) : (
              <ChevronDown size={18} color={Colors.light.textMuted} />
            )}
          </TouchableOpacity>

          {showReceipt && (
            <View style={styles.receiptBody}>
              {backendOrder && backendOrder.items && backendOrder.items.length > 0 ? (
                backendOrder.items.map((it, idx) => (
                  <View key={idx} style={styles.receiptItemRow}>
                    <Text style={styles.receiptItemQty}>{it.qty}x</Text>
                    <Text style={styles.receiptItemName} numberOfLines={1}>
                      {it.product_name}
                    </Text>
                    <Text style={styles.receiptItemPrice}>{formatRupiah(it.subtotal)}</Text>
                  </View>
                ))
              ) : cartItems.length > 0 ? (
                cartItems.map(({ product, qty }) => (
                  <View key={product.id} style={styles.receiptItemRow}>
                    <Text style={styles.receiptItemQty}>{qty}x</Text>
                    <Text style={styles.receiptItemName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.receiptItemPrice}>
                      {formatRupiah((product.promoActive && product.promoPrice ? product.promoPrice : product.price) * qty)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemQty}>1x</Text>
                  <Text style={styles.receiptItemName}>Produk Belanja Toko</Text>
                  <Text style={styles.receiptItemPrice}>{formatRupiah(backendOrder?.total_amount || 0)}</Text>
                </View>
              )}

              <View style={styles.receiptDivider} />

              <View style={[styles.receiptTotalRow, { marginBottom: 4 }]}>
                <Text style={styles.receiptTotalLabel}>Subtotal Produk</Text>
                <Text style={styles.receiptItemPrice}>
                  {formatRupiah(backendOrder?.items_subtotal ?? lastOrder?.subtotal ?? 0)}
                </Text>
              </View>

              {(backendOrder ? backendOrder.discount_amount > 0 : (lastOrder?.discount ?? 0) > 0) && (
                <View style={[styles.receiptTotalRow, { marginBottom: 4 }]}>
                  <Text style={styles.receiptTotalLabel}>Diskon Kupon</Text>
                  <Text style={[styles.receiptItemPrice, { color: Colors.light.danger }]}>
                    -{formatRupiah(backendOrder?.discount_amount ?? lastOrder?.discount ?? 0)}
                  </Text>
                </View>
              )}

              <View style={[styles.receiptTotalRow, { marginBottom: 4 }]}>
                <Text style={styles.receiptTotalLabel}>Ongkos Kirim Kilat</Text>
                <Text style={styles.receiptItemPrice}>
                  {(backendOrder ? backendOrder.delivery_fee === 0 : lastOrder?.deliveryFee === 0)
                    ? 'GRATIS'
                    : formatRupiah(backendOrder?.delivery_fee ?? lastOrder?.deliveryFee ?? 0)}
                </Text>
              </View>

              {(backendOrder ? backendOrder.infaq_amount > 0 : (lastOrder?.infaq ?? 0) > 0) && (
                <View style={[styles.receiptTotalRow, { marginBottom: 4 }]}>
                  <Text style={styles.receiptTotalLabel}>Infaq Sosial Masjid</Text>
                  <Text style={styles.receiptItemPrice}>
                    +{formatRupiah(backendOrder?.infaq_amount ?? lastOrder?.infaq ?? 0)}
                  </Text>
                </View>
              )}

              <View style={styles.receiptDivider} />

              <View style={[styles.receiptTotalRow, { marginBottom: 8 }]}>
                <Text style={[styles.receiptTotalLabel, { fontWeight: '800', color: Colors.light.text }]}>
                  Total Pembayaran
                </Text>
                <Text style={[styles.receiptItemPrice, { fontWeight: '800', color: Colors.light.primary, fontSize: 14 }]}>
                  {formatRupiah(backendOrder?.total_amount ?? lastOrder?.grandTotal ?? 0)}
                </Text>
              </View>

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Status Pembayaran</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>
                    LUNAS ({backendOrder?.payment_method?.toUpperCase() || lastOrder?.paymentMethod?.toUpperCase() || 'QRIS'})
                  </Text>
                </View>
              </View>

              <View style={styles.receiptAddressBox}>
                <Text style={styles.receiptAddressLabel}>Alamat Antar:</Text>
                <Text style={styles.receiptAddressVal}>
                  {backendOrder?.address_text || lastOrder?.address || 'Jl. Cikumpa No. 12 (Samping Musala Al-Ikhlas)'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom padding for CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 3. Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.85}
        >
          <Text style={styles.backHomeText}>Kembali ke Beranda</Text>
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
    height: 54,
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
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  orderIdSub: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mapCanvas: {
    height: 200,
    backgroundColor: '#E8F1FA',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLineHorizontal1: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  gridLineHorizontal2: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  gridLineVertical1: {
    position: 'absolute',
    left: 100,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  gridLineVertical2: {
    position: 'absolute',
    left: 240,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  storePin: {
    position: 'absolute',
    top: 25,
    left: 30,
    alignItems: 'center',
  },
  storeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  routeLine: {
    position: 'absolute',
    top: 40,
    left: 55,
    width: 260,
    height: 90,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderStyle: 'dashed',
    borderColor: Colors.light.primary,
    borderRadius: 30,
  },
  courierPin: {
    position: 'absolute',
    top: 85,
    left: 160,
    alignItems: 'center',
    zIndex: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(103, 0, 36, 0.2)',
    top: -4,
  },
  courierIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  courierTag: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  courierTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  homePin: {
    position: 'absolute',
    bottom: 25,
    right: 35,
    alignItems: 'center',
  },
  homeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  mapFooter: {
    padding: Spacing.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  expressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expressTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.secondary,
  },
  etaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EEF2F9',
  },
  etaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  etaClockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaTitle: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  etaTime: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.primary,
    marginTop: 1,
  },
  etaStatusPill: {
    backgroundColor: '#EDF7F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.tertiaryContainer,
  },
  courierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#EEF2F9',
  },
  courierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F0F4FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  courierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courierName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
  },
  badgeVerified: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeVerifiedText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
  },
  vehicleInfo: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  courierActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 9,
    borderRadius: 10,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.primaryLight,
    borderWidth: 1,
    borderColor: '#FFD9DD',
    paddingVertical: 9,
    borderRadius: 10,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#EEF2F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  timeline: {
    paddingLeft: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: Colors.light.tertiaryContainer,
  },
  stepDotActive: {
    backgroundColor: Colors.light.primary,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  stepLineDone: {
    backgroundColor: Colors.light.tertiaryContainer,
  },
  stepContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  stepTitleDone: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  stepTitleActive: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  stepTitlePending: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  stepSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  stepSubActive: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#EEF2F9',
    overflow: 'hidden',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  receiptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  receiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  receiptBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  receiptItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptItemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.primary,
    width: 28,
  },
  receiptItemName: {
    fontSize: 12,
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  receiptItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#F0F3FA',
    marginVertical: Spacing.sm,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptTotalLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  paidBadge: {
    backgroundColor: '#EDF7F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.tertiaryContainer,
  },
  receiptAddressBox: {
    backgroundColor: '#F8FAFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  receiptAddressLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  receiptAddressVal: {
    fontSize: 11,
    color: Colors.light.text,
    marginTop: 2,
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  backHomeBtn: {
    width: '100%',
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  backHomeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
