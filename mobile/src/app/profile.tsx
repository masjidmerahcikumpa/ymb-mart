import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  QrCode,
  Sparkles,
  Award,
  Gift,
  Coins,
  ChevronRight,
  MapPin,
  Receipt,
  HeartHandshake,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  X,
  Copy,
  LogOut,
  LogIn,
  UserCheck,
} from 'lucide-react-native';

import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/utils/currency';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import { AddressModal } from '@/components/common/AddressModal';
import { AuthModal } from '@/components/common/AuthModal';
import { useAddressStore } from '@/stores/useAddressStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ProfileScreen() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const deductPoints = useAuthStore((state) => state.deductPoints);

  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const selectedAddress = useAddressStore((state) => state.getSelectedAddress());

  const initials = useMemo(() => {
    return (
      user.name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'YM'
    );
  }, [user.name]);

  const handleRedeemReward = (title: string, cost: number) => {
    if (user.points < cost) {
      Alert.alert(
        'Poin Belum Cukup',
        `Kamu membutuhkan ${cost.toLocaleString('id-ID')} poin untuk menukar ${title}. Poin saat ini: ${user.points.toLocaleString('id-ID')}`
      );
      return;
    }

    Alert.alert(
      'Konfirmasi Penukaran',
      `Tukarkan ${cost.toLocaleString('id-ID')} poin dengan ${title}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tukarkan',
          onPress: () => {
            deductPoints(cost);
            Alert.alert(
              'Penukaran Berhasil! 🎉',
              `Kupon/Hadiah ${title} telah ditambahkan ke akun Anda dan siap dipakai di kasir toko atau saat checkout online.`
            );
          },
        },
      ]
    );
  };

  const handleCopyMemberId = () => {
    Alert.alert('Tersalin!', `Nomor Member ${user.memberId} berhasil disalin ke clipboard.`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun member ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            logout();
            Alert.alert('Berhasil Keluar', 'Anda sekarang dalam mode tamu.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profil & Kartu Member</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setShowQrModal(true)}
          activeOpacity={0.7}
        >
          <QrCode size={20} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header Profile Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user.name}</Text>
              <View style={styles.goldBadge}>
                <Sparkles size={11} color="#735C00" fill="#735C00" />
                <Text style={styles.goldBadgeText}>{user.tier}</Text>
              </View>
            </View>
            <Text style={styles.profilePhone}>
              {user.phone ? `+62 ${user.phone.replace(/^0/, '')}` : 'Mode Tamu'} • Jamaah Masjid Baiturrahman
            </Text>
          </View>
        </View>

        {/* Guest Banner if not authenticated */}
        {!isAuthenticated && (
          <View style={styles.guestBanner}>
            <View style={styles.guestBannerLeft}>
              <Sparkles size={20} color="#735C00" />
              <View style={{ flex: 1 }}>
                <Text style={styles.guestBannerTitle}>Belum Masuk Member YMB</Text>
                <Text style={styles.guestBannerSub}>Masuk via WhatsApp untuk kumpulkan poin & cek riwayat transaksi.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.guestLoginBtn}
              onPress={() => setShowAuthModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.guestLoginBtnText}>Masuk Akun</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Digital Membership Card (YMB Gold) */}
        <View style={styles.goldCard}>
          {/* Card Top */}
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardBrand}>BAITURRAHMAN MART</Text>
              <Text style={styles.cardSub}>Kartu Anggota Digital • {user.tier}</Text>
            </View>
            <View style={styles.chipGraphic}>
              <View style={styles.chipInner} />
            </View>
          </View>

          {/* Member ID & Barcode Area */}
          <View style={styles.memberIdSection}>
            <Text style={styles.idLabel}>NOMOR MEMBER</Text>
            <View style={styles.idRow}>
              <Text style={styles.idNumber}>{user.memberId}</Text>
              <TouchableOpacity onPress={handleCopyMemberId} activeOpacity={0.7}>
                <Copy size={15} color="#5C4500" />
              </TouchableOpacity>
            </View>

            {/* Barcode Graphic Simulation */}
            <TouchableOpacity
              style={styles.barcodeBox}
              onPress={() => setShowQrModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.barcodeLines}>
                {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2].map((w, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: w * 2.2,
                      height: 34,
                      backgroundColor: '#2D1F00',
                      marginRight: 2,
                    }}
                  />
                ))}
              </View>
              <View style={styles.scanPrompt}>
                <QrCode size={13} color="#2D1F00" />
                <Text style={styles.scanPromptText}>Ketuk untuk Tampilkan QR Kasir</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Points & Tier Progress */}
          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.pointsLabel}>SALDO POIN YMB</Text>
              <Text style={styles.pointsValue}>
                {user.points.toLocaleString('id-ID')} <Text style={styles.pointsUnit}>Poin</Text>
              </Text>
              <Text style={styles.pointRupiah}>≈ Setara {formatRupiah(user.points * 10)}</Text>
            </View>
            <TouchableOpacity
              style={styles.qrIconBtn}
              onPress={() => setShowQrModal(true)}
              activeOpacity={0.8}
            >
              <QrCode size={24} color="#5C4500" />
            </TouchableOpacity>
          </View>

          {/* Progress bar to Platinum */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (user.points / 2000) * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {user.points >= 2000
                ? 'Level Maksimal: PLATINUM MEMBER'
                : `Kurang ${(2000 - user.points).toLocaleString('id-ID')} poin lagi menuju PLATINUM`}
            </Text>
          </View>
        </View>

        {/* 3. Reward Exchange Catalog */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Gift size={18} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Tukar Poin Berkah</Text>
            </View>
            <Text style={styles.sectionSub}>Bisa dipakai belanja</Text>
          </View>

          <View style={styles.rewardsList}>
            {/* Reward 1 */}
            <View style={styles.rewardCard}>
              <View style={styles.rewardLeft}>
                <View style={styles.rewardIconCircle}>
                  <Receipt size={20} color={Colors.light.primary} />
                </View>
                <View style={styles.rewardTextWrap}>
                  <Text style={styles.rewardTitle}>Voucher Belanja Rp 15.000</Text>
                  <Text style={styles.rewardDesc}>Tanpa minimum belanja di toko fisik / online</Text>
                  <View style={styles.costBadge}>
                    <Coins size={12} color="#D97706" />
                    <Text style={styles.costText}>1.500 Poin</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.redeemActionBtn, user.points < 1500 && styles.redeemActionBtnDisabled]}
                onPress={() => handleRedeemReward('Voucher Belanja Rp 15.000', 1500)}
                activeOpacity={0.8}
              >
                <Text style={styles.redeemActionText}>Tukar</Text>
              </TouchableOpacity>
            </View>

            {/* Reward 2 */}
            <View style={styles.rewardCard}>
              <View style={styles.rewardLeft}>
                <View style={styles.rewardIconCircle}>
                  <Text style={{ fontSize: 20 }}>🍳</Text>
                </View>
                <View style={styles.rewardTextWrap}>
                  <Text style={styles.rewardTitle}>Minyak Goreng 1L Gratis</Text>
                  <Text style={styles.rewardDesc}>Ambil langsung di kasir Baiturrahman Mart</Text>
                  <View style={styles.costBadge}>
                    <Coins size={12} color="#D97706" />
                    <Text style={styles.costText}>2.500 Poin</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.redeemActionBtn, user.points < 2500 && styles.redeemActionBtnDisabled]}
                onPress={() => handleRedeemReward('Minyak Goreng 1L Gratis', 2500)}
                activeOpacity={0.8}
              >
                <Text style={styles.redeemActionText}>Tukar</Text>
              </TouchableOpacity>
            </View>

            {/* Reward 3: Sedekah Subuh */}
            <View style={styles.rewardCard}>
              <View style={styles.rewardLeft}>
                <View style={[styles.rewardIconCircle, { backgroundColor: '#E6F4EA' }]}>
                  <HeartHandshake size={20} color="#059669" />
                </View>
                <View style={styles.rewardTextWrap}>
                  <Text style={styles.rewardTitle}>Sedekah Poin Masjid Baiturrahman</Text>
                  <Text style={styles.rewardDesc}>Salurkan ke kotak santunan yatim & dhuafa</Text>
                  <View style={[styles.costBadge, { backgroundColor: '#E6F4EA' }]}>
                    <Coins size={12} color="#059669" />
                    <Text style={[styles.costText, { color: '#059669' }]}>500 Poin (Rp 5.000)</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.redeemActionBtn, { backgroundColor: '#059669' }]}
                onPress={() => handleRedeemReward('Sedekah Poin Subuh Baiturrahman', 500)}
                activeOpacity={0.8}
              >
                <Text style={styles.redeemActionText}>Salurkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. Menu & Settings List */}
        <View style={styles.sectionWrap}>
          <Text style={styles.menuGroupTitle}>PENGATURAN & AKTIVITAS</Text>

          <View style={styles.menuContainer}>
            {/* Alamat Tersimpan */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowAddressModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <MapPin size={18} color={Colors.light.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Daftar Alamat Pengiriman</Text>
                  <Text style={styles.menuItemSub}>
                    Alamat aktif: {selectedAddress.label} ({selectedAddress.recipientName})
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Riwayat Pesanan */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/order/history' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <Receipt size={18} color={Colors.light.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Status & Riwayat Pesanan</Text>
                  <Text style={styles.menuItemSub}>Lacak kurir atau cek struk transaksi</Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Hubungi CS Toko */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('CS Baiturrahman Mart', 'Hubungi WhatsApp resmi: 0812-3456-7890')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <HelpCircle size={18} color={Colors.light.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Bantuan & CS Toko</Text>
                  <Text style={styles.menuItemSub}>Bantuan komplain barang / konfirmasi kurir</Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Ganti Akun / Masuk WhatsApp */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowAuthModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <UserCheck size={18} color={Colors.light.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>
                    {isAuthenticated ? 'Ganti Akun Member / Nomor WhatsApp' : 'Masuk Akun Member'}
                  </Text>
                  <Text style={styles.menuItemSub}>Login instan dengan nomor WhatsApp & OTP</Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>

            {/* Keluar Akun (jika sedang login) */}
            {isAuthenticated && (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconWrap, { backgroundColor: '#FEF2F2' }]}>
                      <LogOut size={18} color={Colors.light.danger} />
                    </View>
                    <View>
                      <Text style={[styles.menuItemTitle, { color: Colors.light.danger }]}>
                        Keluar dari Akun
                      </Text>
                      <Text style={styles.menuItemSub}>Beralih ke mode belanja tamu</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={Colors.light.textMuted} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Version info */}
        <View style={styles.versionBox}>
          <Text style={styles.versionText}>Baiturrahman Mart Mobile • Versi 2.2.0 (Build 57)</Text>
          <Text style={styles.copyrightText}>© 2026 Masjid Jami' Baiturrahman Sukmajaya Depok</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* QR Code Modal for In-Store Cashier Scan */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View>
                <Text style={styles.qrModalTitle}>QR Member YMB Gold</Text>
                <Text style={styles.qrModalSub}>Tunjukkan ke kasir saat membayar di toko</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.qrCloseBtn}>
                <X size={18} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {/* Real Scannable Member QR Code */}
            <View style={styles.qrBox}>
              <View style={styles.qrImageContainer}>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(user.memberId || 'YMB-MEMBER')}&margin=10`,
                  }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                {/* Center Mosque Emblem Overlay */}
                <View style={styles.qrCenterLogo}>
                  <Text style={{ fontSize: 18 }}>🕌</Text>
                </View>
              </View>

              <Text style={styles.qrMemberNo}>{user.memberId}</Text>
              <Text style={styles.qrMemberName}>{user.name} • {user.points.toLocaleString('id-ID')} Poin</Text>
            </View>

            <View style={styles.qrBenefitBox}>
              <ShieldCheck size={16} color="#059669" />
              <Text style={styles.qrBenefitText}>Dapatkan 1 Poin setiap belanja Rp 1.000 di kasir</Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowQrModal(false)} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Address Selection Modal */}
      <AddressModal visible={showAddressModal} onClose={() => setShowAddressModal(false)} />

      {/* Auth Modal (WhatsApp OTP & Demo Switcher) */}
      <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Bottom Nav */}
      <BottomNavBar activeTab="profile" />
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
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FED65B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  goldBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5C4500',
    letterSpacing: 0.5,
  },
  profilePhone: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  goldCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 20,
    padding: Spacing.lg,
    backgroundColor: '#FED65B',
    borderWidth: 1.5,
    borderColor: '#E6BC30',
    shadowColor: '#735C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: '900',
    color: '#423000',
    letterSpacing: 1,
  },
  cardSub: {
    fontSize: 11,
    color: '#664E00',
    fontWeight: '600',
  },
  chipGraphic: {
    width: 36,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#E5BF3B',
    borderWidth: 1,
    borderColor: '#C7A221',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInner: {
    width: 20,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#9E7F14',
  },
  memberIdSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 14,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  idLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5C4500',
    letterSpacing: 1,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  idNumber: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#2E2000',
    fontFamily: 'monospace',
  },
  barcodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
  },
  scanPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  scanPromptText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2D1F00',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  pointsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5C4500',
    letterSpacing: 0.8,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D1F00',
    marginTop: 1,
  },
  pointsUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C4500',
  },
  pointRupiah: {
    fontSize: 11,
    color: '#5C4500',
    fontWeight: '600',
  },
  qrIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2D1F00',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: '#5C4500',
    marginTop: 4,
    fontWeight: '600',
  },
  sectionWrap: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  rewardsList: {
    gap: Spacing.sm,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EEF2F9',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  rewardIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTextWrap: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  rewardDesc: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  costText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  redeemActionBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  redeemActionBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  redeemActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.light.textMuted,
    marginBottom: Spacing.xs,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F9',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  menuItemSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: Spacing.md,
  },
  versionBox: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  versionText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  copyrightText: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  qrModalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  qrModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  qrModalSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  qrCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    backgroundColor: '#F8FAFF',
    borderWidth: 2,
    borderColor: '#FED65B',
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  qrImageContainer: {
    position: 'relative',
    width: 210,
    height: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  qrImage: {
    width: 195,
    height: 195,
    borderRadius: 10,
  },
  qrCenterLogo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FED65B',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  qrMemberNo: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.light.text,
    marginTop: Spacing.md,
    fontFamily: 'monospace',
  },
  qrMemberName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  qrBenefitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  qrBenefitText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  guestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  guestBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  guestLoginBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  guestLoginBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
