import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  MapPin,
  ChevronRight,
  Zap,
  Store,
  Ticket,
  HeartHandshake,
  QrCode,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  MessageSquare,
  X,
  ShieldCheck,
  Clock,
} from 'lucide-react-native';

import { useCartStore, CartItem, PlacedOrder } from '@/stores/useCartStore';
import { useAddressStore } from '@/stores/useAddressStore';
import { AddressModal } from '@/components/common/AddressModal';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';

export default function CartScreen() {
  const router = useRouter();

  // Cart store
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const setShopperNote = useCartStore((state) => state.setShopperNote);
  const clearCart = useCartStore((state) => state.clearCart);
  const setLastOrder = useCartStore((state) => state.setLastOrder);
  const addOrder = useCartStore((state) => state.addOrder);

  const cartList: CartItem[] = useMemo(() => Object.values(items), [items]);
  const totalItems = useMemo(() => cartList.reduce((acc, it) => acc + it.qty, 0), [cartList]);
  const subtotal = useMemo(() => {
    return cartList.reduce((acc, item) => {
      const price = item.product.promoActive && item.product.promoPrice ? item.product.promoPrice : item.product.price;
      return acc + price * item.qty;
    }, 0);
  }, [cartList]);

  // Screen states
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [includeInfaq, setIncludeInfaq] = useState(true);
  const [voucherApplied, setVoucherApplied] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va' | 'cod'>('qris');
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Address store
  const selectedAddress = useAddressStore((state) => state.getSelectedAddress());

  // Calculations
  const deliveryFee = fulfillment === 'delivery' ? (subtotal >= 30000 ? 0 : 8000) : 0;
  const voucherDiscount = voucherApplied ? Math.min(10000, subtotal) : 0;
  const infaqAmount = includeInfaq ? 1500 : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - voucherDiscount + infaqAmount);

  // QRIS Modal & Payment State
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [countdown, setCountdown] = useState(895); // 14m 55s

  useEffect(() => {
    if (!showQrisModal) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [showQrisModal]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckout = () => {
    setShowQrisModal(true);
  };

  const handleConfirmPaid = () => {
    setIsCheckingPayment(true);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newOrderId = `YMB-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateStr = `Hari Ini, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    const placedOrder: PlacedOrder = {
      orderId: newOrderId,
      items: [...cartList],
      subtotal,
      deliveryFee,
      discount: voucherDiscount,
      infaq: infaqAmount,
      grandTotal,
      fulfillment,
      paymentMethod,
      recipientName: selectedAddress.recipientName,
      address: selectedAddress.addressLine,
      createdAt: `${timeStr} WIB`,
      dateStr,
      status: 'active',
      driverName: 'Pak Joko (Kurir Kilat Masjid)',
      driverPhone: '+628123456789',
      etaMinutes: 15,
    };

    addOrder(placedOrder);
    setLastOrder(placedOrder);

    setTimeout(() => {
      setIsCheckingPayment(false);
      setShowQrisModal(false);
      clearCart();
      router.push(`/order/tracking?id=${newOrderId}` as any);
    }, 1200);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // If cart is empty
  if (cartList.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBtn} onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Keranjang Belanja</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color={Colors.light.primary} />
          </View>
          <Text style={styles.emptyTitle}>Keranjang Belanja Kosong</Text>
          <Text style={styles.emptySub}>
            Pilih kebutuhan harian segar dan halal dari katalog Baiturrahman Mart.
          </Text>
          <TouchableOpacity
            style={styles.startShopBtn}
            onPress={() => router.push('/')}
            activeOpacity={0.85}
          >
            <Text style={styles.startShopText}>Mulai Belanja Sekarang</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.navTitle}>Keranjang & Checkout</Text>
          <Text style={styles.itemCountSub}>{totalItems} Barang Dipilih</Text>
        </View>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
              if (window.confirm('Kosongkan semua barang belanjaan di keranjang?')) {
                clearCart();
              }
            } else {
              Alert.alert('Kosongkan Keranjang?', 'Semua barang belanjaan akan dihapus.', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: clearCart },
              ]);
            }
          }}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={Colors.light.danger} />
        </TouchableOpacity>
      </View>

      {/* 2. Scrollable Checkout Body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Fulfillment Switcher */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pilih Metode Pengambilan</Text>
          <View style={styles.switcherRow}>
            {/* Express Delivery */}
            <TouchableOpacity
              style={[
                styles.switchBtn,
                fulfillment === 'delivery' && styles.switchBtnActive,
              ]}
              onPress={() => setFulfillment('delivery')}
              activeOpacity={0.8}
            >
              <Zap
                size={16}
                color={fulfillment === 'delivery' ? Colors.light.primary : Colors.light.textMuted}
                fill={fulfillment === 'delivery' ? Colors.light.primary : 'none'}
              />
              <Text
                style={[
                  styles.switchText,
                  fulfillment === 'delivery' && styles.switchTextActive,
                ]}
              >
                Express 15-30m
              </Text>
            </TouchableOpacity>

            {/* Self Pickup */}
            <TouchableOpacity
              style={[
                styles.switchBtn,
                fulfillment === 'pickup' && styles.switchBtnActive,
              ]}
              onPress={() => setFulfillment('pickup')}
              activeOpacity={0.8}
            >
              <Store
                size={16}
                color={fulfillment === 'pickup' ? Colors.light.primary : Colors.light.textMuted}
              />
              <Text
                style={[
                  styles.switchText,
                  fulfillment === 'pickup' && styles.switchTextActive,
                ]}
              >
                Ambil di Toko
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Card (Visible if Delivery) */}
        {fulfillment === 'delivery' && (
          <View style={styles.sectionCard}>
            <View style={styles.addressHeaderRow}>
              <View style={styles.iconTag}>
                <MapPin size={16} color={Colors.light.primary} />
                <Text style={styles.addressTagText}>
                  Alamat Pengantaran ({selectedAddress.label})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddressModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.changeAddressText}>Ubah</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.recipientName}>
              {selectedAddress.recipientName} • {selectedAddress.phone}
            </Text>
            <Text style={styles.addressLine}>{selectedAddress.addressLine}</Text>
            {selectedAddress.benchmarkNote ? (
              <View style={styles.benchmarkBox}>
                <Text style={styles.benchmarkText}>
                  📌 Patokan: {selectedAddress.benchmarkNote}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Cart Items List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rincian Barang Belanjaan</Text>
          <View style={styles.itemsList}>
            {cartList.map(({ product, qty, shopperNote }) => {
              const itemPrice = product.promoActive && product.promoPrice ? product.promoPrice : product.price;
              return (
                <View key={product.id} style={styles.itemRow}>
                  {/* Thumbnail */}
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemPlaceholder}><Text style={{ fontSize: 20 }}>📦</Text></View>
                  )}

                  {/* Info & Stepper */}
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTop}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeItem(product.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={Colors.light.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.itemPriceSingle}>{formatRupiah(itemPrice)} / {product.unit}</Text>

                    {/* Stepper & Subtotal */}
                    <View style={styles.itemBottom}>
                      <Text style={styles.itemSubtotal}>{formatRupiah(itemPrice * qty)}</Text>
                      
                      <View style={styles.stepperMini}>
                        <TouchableOpacity
                          style={styles.stepBtnMini}
                          onPress={() => updateQty(product.id, qty - 1)}
                        >
                          <Minus size={13} color={Colors.light.primary} />
                        </TouchableOpacity>
                        <Text style={styles.stepTextMini}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.stepBtnMini}
                          onPress={() => updateQty(product.id, qty + 1)}
                        >
                          <Plus size={13} color={Colors.light.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Shopper Note Input per Item */}
                    <View style={styles.itemNoteBox}>
                      <MessageSquare size={12} color={Colors.light.primary} />
                      <TextInput
                        style={styles.itemNoteInput}
                        value={shopperNote}
                        onChangeText={(txt) => setShopperNote(product.id, txt)}
                        placeholder="Catatan shopper (misal: pilih yang matang)..."
                        placeholderTextColor={Colors.light.textMuted}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Voucher Promo Section */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.voucherBox}
            onPress={() => setVoucherApplied(!voucherApplied)}
            activeOpacity={0.8}
          >
            <View style={styles.voucherLeft}>
              <Ticket size={18} color={Colors.light.secondary} />
              <View>
                <Text style={styles.voucherTitle}>
                  {voucherApplied ? 'Kupon Aktif: BERKAHJUMAT' : 'Punya Kupon / Kode Promo?'}
                </Text>
                <Text style={styles.voucherSub}>
                  {voucherApplied ? 'Hemat Potongan Rp 10.000' : 'Klaim diskon s/d Rp 20.000'}
                </Text>
              </View>
            </View>
            <Text style={styles.voucherToggleText}>
              {voucherApplied ? 'Ganti' : 'Gunakan'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Infaq / Sedekah Baiturrahman Checkbox */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.infaqCard}
            onPress={() => setIncludeInfaq(!includeInfaq)}
            activeOpacity={0.85}
          >
            <View style={styles.infaqLeft}>
              <View style={styles.infaqIconCircle}>
                <HeartHandshake size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infaqTitle}>Bulatkan untuk Infaq Masjid</Text>
                <Text style={styles.infaqSub}>
                  Donasi +Rp 1.500 untuk kas sosial & santunan dhuafa Baiturrahman.
                </Text>
              </View>
            </View>
            <View style={[styles.checkbox, includeInfaq && styles.checkboxActive]}>
              {includeInfaq && <CheckCircle2 size={18} color="#059669" />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pilih Metode Pembayaran</Text>
          <View style={styles.paymentOptions}>
            {/* QRIS */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'qris' && styles.paymentOptionActive,
              ]}
              onPress={() => {
                setPaymentMethod('qris');
                setShowQrisModal(true);
              }}
              activeOpacity={0.8}
            >
              <QrCode size={18} color={paymentMethod === 'qris' ? Colors.light.primary : Colors.light.textMuted} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.paymentTitle}>QRIS Instan (Rekomendasi)</Text>
                  <View style={styles.scanBadge}>
                    <Text style={styles.scanBadgeText}>Buka Kode QR</Text>
                  </View>
                </View>
                <Text style={styles.paymentSub}>BCA, Mandiri, GoPay, OVO, ShopeePay, Dana</Text>
              </View>
              <View style={[styles.radio, paymentMethod === 'qris' && styles.radioActive]} />
            </TouchableOpacity>

            {/* Virtual Account */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'va' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('va')}
              activeOpacity={0.8}
            >
              <CreditCard size={18} color={paymentMethod === 'va' ? Colors.light.primary : Colors.light.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Virtual Account Bank</Text>
                <Text style={styles.paymentSub}>BSI Syariah, Mandiri, BRI, Permata</Text>
              </View>
              <View style={[styles.radio, paymentMethod === 'va' && styles.radioActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Belanja ({totalItems} barang)</Text>
            <Text style={styles.summaryValue}>{formatRupiah(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Pengiriman (Ongkir)</Text>
            <Text style={styles.summaryValue}>
              {deliveryFee === 0 ? <Text style={{ color: '#059669', fontWeight: '700' }}>GRATIS</Text> : formatRupiah(deliveryFee)}
            </Text>
          </View>
          {voucherApplied && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Diskon Kupon Berkah</Text>
              <Text style={[styles.summaryValue, { color: Colors.light.danger, fontWeight: '700' }]}>
                -{formatRupiah(voucherDiscount)}
              </Text>
            </View>
          )}
          {includeInfaq && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Infaq Sosial Masjid</Text>
              <Text style={styles.summaryValue}>+{formatRupiah(infaqAmount)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Tagihan</Text>
            <Text style={styles.totalValue}>{formatRupiah(grandTotal)}</Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 3. Sticky Checkout Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalWrapper}>
          <Text style={styles.bottomTotalLabel}>Total Tagihan</Text>
          <Text style={styles.bottomTotalValue}>{formatRupiah(grandTotal)}</Text>
        </View>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={handleCheckout}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>Bayar Sekarang (QRIS)</Text>
          <ChevronRight size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 4. Interactive QRIS Dynamic Modal */}
      <Modal
        visible={showQrisModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isCheckingPayment) setShowQrisModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header with QRIS Badge & Close button */}
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.qrisBadgeRow}>
                  <View style={styles.qrisRedBadge}>
                    <Text style={styles.qrisRedText}>QRIS</Text>
                  </View>
                  <Text style={styles.qrisHeaderTitle}>Standar Pembayaran Nasional</Text>
                </View>
                <Text style={styles.merchantSubtitle}>BAITURRAHMAN MART (YMB)</Text>
                <Text style={styles.nmidText}>NMID: ID1024358892110 • Sukmajaya, Depok</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => !isCheckingPayment && setShowQrisModal(false)}
                disabled={isCheckingPayment}
                activeOpacity={0.7}
              >
                <X size={18} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {/* Total Amount Tag with Countdown */}
            <View style={styles.modalTotalBox}>
              <Text style={styles.modalTotalLabel}>TOTAL PEMBAYARAN</Text>
              <Text style={styles.modalTotalValue}>{formatRupiah(grandTotal)}</Text>
              <View style={styles.countdownRow}>
                <Clock size={13} color="#D97706" />
                <Text style={styles.countdownText}>
                  Kedaluwarsa dalam: <Text style={{ fontWeight: '800' }}>{formatTime(countdown)}</Text>
                </Text>
              </View>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrCodeWrapper}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=00020101021226670016ID.CO.QRIS.WWW01189360099800000123450215ID10243588921100303UMI51440014ID.LINKAJA.WWW02152002150000000005204541153033605405${grandTotal}5802ID5917BAITURRAHMAN%20MART6005DEPOK61051641562070703A016304`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <View style={styles.qrCenterBadge}>
                <Text style={styles.qrCenterText}>QRIS</Text>
              </View>
            </View>

            {/* Supported Banks / Wallets Badges */}
            <Text style={styles.supportedText}>
              BCA • Mandiri • BRI • BSI • GoPay • OVO • Dana • ShopeePay
            </Text>

            {/* Security Guarantee Notice */}
            <View style={styles.securityNotice}>
              <ShieldCheck size={14} color="#059669" />
              <Text style={styles.securityNoticeText}>
                Terverifikasi Otomatis (Standar ASPI / BI)
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.confirmPaidBtn, isCheckingPayment && { opacity: 0.85 }]}
                onPress={handleConfirmPaid}
                disabled={isCheckingPayment}
                activeOpacity={0.85}
              >
                {isCheckingPayment ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmPaidText}>Memverifikasi Pembayaran...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.confirmPaidText}>Saya Sudah Bayar (Cek Otomatis)</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelPayBtn}
                onPress={() => setShowQrisModal(false)}
                disabled={isCheckingPayment}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelPayText}>Batal / Bayar Nanti</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Address Selection & Creation Modal */}
      <AddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
      />
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
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  itemCountSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  switcherRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
  },
  switchBtnActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  switchText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  switchTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  changeAddressText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  addressLine: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  benchmarkBox: {
    backgroundColor: '#F7FAFE',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8EEF8',
  },
  benchmarkText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  itemsList: {
    gap: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FC',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F8FAFF',
  },
  itemPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F0F4FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  itemPriceSingle: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  stepperMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F7FC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtnMini: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextMini: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
    color: Colors.light.text,
  },
  itemNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    marginTop: 6,
  },
  itemNoteInput: {
    flex: 1,
    fontSize: 11,
    color: Colors.light.text,
    paddingVertical: 4,
  },
  voucherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F6DF80',
    borderRadius: 12,
    padding: Spacing.md,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  voucherTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.secondary,
  },
  voucherSub: {
    fontSize: 11,
    color: '#735C00',
    marginTop: 1,
  },
  voucherToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.primary,
    marginLeft: 8,
  },
  infaqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: Spacing.md,
  },
  infaqLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  infaqIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infaqTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  infaqSub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
    lineHeight: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkboxActive: {
    backgroundColor: '#D1FAE5',
  },
  paymentOptions: {
    gap: Spacing.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
  },
  paymentOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  paymentSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  scanBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  scanBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F3FA',
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.primary,
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
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomTotalWrapper: {},
  bottomTotalLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  bottomTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.primary,
    marginTop: 1,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  startShopBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: Spacing.xl,
  },
  startShopText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  /* QRIS Dynamic Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  qrisBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  qrisRedBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qrisRedText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  qrisHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.text,
  },
  merchantSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
    marginTop: 2,
  },
  nmidText: {
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
  modalTotalBox: {
    width: '100%',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  modalTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: 0.8,
  },
  modalTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.light.primary,
    marginVertical: 2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  countdownText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  qrCodeWrapper: {
    width: 210,
    height: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  qrImage: {
    width: 190,
    height: 190,
    borderRadius: 8,
  },
  qrCenterBadge: {
    position: 'absolute',
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  qrCenterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  supportedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  securityNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  modalActions: {
    width: '100%',
    gap: 8,
  },
  confirmPaidBtn: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmPaidText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelPayBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPayText: {
    color: Colors.light.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
