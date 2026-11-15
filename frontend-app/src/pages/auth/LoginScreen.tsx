import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { loginUser } from '@/services/api'
import { Lock, User, ArrowLeft, ShieldCheck, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Check search params for redirect target or query
  const queryParams = new URLSearchParams(location.search)
  const redirectTarget = queryParams.get('redirect')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi')
      return
    }

    setIsLoading(true)
    try {
      const res = await loginUser(username.trim(), password.trim())
      login(res.token, {
        username: res.username,
        displayName: res.display_name,
        role: res.role,
      })

      if (redirectTarget) {
        navigate(redirectTarget, { replace: true })
      } else if (res.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/kasir', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Username atau password salah'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b1538]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-[#d4af37]/25 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Portal Utama</span>
        </Link>

        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b1538] to-[#590e24] border border-[#d4af37]/40 text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            🕌
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8b1538]/25 border border-[#d4af37]/30 text-[10px] font-bold tracking-widest text-[#d4af37] uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Otentikasi RBAC Terpusat</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Login Petugas & Admin</h2>
          <p className="text-xs text-slate-400 mt-1">Masukkan ID Akun & Password / PIN Toko</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-xs text-red-200 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Username / ID Login</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Misal: admin / kasir1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-[#d4af37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Password / PIN Kasir</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Masukkan kata sandi / 6 digit PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-[#d4af37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-[#8b1538] to-[#a31a43] hover:from-[#a31a43] hover:to-[#be2250] text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk ke Sistem</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            Akses Admin khusus pengurus toko • Kasir menggunakan username & PIN yang terdaftar
          </p>
        </div>
      </div>
    </div>
  )
}

