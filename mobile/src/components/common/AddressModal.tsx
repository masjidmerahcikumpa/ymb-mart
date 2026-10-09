import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  X,
  MapPin,
  CheckCircle2,
  Plus,
  Home,
  Briefcase,
  Navigation,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useAddressStore, CustomerAddress } from '@/stores/useAddressStore';

interface AddressModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({ visible, onClose }) => {
  const addresses = useAddressStore((state) => state.addresses);
  const selectedId = useAddressStore((state) => state.selectedId);
  const selectAddress = useAddressStore((state) => state.selectAddress);
  const addAddress = useAddressStore((state) => state.addAddress);

  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('Rumah');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [benchmarkNote, setBenchmarkNote] = useState('');

  const handleSelect = (id: string) => {
    selectAddress(id);
    onClose();
  };

  const handleSaveNew = () => {
    if (!recipientName.trim() || !phone.trim() || !addressLine.trim()) {
      Alert.alert('Data Belum Lengkap', 'Mohon isi nama, no telepon, dan alamat lengkap.');
      return;
    }

    addAddress({
      label,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      benchmarkNote: benchmarkNote.trim() || 'Dekat area Masjid Baiturrahman',
      isPrimary: false,
    });

    setIsAdding(false);
    setRecipientName('');
    setPhone('');
    setAddressLine('');
    setBenchmarkNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {isAdding ? 'Tambah Alamat Pengiriman' : 'Pilih Alamat Antar'}
              </Text>
              <Text style={styles.subtitle}>
                {isAdding ? 'Pastikan alamat akurat dalam radius 15–30 menit' : 'Kurir kami mengantar langsung dari Baiturrahman Mart'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {isAdding ? (
              /* Form Tambah Alamat */
              <View style={styles.formContainer}>
                {/* Label Pilihan */}
                <Text style={styles.inputLabel}>Tipe Alamat</Text>
                <View style={styles.labelRow}>
                  {['Rumah', 'Kantor', 'Lainnya'].map((l) => (
                    <TouchableOpacity
                      key={l}
                      style={[styles.labelChip, label === l && styles.labelChipActive]}
                      onPress={() => setLabel(l)}
                      activeOpacity={0.75}
                    >
                      {l === 'Rumah' && <Home size={14} color={label === l ? '#FFFFFF' : Colors.light.text} />}
                      {l === 'Kantor' && <Briefcase size={14} color={label === l ? '#FFFFFF' : Colors.light.text} />}
                      {l === 'Lainnya' && <MapPin size={14} color={label === l ? '#FFFFFF' : Colors.light.text} />}
                      <Text style={[styles.labelChipText, label === l && styles.labelChipTextActive]}>
                        {l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Nama Penerima */}
                <Text style={styles.inputLabel}>Nama Penerima</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Ahmad Dani"
                  placeholderTextColor={Colors.light.textMuted}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />

                {/* No Telepon */}
                <Text style={styles.inputLabel}>Nomor WhatsApp / HP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                {/* Alamat Lengkap */}
                <Text style={styles.inputLabel}>Alamat Lengkap (Jalan, No Rumah, RT/RW)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Contoh: Jl. Cikumpa No. 12, RT 03 / RW 02, Kel. Sukmajaya"
                  placeholderTextColor={Colors.light.textMuted}
                  multiline
                  numberOfLines={3}
                  value={addressLine}
                  onChangeText={setAddressLine}
                />

                {/* Patokan Kurir */}
                <Text style={styles.inputLabel}>Patokan untuk Kurir (Opsional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Depan warung Madura, pagar hijau"
                  placeholderTextColor={Colors.light.textMuted}
                  value={benchmarkNote}
                  onChangeText={setBenchmarkNote}
                />

                {/* Tombol Simpan Form */}
                <View style={styles.formActionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsAdding(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveNew}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveBtnText}>Simpan & Pakai</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* List Alamat Tersimpan */
              <View style={styles.listContainer}>
                {addresses.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.addressCard, isSelected && styles.addressCardActive]}
                      onPress={() => handleSelect(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <View style={styles.tagBadge}>
                            <Text style={styles.tagBadgeText}>{item.label}</Text>
                          </View>
                          {item.isPrimary && (
                            <View style={styles.primaryBadge}>
                              <Text style={styles.primaryBadgeText}>Utama</Text>
                            </View>
                          )}
                        </View>
                        {isSelected && (
                          <CheckCircle2 size={18} color={Colors.light.primary} />
                        )}
                      </View>

                      <Text style={styles.recipientTitle}>
                        {item.recipientName} <Text style={styles.phoneSub}>({item.phone})</Text>
                      </Text>
                      <Text style={styles.addressText}>{item.addressLine}</Text>

                      {item.benchmarkNote ? (
                        <View style={styles.benchmarkRow}>
                          <Text style={styles.benchmarkText}>
                            📌 Patokan: {item.benchmarkNote}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                {/* Tombol Tambah Alamat Baru */}
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setIsAdding(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color={Colors.light.primary} />
                  <Text style={styles.addBtnText}>Tambah Alamat Baru</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3FA',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  listContainer: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: Spacing.md,
  },
  addressCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: '#FDF7F8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  primaryBadge: {
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  recipientTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  phoneSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.light.textMuted,
  },
  addressText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 17,
  },
  benchmarkRow: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  benchmarkText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.light.primary,
    borderRadius: 14,
    backgroundColor: '#FDF7F8',
    marginTop: Spacing.xs,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  formContainer: {
    paddingBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
    marginTop: 10,
  },
  labelRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
  },
  labelChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  labelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  labelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.light.text,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  formActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
