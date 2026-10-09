import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  X,
  Phone,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  KeyRound,
} from 'lucide-react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore, PRESET_USERS } from '@/stores/useAuthStore';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const loginWithPhone = useAuthStore((state) => state.loginWithPhone);
  const loginAsPreset = useAuthStore((state) => state.loginAsPreset);
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);

  useEffect(() => {
    if (visible) {
      setStep('phone');
      setPhoneNumber('');
      setFullName('');
      setOtpCode(['', '', '', '']);
      setIsLoading(false);
      setResendTimer(45);
    }
  }, [visible]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSendOtp = () => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 8) {
      Alert.alert('Nomor Tidak Valid', 'Masukkan nomor WhatsApp aktif minimal 8-12 digit.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      setResendTimer(45);
    }, 600);
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length < 4) {
      Alert.alert('Kode OTP Belum Lengkap', 'Masukkan 4 digit kode OTP yang dikirim ke WhatsApp Anda.');
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      await loginWithPhone(phoneNumber, fullName);
      setIsLoading(false);
      setStep('success');

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    }, 700);
  };

  const handleSelectPreset = (key: keyof typeof PRESET_USERS) => {
    const preset = PRESET_USERS[key];
    setPhoneNumber(preset.phone);
    setFullName(preset.name);
    loginAsPreset(key);
    setStep('success');

    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1200);
  };

  const handleFillQuickOtp = () => {
    setOtpCode(['8', '8', '2', '9']);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.mosqueBadge}>
                <Text style={{ fontSize: 20 }}>🕌</Text>
              </View>
              <View>
                <Text style={styles.title}>Member Baiturrahman</Text>
                <Text style={styles.subtitle}>Akses Poin & Harga Khusus Jamaah</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {step === 'phone' ? (
              /* STEP 1: Phone & WhatsApp Input */
              <View style={styles.body}>
                <Text style={styles.sectionHeading}>Masuk dengan Nomor WhatsApp</Text>
                <Text style={styles.sectionDesc}>
                  Poin belanja di toko fisik kasir dan aplikasi akan otomatis terhubung ke akun Anda.
                </Text>

                {/* Phone Input Box */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nomor WhatsApp</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={{ fontSize: 16 }}>🇮🇩</Text>
                      <Text style={styles.countryCodeText}>+62</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="812-3456-7890"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                  </View>
                </View>

                {/* Name Input Box (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Jamaah / Panggilan (Opsional)</Text>
                  <View style={styles.textInputRow}>
                    <User size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Contoh: Pak Haji Bambang"
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                {/* Submit Send OTP Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MessageCircle size={18} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Kirim Kode OTP via WhatsApp</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Quick Presets for Instant Demo */}
                <View style={styles.presetSection}>
                  <Text style={styles.presetTitle}>⚡ Masuk Instan (Demo Profil Member):</Text>
                  <View style={styles.presetList}>
                    {(Object.keys(PRESET_USERS) as Array<keyof typeof PRESET_USERS>).map((key) => {
                      const item = PRESET_USERS[key];
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.presetItem}
                          onPress={() => handleSelectPreset(key)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.presetAvatar}>
                            <Text style={{ fontSize: 16 }}>👤</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.presetName}>{item.name}</Text>
                            <Text style={styles.presetMeta}>
                              {item.tier} • {item.points.toLocaleString('id-ID')} Poin
                            </Text>
                          </View>
                          <ArrowRight size={14} color={Colors.light.primary} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : step === 'otp' ? (
              /* STEP 2: OTP Verification */
              <View style={styles.body}>
                <View style={styles.otpHeader}>
                  <View style={styles.otpIconBadge}>
                    <ShieldCheck size={28} color={Colors.light.primary} />
                  </View>
                  <Text style={styles.sectionHeading}>Masukkan 4 Digit Kode OTP</Text>
                  <Text style={styles.sectionDesc}>
                    Kode verifikasi telah dikirim ke WhatsApp <Text style={{ fontWeight: '700', color: Colors.light.text }}>+62 {phoneNumber || '812-xxxx'}</Text>
                  </Text>
                </View>

                {/* OTP 4-Box Inputs */}
                <View style={styles.otpBoxesRow}>
                  {[0, 1, 2, 3].map((index) => (
                    <TextInput
                      key={index}
                      style={[styles.otpBox, otpCode[index] ? styles.otpBoxFilled : null]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={otpCode[index]}
                      onChangeText={(val) => {
                        const next = [...otpCode];
                        next[index] = val;
                        setOtpCode(next);
                      }}
                    />
                  ))}
                </View>

                {/* Quick Auto-Fill Chip */}
                <TouchableOpacity
                  style={styles.quickFillChip}
                  onPress={handleFillQuickOtp}
                  activeOpacity={0.75}
                >
                  <Sparkles size={14} color="#B45309" />
                  <Text style={styles.quickFillText}>Klik untuk Auto-Isi Kode: [ 8 8 2 9 ]</Text>
                </TouchableOpacity>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <KeyRound size={18} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Verifikasi & Masuk Akun</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Tidak menerima kode? </Text>
                  {resendTimer > 0 ? (
                    <Text style={styles.timerText}>Kirim ulang ({resendTimer}s)</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp}>
                      <Text style={styles.resendLink}>Kirim Ulang OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              /* STEP 3: Success Screen */
              <View style={styles.successBody}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={44} color="#059669" />
                </View>
                <Text style={styles.successTitle}>Berhasil Masuk!</Text>
                <Text style={styles.successSub}>
                  Ahlan wa Sahlan, <Text style={{ fontWeight: '800' }}>{user.name}</Text>
                </Text>

                <View style={styles.memberPill}>
                  <Sparkles size={14} color="#735C00" />
                  <Text style={styles.memberPillText}>
                    {user.tier} • {user.points.toLocaleString('id-ID')} Poin Tersedia
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mosqueBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 11,
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
  scrollContent: {
    paddingVertical: Spacing.sm,
  },
  body: {
    paddingTop: Spacing.xs,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.light.text,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: Colors.light.text,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: Spacing.xs,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textMuted,
    marginBottom: 8,
  },
  presetList: {
    gap: 6,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  presetAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  presetMeta: {
    fontSize: 10,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  otpIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: Spacing.md,
  },
  otpBox: {
    width: 54,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  otpBoxFilled: {
    borderColor: Colors.light.primary,
    backgroundColor: '#FFFFFF',
  },
  quickFillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  quickFillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  resendText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
  resendLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  successBody: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  successSub: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FEF08A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: Spacing.md,
  },
  memberPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
  },
});
