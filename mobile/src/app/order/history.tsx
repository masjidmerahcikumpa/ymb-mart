import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Truck,
  Store,
  CheckCircle2,
  Clock,
  ChevronRight,
  RotateCcw,
  Receipt,
  X,
  ShoppingBag,
  Sparkles,
  HeartHandshake,
  QrCode,
  MapPin,
} from 'lucide-react-native';

import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { useCartStore, PlacedOrder, OrderStatus } from '@/stores/useCartStore';
import { BottomNavBar } from '@/components/common/BottomNavBar';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

export default function OrderHistoryScreen() {
  const router = useRouter();

  const orders = useCartStore((state) => state.orders);
  const reorderItems = useCartStore((state) => state.reorderItems);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<PlacedOrder | null>(null);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((o) => o.status === activeTab);
  }, [orders, activeTab]);

  const activeCount = useMemo(() => orders.filter((o) => o.status === 'active').length, [orders]);
  const completedCount = useMemo(() => orders.filter((o) => o.status === 'completed').length, [orders]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleTrackOrder = (orderId: string) => {
    router.push(`/order/tracking?id=${orderId}` as any);
  };

  const handleReorder = (order: PlacedOrder) => {
    reorderItems(order.orderId);
    Alert.alert(
      'Produk Dimasukkan ke Keranjang! 🛒',
      `${order.items.length} jenis produk dari pesanan #${order.orderId} telah dimasukkan ke keranjang belanja Anda.`,
      [
        { text: 'Lanjut Nanti', style: 'cancel' },
        {
          text: 'Buka Keranjang',
          onPress: () => router.push('/cart' as any),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Riwayat Pesanan</Text>
          <Text style={styles.headerSubtitle}>Baiturrahman Mart Transaksi & Pengiriman</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* 2. Status Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
              Semua ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'active' && styles.filterChipActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.7}
          >
            <View style={styles.chipRow}>
              {activeCount > 0 && <View style={styles.activeDot} />}
              <Text style={[styles.filterChipText, activeTab === 'active' && styles.filterChipTextActive]}>
                Sedang Dikirim ({activeCount})
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'completed' && styles.filterChipActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeTab === 'completed' && styles.filterChipTextActive]}>
              Selesai ({completedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. Main Orders List */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={48} color={Colors.light.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Pesanan</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active'
                ? 'Tidak ada pesanan yang sedang diantar saat ini.'
                : 'Mulai penuhi kebutuhan dapur Anda dengan garansi kilat 15-30 menit.'}
            </Text>
            <TouchableOpacity
              style={styles.shopNowBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.85}
            >
              <Text style={styles.shopNowBtnText}>Mulai Belanja Kebutuhan 🛒</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const firstItem = order.items[0];
            const otherItemsCount = order.items.length - 1;

            return (
              <View key={order.orderId} style={styles.orderCard}>
                {/* Card Top: Fulfillment & Status Pill */}
                <View style={styles.cardHeader}>
                  <View style={styles.fulfillmentBadge}>
                    {order.fulfillment === 'delivery' ? (
                      <>
                        <Truck size={13} color={Colors.light.primary} />
                        <Text style={styles.fulfillmentText}>Pengiriman Kilat 15-30 Menit</Text>
                      </>
                    ) : (
                      <>
                        <Store size={13} color="#D97706" />
                        <Text style={[styles.fulfillmentText, { color: '#B45309' }]}>
                          Ambil di Toko Fisik
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Status Tag */}
                  {order.status === 'active' ? (
                    <View style={styles.statusActiveBadge}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.statusActiveText}>
                        Sedang Diantar (~{order.etaMinutes || 12} mnt)
                      </Text>
                    </View>
                  ) : order.status === 'completed' ? (
                    <View style={styles.statusCompletedBadge}>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text style={styles.statusCompletedText}>Selesai</Text>
                    </View>
                  ) : (
                    <View style={styles.statusCancelledBadge}>
                      <Text style={styles.statusCancelledText}>Dibatalkan</Text>
                    </View>
                  )}
                </View>

                {/* Card Subheader: ID & Date */}
                <View style={styles.cardMetaRow}>
                  <Text style={styles.orderIdText}>#{order.orderId}</Text>
                  <Text style={styles.orderDateText}>
                    {order.dateStr || 'Hari Ini'} • {order.createdAt}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Primary Item Preview */}
                {firstItem && (
                  <View style={styles.itemPreviewRow}>
                    {firstItem.product.imageUrl ? (
                      <Image
                        source={{ uri: firstItem.product.imageUrl }}
                        style={styles.itemThumb}
                      />
                    ) : (
                      <View style={styles.itemThumbFallback}>
                        <Text style={{ fontSize: 20 }}>📦</Text>
                      </View>
                    )}

                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {firstItem.product.name}
                      </Text>
                      <Text style={styles.itemQtyPrice}>
                        {firstItem.qty}x {formatRupiah(firstItem.product.promoActive && firstItem.product.promoPrice ? firstItem.product.promoPrice : firstItem.product.price)}
                      </Text>
                      {otherItemsCount > 0 && (
                        <Text style={styles.otherItemsBadge}>
                          +{otherItemsCount} produk kebutuhan lainnya
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Mosque Infaq Perk Highlight */}
                {order.infaq > 0 && (
                  <View style={styles.infaqRow}>
                    <HeartHandshake size={13} color="#047857" />
                    <Text style={styles.infaqText}>
                      Termasuk Infaq Pembangunan & Kemakmuran Masjid {formatRupiah(order.infaq)} 🕌
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                {/* Total & Action Buttons */}
                <View style={styles.cardFooter}>
                  <View style={styles.totalWrap}>
                    <Text style={styles.totalLabel}>
                      Total Pesanan ({order.items.reduce((acc, i) => acc + i.qty, 0)} Barang):
                    </Text>
                    <Text style={styles.totalValue}>{formatRupiah(order.grandTotal)}</Text>
                  </View>

                  <View style={styles.btnRow}>
                    {order.status === 'active' ? (
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => handleTrackOrder(order.orderId)}
                        activeOpacity={0.8}
                      >
                        <Clock size={15} color="#FFFFFF" />
                        <Text style={styles.trackBtnText}>Lacak Pengiriman</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.receiptBtn}
                          onPress={() => setSelectedInvoiceOrder(order)}
                          activeOpacity={0.7}
                        >
                          <Receipt size={14} color={Colors.light.text} />
                          <Text style={styles.receiptBtnText}>Lihat Nota</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={() => handleReorder(order)}
                          activeOpacity={0.8}
                        >
                          <RotateCcw size={14} color={Colors.light.primary} />
                          <Text style={styles.reorderBtnText}>Beli Lagi</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 4. Digital Invoice Modal */}
      <Modal
        visible={!!selectedInvoiceOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedInvoiceOrder(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.invoiceCard}>
            {/* Invoice Top Header */}
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceMosqueBadge}>
                <Text style={{ fontSize: 24 }}>🕌</Text>
                <View>
                  <Text style={styles.invoiceShopTitle}>BAITURRAHMAN MART</Text>
                  <Text style={styles.invoiceShopSub}>Nota Digital Belanja Berkah Masjid</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedInvoiceOrder(null)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {selectedInvoiceOrder && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.invoiceScroll}>
                {/* Meta details */}
                <View style={styles.invoiceMeta}>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.invoiceMetaKey}>No. Nota / Pesanan</Text>
                    <Text style={styles.invoiceMetaVal}>#{selectedInvoiceOrder.orderId}</Text>
                  </View>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.invoiceMetaKey}>Waktu Transaksi</Text>
                    <Text style={styles.invoiceMetaVal}>
                      {selectedInvoiceOrder.dateStr || 'Hari Ini'} • {selectedInvoiceOrder.createdAt}
                    </Text>
                  </View>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.invoiceMetaKey}>Metode Pembayaran</Text>
                    <Text style={styles.invoiceMetaVal}>
                      {selectedInvoiceOrder.paymentMethod.toUpperCase()} (LUNAS)
                    </Text>
                  </View>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.invoiceMetaKey}>Penerima</Text>
                    <Text style={styles.invoiceMetaVal}>{selectedInvoiceOrder.recipientName}</Text>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.invoiceItemsWrap}>
                  <Text style={styles.invoiceSectionTitle}>Rincian Belanja:</Text>
                  {selectedInvoiceOrder.items.map((it, idx) => {
                    const price =
                      it.product.promoActive && it.product.promoPrice
                        ? it.product.promoPrice
                        : it.product.price;
                    return (
                      <View key={idx} style={styles.invoiceItemRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.invoiceItemName}>{it.product.name}</Text>
                          <Text style={styles.invoiceItemSub}>
                            {it.qty} x {formatRupiah(price)}
                          </Text>
                        </View>
                        <Text style={styles.invoiceItemTotal}>{formatRupiah(price * it.qty)}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Calculations */}
                <View style={styles.invoiceCostBreakdown}>
                  <View style={styles.invoiceCostRow}>
                    <Text style={styles.invoiceCostLabel}>Subtotal Produk</Text>
                    <Text style={styles.invoiceCostValue}>
                      {formatRupiah(selectedInvoiceOrder.subtotal)}
                    </Text>
                  </View>

                  <View style={styles.invoiceCostRow}>
                    <Text style={styles.invoiceCostLabel}>Biaya Ongkir Kilat</Text>
                    <Text style={styles.invoiceCostValue}>
                      {selectedInvoiceOrder.deliveryFee === 0
                        ? 'GRATIS'
                        : formatRupiah(selectedInvoiceOrder.deliveryFee)}
                    </Text>
                  </View>

                  {selectedInvoiceOrder.discount > 0 && (
                    <View style={styles.invoiceCostRow}>
                      <Text style={[styles.invoiceCostLabel, { color: Colors.light.primary }]}>
                        Diskon Kupon Promo
                      </Text>
                      <Text style={[styles.invoiceCostValue, { color: Colors.light.primary }]}>
                        -{formatRupiah(selectedInvoiceOrder.discount)}
                      </Text>
                    </View>
                  )}

                  {selectedInvoiceOrder.infaq > 0 && (
                    <View style={styles.invoiceCostRow}>
                      <Text style={[styles.invoiceCostLabel, { color: '#047857' }]}>
                        Infaq Masjid Baiturrahman
                      </Text>
                      <Text style={[styles.invoiceCostValue, { color: '#047857' }]}>
                        +{formatRupiah(selectedInvoiceOrder.infaq)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.invoiceGrandTotalRow}>
                    <Text style={styles.invoiceGrandTotalLabel}>TOTAL PEMBAYARAN</Text>
                    <Text style={styles.invoiceGrandTotalVal}>
                      {formatRupiah(selectedInvoiceOrder.grandTotal)}
                    </Text>
                  </View>
                </View>

                {/* Footer Blessing */}
                <View style={styles.invoiceBlessing}>
                  <Text style={styles.blessingArabic}>جَزَاكُمُ اللهُ خَيْرًا كَثِيْرًا</Text>
                  <Text style={styles.blessingText}>
                    Alhamdulillah, terima kasih telah berbelanja di Baiturrahman Mart. Belanja Anda
                    turut memakmurkan kegiatan dakwah & kas masjid.
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setSelectedInvoiceOrder(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeModalBtnText}>Tutup Nota</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5. Mobile Bottom Navigation */}
      <BottomNavBar activeTab="orders" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  filterWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FED65B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fulfillmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fulfillmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  statusActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  statusActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  statusCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusCompletedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  statusCancelledBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusCancelledText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.danger,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
  orderDateText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  itemThumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  otherItemsBadge: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 3,
  },
  infaqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  infaqText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalWrap: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  shopNowBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  shopNowBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  invoiceCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  invoiceMosqueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceShopTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },
  invoiceShopSub: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceScroll: {
    marginVertical: Spacing.sm,
  },
  invoiceMeta: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: Spacing.sm,
    gap: 4,
    marginBottom: Spacing.md,
  },
  invoiceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceMetaKey: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  invoiceMetaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
  },
  invoiceItemsWrap: {
    marginBottom: Spacing.md,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  invoiceItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceItemSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  invoiceItemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceCostBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: Spacing.sm,
    gap: 6,
  },
  invoiceCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceCostLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  invoiceCostValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#0F172A',
    paddingTop: 8,
    marginTop: 4,
  },
  invoiceGrandTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.light.text,
  },
  invoiceGrandTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.light.primary,
  },
  invoiceBlessing: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  blessingArabic: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857',
    marginBottom: 4,
  },
  blessingText: {
    fontSize: 10,
    color: '#065F46',
    textAlign: 'center',
    lineHeight: 14,
  },
  closeModalBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
