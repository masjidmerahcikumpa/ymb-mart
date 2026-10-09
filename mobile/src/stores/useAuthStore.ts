import { create } from 'zustand';

export interface UserProfile {
  name: string;
  phone: string;
  memberId: string;
  tier: 'REGULER' | 'SILVER' | 'VIP GOLD' | 'PLATINUM';
  points: number;
  avatarUrl?: string;
  email?: string;
  joinedDate?: string;
}

export const PRESET_USERS: Record<string, UserProfile> = {
  ahmad: {
    name: 'H. Ahmad Syarif',
    phone: '0812-3456-7890',
    memberId: 'YMB-8829-1092',
    tier: 'VIP GOLD',
    points: 1450,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    email: 'ahmad.syarif@baiturrahman.id',
    joinedDate: 'Februari 2024',
  },
  maryam: {
    name: 'Hj. Maryam Zulaikha',
    phone: '0819-8765-4321',
    memberId: 'YMB-5512-3041',
    tier: 'SILVER',
    points: 820,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
    email: 'maryam.z@gmail.com',
    joinedDate: 'Juni 2025',
  },
  fauzan: {
    name: 'Ustadz Fauzan Al-Banjari',
    phone: '0857-1122-3344',
    memberId: 'YMB-1001-0008',
    tier: 'PLATINUM',
    points: 3680,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    email: 'fauzan.dakwah@masjid.id',
    joinedDate: 'Januari 2023',
  },
};

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile;
  loginWithPhone: (phone: string, name?: string) => Promise<boolean>;
  loginAsPreset: (presetKey: keyof typeof PRESET_USERS) => void;
  logout: () => void;
  deductPoints: (amount: number) => boolean;
  addPoints: (amount: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: true,
  user: PRESET_USERS.ahmad,

  loginWithPhone: async (phone: string, name?: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const formatted = cleaned.startsWith('0') ? cleaned : `0${cleaned}`;

    const foundPreset = Object.values(PRESET_USERS).find(
      (u) => u.phone.replace(/[^0-9]/g, '') === formatted
    );

    if (foundPreset) {
      set({ isAuthenticated: true, user: foundPreset });
      return true;
    }

    const newMemberId = `YMB-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newUser: UserProfile = {
      name: name?.trim() || `Jamaah ${formatted.slice(-4)}`,
      phone: formatted,
      memberId: newMemberId,
      tier: 'SILVER',
      points: 250,
      joinedDate: 'Hari Ini',
    };

    set({ isAuthenticated: true, user: newUser });
    return true;
  },

  loginAsPreset: (presetKey: keyof typeof PRESET_USERS) => {
    if (PRESET_USERS[presetKey]) {
      set({ isAuthenticated: true, user: PRESET_USERS[presetKey] });
    }
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: {
        name: 'Tamu Baiturrahman',
        phone: '',
        memberId: 'GUEST-0000',
        tier: 'REGULER',
        points: 0,
      },
    });
  },

  deductPoints: (amount: number) => {
    const current = get().user.points;
    if (current < amount) return false;
    set((state) => ({
      user: {
        ...state.user,
        points: state.user.points - amount,
      },
    }));
    return true;
  },

  addPoints: (amount: number) => {
    set((state) => ({
      user: {
        ...state.user,
        points: state.user.points + amount,
      },
    }));
  },

  updateProfile: (updates: Partial<UserProfile>) => {
    set((state) => ({
      user: {
        ...state.user,
        ...updates,
      },
    }));
  },
}));
