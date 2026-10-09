import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  ScanLine,
  Flashlight,
  FlashlightOff,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react-native';

import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { Product } from '@/types/product';
import { MOCK_PRODUCTS } from '@/constants/mockData';
import { fetchProducts } from '@/services/api';
import { useCartStore } from '@/stores/useCartStore';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const [flashlight, setFlashlight] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [productsList, setProductsList] = useState<Product[]>(MOCK_PRODUCTS);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load products list for lookup
  useEffect(() => {
    if (visible) {
      fetchProducts().then((res) => {
        if (res && res.length > 0) {
          setProductsList(res);
        }
      });
      setScanStatus('idle');
      setScannedProduct(null);
      setManualCode('');

      // Web webcam initialization
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((stream) => {
            setCameraActive(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch(() => {
            // Camera permission denied or not available; fallback to visual scanner
            setCameraActive(false);
          });
      }
    } else {
      // Stop camera stream when modal closed
      if (Platform.OS === 'web' && videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  }, [visible]);

  const handleLookup = (code: string) => {
    const cleaned = code.trim().toLowerCase();
    if (!cleaned) return;

    const match = productsList.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleaned) ||
        p.sku.toLowerCase() === cleaned ||
        p.name.toLowerCase().includes(cleaned)
    );

    if (match) {
      setScannedProduct(match);
      setScanStatus('found');
    } else {
      setScannedProduct(null);
      setScanStatus('not_found');
    }
  };

  const handleAddToCart = () => {
    if (!scannedProduct) return;
    addItem(scannedProduct, 1);
    Alert.alert(
      'Berhasil Ditambahkan! 🛒',
      `${scannedProduct.name} dimasukkan ke keranjang belanja Anda.`,
      [
        { text: 'Lanjut Scan', onPress: () => setScanStatus('idle') },
        {
          text: 'Buka Keranjang',
          onPress: () => {
            onClose();
            router.push('/cart' as any);
          },
        },
      ]
    );
  };

  const handleOpenDetail = () => {
    if (!scannedProduct) return;
    onClose();
    router.push(`/product/${scannedProduct.id}` as any);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" />

        {/* 1. Header Toolbar */}
        <View style={styles.topToolbar}>
          <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn} activeOpacity={0.7}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.toolbarTitle}>Price & Promo Checker</Text>
            <Text style={styles.toolbarSub}>Baiturrahman Mart In-Store Scanner</Text>
          </View>

          <TouchableOpacity
            onPress={() => setFlashlight(!flashlight)}
            style={[styles.iconCircleBtn, flashlight && styles.flashActive]}
            activeOpacity={0.7}
          >
            {flashlight ? <Flashlight size={20} color="#FED65B" /> : <FlashlightOff size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {/* 2. Camera Viewfinder Area */}
        <View style={styles.viewfinderContainer}>
          {Platform.OS === 'web' && cameraActive ? (
            // Native HTML5 video stream on web
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={(ref) => {
                  videoRef.current = ref;
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                playsInline
                muted
              />
            </div>
          ) : (
            // Simulated realistic dark optical viewfinder canvas
            <View style={styles.cameraSimulatedBg}>
              <View style={styles.cameraAperture}>
                <Text style={{ fontSize: 36 }}>🛒</Text>
              </View>
            </View>
          )}

          {/* Dark Vignette Overlay Mask */}
          <View style={styles.vignetteOverlay} pointerEvents="none" />

          {/* Central Target Reticle */}
          <View style={styles.targetReticle}>
            {/* 4 Neon Corners */}
            <View style={[styles.cornerBracket, styles.topLeft]} />
            <View style={[styles.cornerBracket, styles.topRight]} />
            <View style={[styles.cornerBracket, styles.bottomLeft]} />
            <View style={[styles.cornerBracket, styles.bottomRight]} />

            {/* Scanning Laser Beam */}
            <View style={styles.laserBeam} />

            <View style={styles.targetCenterPrompt}>
              <ScanLine size={16} color="#FED65B" />
              <Text style={styles.targetPromptText}>Posisikan Barcode di Kotak Ini</Text>
            </View>
          </View>
        </View>

        {/* 3. Bottom Interactive Panel */}
        <View style={styles.bottomPanel}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomScroll}>
            {scanStatus === 'found' && scannedProduct ? (
              /* Scanned Product Card */
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.matchBadge}>
                    <CheckCircle2 size={14} color="#059669" />
                    <Text style={styles.matchBadgeText}>PRODUK DITEMUKAN</Text>
                  </View>
                  <Text style={styles.barcodeLabel}>Barcode: {scannedProduct.barcode || scannedProduct.sku}</Text>
                </View>

                <View style={styles.productRow}>
                  {scannedProduct.imageUrl ? (
                    <Image source={{ uri: scannedProduct.imageUrl }} style={styles.prodThumb} />
                  ) : (
                    <View style={styles.prodThumbPlaceholder}>
                      <Text style={{ fontSize: 24 }}>📦</Text>
                    </View>
                  )}
                  <View style={styles.prodInfo}>
                    <Text style={styles.prodCategory}>{scannedProduct.category.toUpperCase()}</Text>
                    <Text style={styles.prodName} numberOfLines={2}>
                      {scannedProduct.name}
                    </Text>

                    {/* Price and Promo */}
                    <View style={styles.priceRow}>
                      {scannedProduct.promoActive && scannedProduct.promoPrice ? (
                        <>
                          <Text style={styles.promoPrice}>{formatRupiah(scannedProduct.promoPrice)}</Text>
                          <Text style={styles.normalCrossed}>{formatRupiah(scannedProduct.price)}</Text>
                        </>
                      ) : (
                        <Text style={styles.regularPrice}>{formatRupiah(scannedProduct.price)}</Text>
                      )}
                    </View>

                    {/* Member Perk Tag */}
                    <View style={styles.memberPerkRow}>
                      <Sparkles size={11} color="#735C00" />
                      <Text style={styles.memberPerkText}>
                        +{(Math.floor(scannedProduct.price / 1000) || 1)} Poin YMB Gold
                      </Text>
                      <Text style={styles.stockStatus}>• Stok Toko: {scannedProduct.stock} {scannedProduct.unit}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={handleOpenDetail}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailBtnText}>Lihat Detail</Text>
                    <ArrowRight size={14} color={Colors.light.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addCartBtn}
                    onPress={handleAddToCart}
                    activeOpacity={0.85}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.addCartBtnText}>Tambah ke Keranjang</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : scanStatus === 'not_found' ? (
              /* Not Found Card */
              <View style={styles.notFoundCard}>
                <AlertCircle size={24} color={Colors.light.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notFoundTitle}>Produk Tidak Ditemukan</Text>
                  <Text style={styles.notFoundSub}>Barcode tidak terdaftar di sistem toko fisik Baiturrahman Mart.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setScanStatus('idle')}
                  style={styles.retryBtn}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={14} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Quick Test Barcode Presets */}
            <View style={styles.presetSection}>
              <Text style={styles.presetTitle}>Uji Barcode Produk Toko (Klik untuk Test):</Text>
              <View style={styles.presetChipsWrap}>
                {[
                  { name: 'Le Mineral', code: '8996001600269' },
                  { name: 'Beras Ramos 5kg', code: '8991234567890' },
                  { name: 'Minyak Tropical 2L', code: '8999876543210' },
                  { name: 'Telur Ayam Fresh', code: '8992345678901' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={styles.presetChip}
                    onPress={() => handleLookup(item.code)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.presetChipName}>{item.name}</Text>
                    <Text style={styles.presetChipCode}>[{item.code.slice(-6)}]</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Manual Barcode Input */}
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Atau ketik angka barcode / SKU..."
                placeholderTextColor="#94A3B8"
                value={manualCode}
                onChangeText={setManualCode}
                onSubmitEditing={() => handleLookup(manualCode)}
              />
              <TouchableOpacity
                style={styles.manualSubmitBtn}
                onPress={() => handleLookup(manualCode)}
                activeOpacity={0.8}
              >
                <Text style={styles.manualSubmitText}>Cek</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    zIndex: 20,
  },
  titleWrap: {
    alignItems: 'center',
  },
  toolbarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toolbarSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashActive: {
    backgroundColor: 'rgba(254, 214, 91, 0.3)',
    borderWidth: 1,
    borderColor: '#FED65B',
  },
  viewfinderContainer: {
    flex: 1.2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraSimulatedBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraAperture: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  targetReticle: {
    width: 260,
    height: 200,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FED65B',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  laserBeam: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  targetCenterPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(254, 214, 91, 0.3)',
  },
  targetPromptText: {
    fontSize: 11,
    color: '#FED65B',
    fontWeight: '700',
  },
  bottomPanel: {
    flex: 1.4,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.md,
  },
  bottomScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  resultCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FED65B',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  barcodeLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontFamily: 'monospace',
  },
  productRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  prodThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  prodThumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodInfo: {
    flex: 1,
  },
  prodCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 3,
  },
  promoPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.danger,
  },
  normalCrossed: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textDecorationLine: 'line-through',
  },
  regularPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  memberPerkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  memberPerkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#735C00',
  },
  stockStatus: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  addCartBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
  },
  addCartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notFoundTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  notFoundSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  retryBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  presetSection: {
    marginBottom: Spacing.md,
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textMuted,
    marginBottom: 6,
  },
  presetChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.text,
  },
  presetChipCode: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontFamily: 'monospace',
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.light.text,
  },
  manualSubmitBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  manualSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
