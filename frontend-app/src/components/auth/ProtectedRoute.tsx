import React from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { ShieldAlert, ArrowLeft, ShoppingCart } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'cashier'
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  // RBAC Role Check: If route requires 'admin' and user is not admin
  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-white font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/90 border border-red-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-400 flex items-center justify-center mx-auto text-2xl shadow-lg">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Akses Ditolak (RBAC)</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Akun Anda (<strong>{user?.displayName || user?.username}</strong>) memiliki peran sebagai{' '}
              <span className="uppercase text-amber-400 font-bold">{user?.role}</span>. Halaman Backoffice Admin hanya dapat diakses oleh akun berwenang <strong>Administrator</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              to="/kasir"
              className="py-2.5 px-4 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buka Layar Kasir POS</span>
            </Link>

            <Link
              to="/"
              className="py-2 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Portal Hub</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

