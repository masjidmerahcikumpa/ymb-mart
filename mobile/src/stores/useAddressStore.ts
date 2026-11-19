import { create } from 'zustand';
import {
  fetchCustomerAddresses,
  saveCustomerAddress,
  deleteCustomerAddress,
} from '@/services/api';

export interface CustomerAddress {
  id: string;
  label: string; // 'Rumah' | 'Kantor' | 'Lainnya'
  recipientName: string;
  phone: string;
  addressLine: string;
  benchmarkNote: string;
  isPrimary?: boolean;
}

const DEFAULT_ADDRESSES: CustomerAddress[] = [
  {
    id: 'addr-1',
    label: 'Rumah',
    recipientName: 'Ahmad Dani',
    phone: '0812-3456-7890',
    addressLine: 'Jl. Cikumpa No. 12, RT 03 / RW 02, Sukmajaya, Depok',
    benchmarkNote: 'Samping Musala Al-Ikhlas, rumah pagar hitam',
    isPrimary: true,
  },
  {
    id: 'addr-2',
    label: 'Kantor',
    recipientName: 'Ahmad Dani (Kantor)',
    phone: '0812-3456-7890',
    addressLine: 'Jl. Tole Iskandar No. 88, Ruko Graha Cikumpa Blok B3',
    benchmarkNote: 'Lantai 2, seberang SPBU Pertamina',
    isPrimary: false,
  },
];

interface AddressState {
  addresses: CustomerAddress[];
  selectedId: string;
  isLoading: boolean;
  getSelectedAddress: () => CustomerAddress;
  selectAddress: (id: string) => void;
  loadAddresses: (phone: string, memberId?: string) => Promise<void>;
  addAddress: (addr: Omit<CustomerAddress, 'id'>, memberId?: string) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: DEFAULT_ADDRESSES,
  selectedId: 'addr-1',
  isLoading: false,

  getSelectedAddress: () => {
    const { addresses, selectedId } = get();
    return addresses.find((a) => a.id === selectedId) || addresses[0] || DEFAULT_ADDRESSES[0];
  },

  selectAddress: (id: string) => {
    set({ selectedId: id });
  },

  loadAddresses: async (phone: string, memberId?: string) => {
    if (!phone && !memberId) return;
    set({ isLoading: true });
    try {
      const data = await fetchCustomerAddresses(phone, memberId);
      if (Array.isArray(data) && data.length > 0) {
        const mapped: CustomerAddress[] = data.map((d: any) => ({
          id: d.id || `addr-${d.db_id}`,
          label: d.label || 'Rumah',
          recipientName: d.recipientName || d.recipient_name,
          phone: d.phone,
          addressLine: d.addressLine || d.address_line,
          benchmarkNote: d.benchmarkNote || d.benchmark_note || '',
          isPrimary: d.isPrimary || d.is_primary,
        }));
        const primary = mapped.find((a) => a.isPrimary) || mapped[0];
        set({ addresses: mapped, selectedId: primary ? primary.id : mapped[0]?.id || '' });
      }
    } catch (e) {
      console.warn('[AddressStore] loadAddresses fallback:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addAddress: async (newAddr, memberId) => {
    const tempId = `addr-${Date.now()}`;
    const entry: CustomerAddress = { ...newAddr, id: tempId };
    set((state) => ({
      addresses: [entry, ...state.addresses],
      selectedId: tempId,
    }));

    try {
      const res = await saveCustomerAddress({
        member_id: memberId || '',
        phone: newAddr.phone,
        label: newAddr.label,
        recipient_name: newAddr.recipientName,
        address_line: newAddr.addressLine,
        benchmark_note: newAddr.benchmarkNote,
        is_primary: !!newAddr.isPrimary,
      });
      if (res && res.success && res.id) {
        set((state) => ({
          addresses: state.addresses.map((a) => (a.id === tempId ? { ...a, id: res.id! } : a)),
          selectedId: res.id!,
        }));
      }
    } catch (e) {
      console.warn('[AddressStore] saveCustomerAddress error:', e);
    }
  },

  deleteAddress: async (id: string) => {
    set((state) => {
      const remaining = state.addresses.filter((a) => a.id !== id);
      const nextSelected = state.selectedId === id ? remaining[0]?.id || '' : state.selectedId;
      return {
        addresses: remaining,
        selectedId: nextSelected,
      };
    });

    try {
      await deleteCustomerAddress(id);
    } catch (e) {
      console.warn('[AddressStore] deleteCustomerAddress error:', e);
    }
  },
}));
