import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMembers, addMember, fetchMemberTransactions, type MemberTransaction } from '@/services/api'
import type { Member } from '@/types/member'
import { formatRupiah } from '@/utils/currency'
import { showSuccessAlert, showErrorAlert } from '@/utils/alert'
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  Award,
  X,
  Check,
  Receipt,
  ShoppingBag,
} from 'lucide-react'

export const MemberManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMemberForTx, setSelectedMemberForTx] = useState<Member | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' })

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin-members', searchTerm],
    queryFn: () => fetchMembers(searchTerm),
  })

  const { data: memberTransactions = [], isLoading: isLoadingTx } = useQuery<MemberTransaction[]>({
    queryKey: ['admin-member-transactions', selectedMemberForTx?.member_id],
    queryFn: () => (selectedMemberForTx ? fetchMemberTransactions(selectedMemberForTx.member_id) : Promise.resolve([])),
    enabled: !!selectedMemberForTx,
  })

  const addMutation = useMutation({
    mutationFn: addMember,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setIsAddModalOpen(false)
      setFormData({ name: '', phone: '', email: '' })
      showSuccessAlert('Registrasi Berhasil', `Member baru berhasil didaftarkan dengan ID: ${data.member_id}`)
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Registrasi', `Gagal menambah member: ${err.message}`)
    },
  })

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim()) {
      showErrorAlert('Validasi Data', 'Nama dan No. HP wajib diisi')
      return
    }
    addMutation.mutate({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    })
  }

  return (
    <div className="space-y-4">
      {/* Header Banner & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8b1538]" />
            <span>Manajemen Member & Jemaah Masjid</span>
          </h3>
          <p className="text-xs text-slate-400">
            Kelola data loyalitas pelanggan, akumulasi poin belanja, dan tier diskon jemaah
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Member Baru</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama member, nomor HP, atau Member ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">{members.length} member terdaftar</span>
      </div>

      {/* Member Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Nama Lengkap</th>
                <th className="py-3 px-3">No. Handphone</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3 text-center">Tier Member</th>
                <th className="py-3 px-3 text-right">Poin Loyalitas</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data member...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada member yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                members.map((m: Member) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{m.member_id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{m.name}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {m.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.email}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.tier === 'gold'
                            ? 'bg-amber-100 text-amber-800'
                            : m.tier === 'silver'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        <span className="capitalize">{m.tier || 'basic'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#8b1538]">
                      {m.points || 0} Poin
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedMemberForTx(m)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Lihat Riwayat Transaksi Belanja"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-500" />
                        <span>Riwayat</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Member Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Registrasi Member Baru</h3>
                <p className="text-xs text-white/80">Program Loyalitas Jemaah YMB Mart</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama jemaah / pelanggan..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP *</label>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
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
                  <span>{addMutation.isPending ? 'Mendaftarkan...' : 'Daftarkan Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Riwayat Transaksi Member */}
      {selectedMemberForTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#8b1538] flex items-center justify-center text-white shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Riwayat Belanja Member</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                    <span className="font-mono font-bold text-amber-300">{selectedMemberForTx.member_id}</span>
                    <span>•</span>
                    <span className="font-semibold text-white">{selectedMemberForTx.name}</span>
                    <span>•</span>
                    <span className="capitalize px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-bold">
                      {selectedMemberForTx.tier || 'basic'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberForTx(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Kunjungan</p>
                <p className="text-base font-black text-slate-800 mt-0.5">{memberTransactions.length} Transaksi</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Akumulasi Belanja</p>
                <p className="text-base font-black text-[#8b1538] mt-0.5">
                  {formatRupiah(memberTransactions.reduce((acc, t) => acc + (t.grand_total || 0), 0))}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poin Loyalitas</p>
                <p className="text-base font-black text-amber-600 mt-0.5">{selectedMemberForTx.points || 0} Poin</p>
              </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {isLoadingTx ? (
                <div className="py-12 text-center text-slate-400 text-xs">Memuat riwayat transaksi member...</div>
              ) : memberTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">Belum Ada Riwayat Transaksi</p>
                  <p className="text-[11px] mt-0.5">Member ini belum memiliki transaksi selesai di kasir.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">No. Struk</th>
                        <th className="py-2.5 px-3">Waktu Transaksi</th>
                        <th className="py-2.5 px-3 text-center">Metode</th>
                        <th className="py-2.5 px-3 text-right">Diskon</th>
                        <th className="py-2.5 px-3 text-right">Total Belanja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberTransactions.map((tx) => (
                        <tr key={tx.tx_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{tx.tx_id}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {tx.created_at || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {tx.payment || 'cash'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                            {tx.discount > 0 ? formatRupiah(tx.discount) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                            {formatRupiah(tx.grand_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedMemberForTx(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
