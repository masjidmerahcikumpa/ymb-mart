import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchSettings,
  updateSettings,
  fetchSyncStatus,
  triggerSync,
  downloadBackup,
  uploadRestore,
} from '@/services/api'
import {
  Settings,
  Cloud,
  RefreshCw,
  Check,
  Store,
  Receipt,
  HeartHandshake,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Percent,
  Coins,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'

export const SystemSettings: React.FC = () => {
  const queryClient = useQueryClient()
  const restoreFileInputRef = useRef<HTMLInputElement>(null)

  const { data: settings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => fetchSettings(false),
  })

  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSync } = useQuery({
    queryKey: ['sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 15000,
  })

  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null)
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false)

  // Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur))
    }, 3500)
  }

  // Initialize formData when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const saveSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      showToast('Pengaturan toko berhasil disimpan & disinkronkan!')
    },
    onError: (err: Error) => {
      showToast(`Gagal menyimpan pengaturan: ${err.message}`, 'error')
    },
  })

  const triggerSyncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      refetchSync()
      showToast('Proses sinkronisasi cloud Turso berhasil dipicu!')
    },
    onError: (err: Error) => {
      showToast(`Gagal memicu sinkronisasi: ${err.message}`, 'error')
    },
  })

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveSettingsMutation.mutate(formData)
  }

  // Backup Download Handler
  const handleDownloadBackup = async () => {
    try {
      setIsDownloadingBackup(true)
      const blob = await downloadBackup()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.download = `ymb_mart_backup_${timestamp}.db`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast('File backup database SQLite berhasil diunduh!')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunduh backup', 'error')
    } finally {
      setIsDownloadingBackup(false)
    }
  }

  // Restore File Selection Handler
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite')) {
      showToast('Format file harus berupa file database SQLite (.db atau .sqlite)', 'error')
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = ''
      return
    }
    setSelectedRestoreFile(file)
    setIsConfirmRestoreOpen(true)
  }

  // Execute Restore Handler
  const handleExecuteRestore = async () => {
    if (!selectedRestoreFile) return
    try {
      setIsRestoring(true)
      const res = await uploadRestore(selectedRestoreFile)
      setIsConfirmRestoreOpen(false)
      setSelectedRestoreFile(null)
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = ''
      showToast(res.message || 'Database berhasil direstore. Muat ulang aplikasi.', 'success')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal merestore database', 'error')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Cloud Sync Status Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800">Turso Cloud Sync Engine</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  syncStatus?.cloud_connected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {syncStatus?.cloud_connected ? 'TERHUBUNG KE TURSO' : 'MODE OFFLINE / STANDALONE'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Antrean data tertunda: <span className="font-bold text-slate-700">{syncStatus?.pending_count || 0} entri</span> • Sinkronisasi terakhir: {syncStatus?.last_sync || 'Baru saja'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerSyncMutation.mutate()}
          disabled={triggerSyncMutation.isPending || syncLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${triggerSyncMutation.isPending ? 'animate-spin' : ''}`} />
          <span>{triggerSyncMutation.isPending ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
        </button>
      </div>

      {/* 2. Database Backup & Restore Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Cadangan & Pemulihan Database (SQLite Local)</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">ymb-mart.db</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Download Backup */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800">Unduh Cadangan Database (.db)</h4>
                <p className="text-[11px] text-slate-400">
                  Simpan salinan database lengkap (produk, transaksi, member, presensi, stok) ke komputer lokal.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isDownloadingBackup}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isDownloadingBackup ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyiapkan File Backup...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup Database Sekarang</span>
                </>
              )}
            </button>
          </div>

          {/* Restore Database */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-100 text-[#8b1538] rounded-lg">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800">Pulihkan Database dari File (.db)</h4>
                <p className="text-[11px] text-slate-400">
                  Timpa database toko aktif dengan file cadangan SQLite yang telah disimpan sebelumnya.
                </p>
              </div>
            </div>

            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".db,.sqlite"
              onChange={handleRestoreFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => restoreFileInputRef.current?.click()}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Pilih File Backup untuk Dipulihkan...</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Store Settings Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-[#8b1538] text-white flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <h3 className="font-bold text-sm">Konfigurasi Toko, Kebijakan Kas & Thermal Struk</h3>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {settingsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Memuat konfigurasi...</div>
          ) : (
            <>
              {/* Store Identity */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-slate-500" />
                  <span>Identitas Toko & Masjid</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko *</label>
                    <input
                      type="text"
                      value={formData['store_name'] || 'Baiturrahman Mart'}
                      onChange={(e) => handleChange('store_name', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon / CS</label>
                    <input
                      type="text"
                      value={formData['store_phone'] || ''}
                      onChange={(e) => handleChange('store_phone', e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Toko / Masjid</label>
                    <input
                      type="text"
                      value={formData['store_address'] || ''}
                      onChange={(e) => handleChange('store_address', e.target.value)}
                      placeholder="Komplek Masjid Baiturrahman, Jl..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Operational Policy */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>Kebijakan Operasional Kas & Finansial</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Default Opening Cash */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Modal Awal Kasir Default (Rp)</span>
                    </label>
                    <input
                      type="number"
                      value={formData['default_opening_cash'] || '200000'}
                      onChange={(e) => handleChange('default_opening_cash', e.target.value)}
                      placeholder="Contoh: 200000"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Nominal kas laci awal yang disarankan saat kasir membuka shift baru.
                    </p>
                  </div>

                  {/* PPN Rate */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Percent className="w-3 h-3 text-slate-400" />
                      <span>Tarif Pajak PPN (%)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData['ppn_rate'] || '0'}
                      onChange={(e) => handleChange('ppn_rate', e.target.value)}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Persentase pajak PPN (0 jika bebas pajak bagi unit usaha masjid).
                    </p>
                  </div>

                  {/* AI Restock Threshold */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-indigo-500" />
                      <span>Threshold Stok Kritis AI (Unit)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData['ai_stock_threshold'] || '10'}
                      onChange={(e) => handleChange('ai_stock_threshold', e.target.value)}
                      placeholder="10"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Batas jumlah stok barang yang memicu peringatan restock cerdas AI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span>Format Cetak Struk Kasir (Thermal Printer)</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pesan Footer Struk</label>
                    <textarea
                      rows={2}
                      value={formData['receipt_footer'] || 'Terima kasih atas kunjungan Anda.\nBarakallahu fiikum.'}
                      onChange={(e) => handleChange('receipt_footer', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Teks ini akan dicetak di bagian paling bawah struk thermal belanja pelanggan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Infaq Preset */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span>Preset Infaq Pembangunan Masjid</span>
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preset Nilai Infaq Cepat Kasir (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData['default_infaq'] || '1000'}
                    onChange={(e) => handleChange('default_infaq', e.target.value)}
                    className="w-48 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nominal saran tombol infaq cepat saat kasir menyelesaikan transaksi.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="px-6 py-2.5 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* 4. Restore Confirmation Modal */}
      {isConfirmRestoreOpen && selectedRestoreFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-rose-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h4 className="font-bold text-sm">Konfirmasi Pemulihan Database</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmRestoreOpen(false)
                  setSelectedRestoreFile(null)
                  if (restoreFileInputRef.current) restoreFileInputRef.current.value = ''
                }}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
                <p className="font-bold">⚠️ PERINGATAN KRITIS:</p>
                <p>
                  Memulihkan database dari file <span className="font-mono font-bold text-rose-950">"{selectedRestoreFile.name}"</span> ({(selectedRestoreFile.size / 1024).toFixed(1)} KB) akan <strong>MENGGANTIKAN SELURUH DATA</strong> toko saat ini.
                </p>
                <p className="text-[11px] text-rose-700">
                  Pastikan Anda telah mendownload backup database terbaru sebelum melanjutkan.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmRestoreOpen(false)
                    setSelectedRestoreFile(null)
                    if (restoreFileInputRef.current) restoreFileInputRef.current.value = ''
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memulihkan Database...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ya, Pulihkan Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Notification Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toastMsg.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}
    </div>
  )
}
