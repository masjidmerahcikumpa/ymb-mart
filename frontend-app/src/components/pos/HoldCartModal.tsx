import React, { useState, useEffect } from 'react'
import { X, PauseCircle, Play, Trash2, Clock, User, AlertCircle, Loader2 } from 'lucide-react'
import type { HoldTransaction, POSCartItem } from '@/types/transaction'
import { fetchHolds, saveHold, deleteHold } from '@/services/api'
import { formatRupiah } from '@/utils/currency'

interface HoldCartModalProps {
  isOpen: boolean;
  currentCartItems: POSCartItem[];
  onClose: () => void;
  onRecallCart: (items: POSCartItem[]) => void;
  onHoldSuccess: () => void;
}

export const HoldCartModal: React.FC<HoldCartModalProps> = ({
  isOpen,
  currentCartItems,
  onClose,
  onRecallCart,
  onHoldSuccess,
}) => {
  const [holds, setHolds] = useState<HoldTransaction[]>([])
  const [customerName, setCustomerName] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isHolding, setIsHolding] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const loadHolds = async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchHolds()
      setHolds(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat transaksi tertunda'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadHolds()
      setCustomerName('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleParkCurrentCart = async () => {
    if (currentCartItems.length === 0) return
    setIsHolding(true)
    setErrorMsg('')
    try {
      await saveHold(JSON.stringify(currentCartItems), customerName.trim() || 'Pelanggan Umum')
      await loadHolds()
      onHoldSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memarkir transaksi'
      setErrorMsg(msg)
    } finally {
      setIsHolding(false)
    }
  }

  const handleRecall = async (hold: HoldTransaction) => {
    try {
      const items: POSCartItem[] = JSON.parse(hold.items_json)
      await deleteHold(hold.id)
      onRecallCart(items)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memanggil kembali transaksi'
      setErrorMsg(msg)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteHold(id)
      setHolds((prev) => prev.filter((h) => h.id !== id))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus transaksi tertunda'
      setErrorMsg(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm">Parkir / Tahan Transaksi (Hold)</h3>
              <p className="text-xs text-slate-400">Simpan keranjang pelanggan untuk melayani antrean lain</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Park Current Cart Section */}
          {currentCartItems.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-amber-900 block">
                Parkirkan Keranjang Aktif ({currentCartItems.reduce((s, it) => s + it.qty, 0)} Barang)
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama / Ciri Pelanggan (Contoh: Ibu Baju Biru)"
                  className="flex-1 text-xs px-3 py-2 bg-white rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleParkCurrentCart}
                  disabled={isHolding}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isHolding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PauseCircle className="w-3.5 h-3.5" />}
                  <span>Parkirkan</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Held Carts */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Daftar Transaksi Tertunda</span>
              <span className="text-[11px] font-normal text-slate-400">{holds.length} transaksi</span>
            </h4>

            {isLoading ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs">Memuat daftar hold...</p>
              </div>
            ) : holds.length === 0 ? (
              <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1 stroke-1" />
                <p className="text-xs font-medium text-slate-500">Tidak ada transaksi yang sedang ditahan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {holds.map((h) => {
                  let itemsCount = 0
                  let totalEstimate = 0
                  try {
                    const parsed: POSCartItem[] = JSON.parse(h.items_json)
                    itemsCount = parsed.reduce((s, it) => s + it.qty, 0)
                    totalEstimate = parsed.reduce((s, it) => s + it.subtotal, 0)
                  } catch {
                    // ignore
                  }

                  return (
                    <div
                      key={h.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-bold text-xs text-slate-800">{h.customer_name || 'Pelanggan'}</span>
                          <span className="text-[10px] text-slate-400">({h.hold_id})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {itemsCount} barang • <span className="font-bold text-[#8b1538]">{formatRupiah(totalEstimate)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRecall(h)}
                          className="px-3 py-1.5 bg-[#8b1538] hover:bg-[#6b0f2a] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          <span>Lanjutkan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
          >
            Tutup (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}

