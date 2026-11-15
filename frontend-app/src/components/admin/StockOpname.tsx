import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStockOpnameSessions,
  createStockOpnameSession,
  fetchStockOpnameSession,
  submitStockOpname,
  applyStockOpname,
} from '@/services/api'
import type { StockOpnameSession, StockOpnameItem } from '@/types/admin'
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/utils/alert'
import {
  ClipboardCheck,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle2,
  Save,
  AlertCircle,
  X,
} from 'lucide-react'

export const StockOpname: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newOpnameDate, setNewOpnameDate] = useState(new Date().toISOString().split('T')[0])
  const [newNotes, setNewNotes] = useState('')

  // Sesi list query
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['stock-opname-sessions'],
    queryFn: fetchStockOpnameSessions,
  })

  // Sesi detail query
  const { data: sessionDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['stock-opname-detail', activeSessionId],
    queryFn: () => (activeSessionId ? fetchStockOpnameSession(activeSessionId) : null),
    enabled: !!activeSessionId,
  })

  // Local physical quantities state for active session
  const [countedMap, setCountedMap] = useState<Record<number, number | ''>>({})
  const [itemSearch, setItemSearch] = useState('')

  // Synchronize countedMap when sessionDetail loads
  React.useEffect(() => {
    if (sessionDetail && sessionDetail.items) {
      const map: Record<number, number | ''> = {}
      sessionDetail.items.forEach((item: StockOpnameItem) => {
        map[item.product_id] = item.physical_qty !== null ? item.physical_qty : ''
      })
      setCountedMap(map)
    }
  }, [sessionDetail])

  // Create Session Mutation
  const createMutation = useMutation({
    mutationFn: createStockOpnameSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-sessions'] })
      setIsNewModalOpen(false)
      setActiveSessionId(data.session_id)
      setNewNotes('')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Membuat Sesi', `Gagal membuat sesi opname: ${err.message}`)
    },
  })

  // Submit Draft Mutation
  const submitMutation = useMutation({
    mutationFn: ({ sessionId, items }: { sessionId: number; items: { product_id: number; physical_qty: number }[] }) =>
      submitStockOpname(sessionId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail', activeSessionId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-sessions'] })
      showSuccessAlert('Sukses', 'Draft hitungan fisik berhasil disimpan!')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Menyimpan', `Gagal menyimpan hitungan: ${err.message}`)
    },
  })

  // Apply Opname Mutation
  const applyMutation = useMutation({
    mutationFn: (sessionId: number) => applyStockOpname(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail', activeSessionId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      showSuccessAlert('Sukses', 'Stok fisik berhasil diterapkan ke seluruh master produk toko!')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Menerapkan', `Gagal menerapkan hasil opname: ${err.message}`)
    },
  })

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      opname_date: newOpnameDate,
      notes: newNotes.trim() || 'Pemeriksaan rutin rak toko',
    })
  }

  const handleCountChange = (productId: number, val: string) => {
    const num = val === '' ? '' : parseInt(val, 10)
    setCountedMap((prev) => ({
      ...prev,
      [productId]: isNaN(num as number) ? '' : num,
    }))
  }

  const handleSaveDraft = () => {
    if (!activeSessionId) return
    const itemsToSubmit: { product_id: number; physical_qty: number }[] = []
    Object.entries(countedMap).forEach(([pidStr, qty]) => {
      if (qty !== '') {
        itemsToSubmit.push({
          product_id: parseInt(pidStr, 10),
          physical_qty: Number(qty),
        })
      }
    })
    submitMutation.mutate({ sessionId: activeSessionId, items: itemsToSubmit })
  }

  const handleApplyFinal = async () => {
    if (!activeSessionId) return
    const confirmed = await showConfirmAlert({
      title: 'Terapkan Hasil Opname?',
      text: 'PERINGATAN: Stok semua produk di toko akan disesuaikan dengan stok fisik yang dihitung. Tindakan ini tidak dapat dibatalkan.',
      confirmButtonText: 'Ya, Terapkan Stok',
      cancelButtonText: 'Batal',
      icon: 'warning',
    })
    if (confirmed) {
      applyMutation.mutate(activeSessionId)
    }
  }

  // Filter items in active session
  const filteredItems = (sessionDetail?.items || []).filter((item: StockOpnameItem) => {
    if (!itemSearch) return true
    const q = itemSearch.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q))
    )
  })

  // ================= VIEW: DETAIL SESI AKTIF =================
  if (activeSessionId) {
    const isSessionOpen = sessionDetail?.session?.status === 'open'

    return (
      <div className="space-y-4">
        {/* Detail Header */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSessionId(null)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-800">
                  Sesi Opname #{activeSessionId} ({sessionDetail?.session?.opname_date || '...'})
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSessionOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSessionOpen ? 'SEDANG BERJALAN' : 'SELESAI (APPLIED)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {sessionDetail?.session?.notes || 'Tidak ada catatan'} • Oleh: {sessionDetail?.session?.created_by || 'Admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSessionOpen && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={submitMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>{submitMutation.isPending ? 'Menyimpan...' : 'Simpan Hitungan'}</span>
                </button>
                <button
                  onClick={handleApplyFinal}
                  disabled={applyMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{applyMutation.isPending ? 'Menerapkan...' : 'Terapkan Stok ke Toko'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Bar for Opname Items */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Scan barcode rak atau ketik nama produk..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredItems.length} dari {sessionDetail?.items?.length || 0} produk
          </span>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-3">Produk</th>
                  <th className="py-3 px-3">SKU / Barcode</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-center">Stok Sistem</th>
                  <th className="py-3 px-3 text-center">Stok Fisik Rak</th>
                  <th className="py-3 px-3 text-center">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Memuat daftar produk opname...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada produk ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item: StockOpnameItem) => {
                    const currentCount = countedMap[item.product_id]
                    const hasCount = currentCount !== '' && currentCount !== undefined
                    const diff = hasCount ? (currentCount as number) - item.system_qty : null

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                          <div>{item.sku}</div>
                          {item.barcode && <div className="text-slate-400 text-[10px]">{item.barcode}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-600">
                          {item.system_qty} {item.unit || 'pcs'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isSessionOpen ? (
                            <input
                              type="number"
                              min={0}
                              placeholder="-"
                              value={currentCount === undefined ? '' : currentCount}
                              onChange={(e) => handleCountChange(item.product_id, e.target.value)}
                              className="w-20 text-center py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                            />
                          ) : (
                            <span className="font-bold text-slate-800">
                              {item.physical_qty !== null ? item.physical_qty : '-'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {diff !== null ? (
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                diff === 0
                                  ? 'bg-slate-100 text-slate-600'
                                  : diff < 0
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Belum dihitung</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ================= VIEW: LIST SESI OPNAME =================
  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#8b1538]" />
            <span>Manajemen Stock Opname Fisik</span>
          </h3>
          <p className="text-xs text-slate-400">
            Rekonsiliasi dan verifikasi stok fisik rak toko vs database sistem POS
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi Opname Baru</span>
        </button>
      </div>

      {/* Sesi List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Sesi ID</th>
                <th className="py-3 px-3">Tanggal Pelaksanaan</th>
                <th className="py-3 px-3">Catatan / Keterangan</th>
                <th className="py-3 px-3">Petugas</th>
                <th className="py-3 px-3 text-center">Progress Hitung</th>
                <th className="py-3 px-3 text-center">Item Selisih</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionsLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat riwayat sesi opname...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada sesi stock opname. Buat sesi baru untuk mulai menghitung stok fisik rak toko.
                  </td>
                </tr>
              ) : (
                sessions.map((s: StockOpnameSession) => {
                  const isOpen = s.status === 'open'
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">#{s.id}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{s.opname_date}</td>
                      <td className="py-3 px-3 text-slate-600">{s.notes || '-'}</td>
                      <td className="py-3 px-3 text-slate-600">{s.created_by}</td>
                      <td className="py-3 px-3 text-center font-medium">
                        {s.counted_items} / {s.total_items}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            s.difference_items > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.difference_items} item
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isOpen ? 'OPEN' : 'APPLIED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setActiveSessionId(s.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          {isOpen ? 'Input Hitungan →' : 'Lihat Hasil →'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Buat Sesi Baru */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Buat Sesi Stock Opname Baru</h3>
                <p className="text-xs text-white/80">Kloning snapshot stok sistem saat ini</p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pelaksanaan *</label>
                <input
                  type="date"
                  required
                  value={newOpnameDate}
                  onChange={(e) => setNewOpnameDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Sesi</label>
                <textarea
                  rows={3}
                  placeholder="Misal: Opname bulanan rak sembako & snack..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  Sistem akan merekam stok buku semua produk aktif saat ini sebagai baseline perbandingan fisik.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {createMutation.isPending ? 'Membuat Sesi...' : 'Mulai Sesi Opname'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

