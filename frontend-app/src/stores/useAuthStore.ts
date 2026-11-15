import { create } from 'zustand'
import { setSessionToken, clearSession, getSessionToken } from '@/services/api'

export interface AuthUser {
  username: string
  displayName: string
  role: 'admin' | 'cashier' | 'kasir'
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = getSessionToken()
  const savedUserStr = localStorage.getItem('ymb_user')
  let savedUser: AuthUser | null = null
  if (savedUserStr) {
    try {
      savedUser = JSON.parse(savedUserStr)
    } catch {
      // ignore
    }
  }

  return {
    isAuthenticated: Boolean(savedToken && savedUser),
    user: savedUser,
    token: savedToken || null,
    login: (token: string, user: AuthUser) => {
      setSessionToken(token)
      localStorage.setItem('ymb_user', JSON.stringify(user))
      set({ isAuthenticated: true, token, user })
    },
    logout: () => {
      clearSession()
      set({ isAuthenticated: false, token: null, user: null })
    },
  }
})

