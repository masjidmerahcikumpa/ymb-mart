import { create } from 'zustand';

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
  getSelectedAddress: () => CustomerAddress;
  selectAddress: (id: string) => void;
  addAddress: (addr: Omit<CustomerAddress, 'id'>) => void;
  deleteAddress: (id: string) => void;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: DEFAULT_ADDRESSES,
  selectedId: 'addr-1',

  getSelectedAddress: () => {
    const { addresses, selectedId } = get();
    return addresses.find((a) => a.id === selectedId) || addresses[0] || DEFAULT_ADDRESSES[0];
  },

  selectAddress: (id: string) => {
    set({ selectedId: id });
  },

  addAddress: (newAddr) => {
    const id = `addr-${Date.now()}`;
    const entry: CustomerAddress = { ...newAddr, id };
    set((state) => ({
      addresses: [entry, ...state.addresses],
      selectedId: id,
    }));
  },

  deleteAddress: (id: string) => {
    set((state) => {
      const remaining = state.addresses.filter((a) => a.id !== id);
      const nextSelected = state.selectedId === id ? remaining[0]?.id || '' : state.selectedId;
      return {
        addresses: remaining,
        selectedId: nextSelected,
      };
    });
  },
}));
