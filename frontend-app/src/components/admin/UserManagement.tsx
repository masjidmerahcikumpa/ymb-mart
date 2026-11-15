import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, addCashier, toggleUserStatus, resetUserPIN, changePassword } from '@/services/api'
import type { UserAccount } from '@/types/admin'
import { showSuccessAlert, showErrorAlert } from '@/utils/alert'
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  CheckCircle,
  XCircle,
  X,
  Check,
  Lock,
} from 'lucide-react'

export const UserManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [formData, setFormData] = useState({ username: '', display_name: '', pin: '123456' })
  const [modalError, setModalError] = useState('')

  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null)
  const [newPIN, setNewPIN] = useState('')

  // Change Admin Password State
  const [isChangeAdminPassOpen, setIsChangeAdminPassOpen] = useState(false)
  const [oldAdminPassword, setOldAdminPassword] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('')
  const [adminPassError, setAdminPassError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  const addMutation = useMutation({
    mutationFn: addCashier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setIsAddModalOpen(false)
      setFormData({ username: '', display_name: '', pin: '123456' })
      setModalError('')
      showSuccessAlert('Sukses', 'Kasir baru berhasil ditambahkan!')
    },
    onError: (err: Error) => {
      setModalError(err.message)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleUserStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal', `Gagal mengubah status akun: ${err.message}`)
    },
  })

  const resetPinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: string }) => resetUserPIN(id, pin),
    onSuccess: () => {
      setResetTargetUser(null)
      setNewPIN('')
      showSuccessAlert('Sukses', 'PIN kasir berhasil diperbarui!')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal', `Gagal mereset PIN: ${err.message}`)
    },
  })

  const changePassMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setIsChangeAdminPassOpen(false)
      setOldAdminPassword('')
      setNewAdminPassword('')
      setConfirmAdminPassword('')
      setAdminPassError('')
      showSuccessAlert('Sukses', 'Password Administrator berhasil diperbarui! Silakan gunakan password baru pada sesi berikutnya.')
    },
    onError: (err: Error) => {
      setAdminPassError(err.message || 'Gagal mengubah password')
    },
  })

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminPassError('')
    if (!oldAdminPassword) {
      setAdminPassError('Password lama wajib diisi!')
      return
    }
    if (newAdminPassword.length < 6) {
      setAdminPassError('Password baru minimal 6 karakter!')
      return
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setAdminPassError('Konfirmasi password baru tidak cocok!')
      return
    }
    changePassMutation.mutate({
      username: 'admin',
      old_password: oldAdminPassword,
      new_password: newAdminPassword,
    })
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    if (!formData.username.trim() || !formData.display_name.trim()) {
      setModalError('Username dan Nama Kasir wajib diisi')
      return
    }
    if (!/^\d{6}$/.test(formData.pin)) {
      setModalError('PIN kasir harus berupa tepat 6 digit angka (misal: 123456)')
      return
    }
    addMutation.mutate({
      username: formData.username.trim().toLowerCase(),
      display_name: formData.display_name.trim(),
      pin: formData.pin.trim(),
    })
  }

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetUser) return
    if (!/^\d{6}$/.test(newPIN)) {
      showErrorAlert('Validasi PIN', 'PIN kasir harus tepat 6 digit angka')
      return
    }
    resetPinMutation.mutate({ id: resetTargetUser.id, pin: newPIN })
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#8b1538]" />
            <span>Manajemen Akun Kasir & Hak Akses</span>
          </h3>
          <p className="text-xs text-slate-400">
            Kelola petugas kasir toko, otorisasi login POS, dan reset PIN kasir
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAdminPassError('')
              setIsChangeAdminPassOpen(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Ganti Password Admin</span>
          </button>

          <button
            onClick={() => {
              setModalError('')
              setIsAddModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Kasir Baru</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Username / ID Login</th>
                <th className="py-3 px-3">Nama Lengkap Petugas</th>
                <th className="py-3 px-3 text-center">Hak Akses (Role)</th>
                <th className="py-3 px-3 text-center">Status Akun</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : (
                users.map((u: UserAccount) => {
                  const isActive = u.active === 1
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500">#{u.id}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{u.username}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{u.display_name}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role === 'admin' && (
                            <button
                              onClick={() => {
                                setAdminPassError('')
                                setIsChangeAdminPassOpen(true)
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Ganti Password</span>
                            </button>
                          )}
                          {(u.role === 'cashier' || u.role === 'kasir') && (
                            <>
                              <button
                                onClick={() => {
                                  setResetTargetUser(u)
                                  setNewPIN('')
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                                <span>Reset PIN</span>
                              </button>
                              <button
                                onClick={() => toggleMutation.mutate(u.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  isActive
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Kasir Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Tambah Akun Kasir Baru</h3>
                <p className="text-xs text-white/80">Otorisasi login layar POS</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username / ID Kasir *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: kasir2 / ahmad"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Petugas *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Ahmad Syafi'i"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Kasir (6 Angka) *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono tracking-widest text-center focus:outline-none focus:border-[#8b1538]"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default: 123456</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-5 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{addMutation.isPending ? 'Menyimpan...' : 'Simpan Akun Kasir'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset PIN */}
      {resetTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Reset PIN Kasir</h3>
                <p className="text-xs text-slate-300">{resetTargetUser.display_name}</p>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Baru (6 Angka) *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="Misal: 654321"
                  value={newPIN}
                  onChange={(e) => setNewPIN(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono tracking-widest text-center font-bold focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetPinMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold"
                >
                  {resetPinMutation.isPending ? 'Mereset...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Ganti Password Administrator */}
      {isChangeAdminPassOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Ganti Password Admin</h3>
                  <p className="text-xs text-slate-400">Akun Super Administrator</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeAdminPassOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-5 space-y-3.5">
              {adminPassError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                  {adminPassError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password Saat Ini *</label>
                <input
                  type="password"
                  required
                  placeholder="Password lama..."
                  value={oldAdminPassword}
                  onChange={(e) => setOldAdminPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru (min 6 kar) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password baru..."
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Ulangi password baru..."
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsChangeAdminPassOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changePassMutation.isPending}
                  className="px-5 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{changePassMutation.isPending ? 'Menyimpan...' : 'Perbarui Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

