import React, { useState } from 'react'
import { X, Zap, Phone, Lightbulb, Wallet, Plus } from 'lucide-react'
import { formatRupiah } from '@/utils/currency'

interface ETransModalProps {
  isOpen: boolean
  onClose: () => void
  onAddETrans: (item: {
    name: string
    nominal: number
    adminFee: number
    total: number
    category: string
    targetNumber: string
  }) => void
}

type ETransTab = 'pulsa' | 'pln' | 'wallet'

interface DenomItem {
  id: string
  name: string
  provider: string
  amount: number
  desc: string
}

const PULSA_CATALOG: DenomItem[] = [
  { id: 'tsel_5k', provider: 'Telkomsel', name: 'Pulsa Telkomsel 5.000', amount: 5000, desc: 'Masa aktif +7 hari' },
  { id: 'tsel_10k', provider: 'Telkomsel', name: 'Pulsa Telkomsel 10.000', amount: 10000, desc: 'Masa aktif +15 hari' },
  { id: 'tsel_25k', provider: 'Telkomsel', name: 'Pulsa Telkomsel 25.000', amount: 25000, desc: 'Masa aktif +30 hari' },
  { id: 'tsel_50k', provider: 'Telkomsel', name: 'Pulsa Telkomsel 50.000', amount: 50000, desc: 'Masa aktif +45 hari' },
  { id: 'tsel_100k', provider: 'Telkomsel', name: 'Pulsa Telkomsel 100.000', amount: 100000, desc: 'Masa aktif +60 hari' },
  { id: 'isat_10k', provider: 'Indosat', name: 'Pulsa Indosat 10.000', amount: 10000, desc: 'Masa aktif +15 hari' },
  { id: 'isat_25k', provider: 'Indosat', name: 'Pulsa Indosat 25.000', amount: 25000, desc: 'Masa aktif +30 hari' },
  { id: 'isat_50k', provider: 'Indosat', name: 'Pulsa Indosat 50.000', amount: 50000, desc: 'Masa aktif +45 hari' },
  { id: 'xl_10k', provider: 'XL / Axis', name: 'Pulsa XL / Axis 10.000', amount: 10000, desc: 'Masa aktif +15 hari' },
  { id: 'xl_25k', provider: 'XL / Axis', name: 'Pulsa XL / Axis 25.000', amount: 25000, desc: 'Masa aktif +30 hari' },
  { id: 'xl_50k', provider: 'XL / Axis', name: 'Pulsa XL / Axis 50.000', amount: 50000, desc: 'Masa aktif +45 hari' },
]

const PLN_CATALOG: DenomItem[] = [
  { id: 'pln_20k', provider: 'PLN', name: 'Token Listrik PLN 20.000', amount: 20000, desc: 'Estimasi ~13.5 kWh' },
  { id: 'pln_50k', provider: 'PLN', name: 'Token Listrik PLN 50.000', amount: 50000, desc: 'Estimasi ~33.8 kWh' },
  { id: 'pln_100k', provider: 'PLN', name: 'Token Listrik PLN 100.000', amount: 100000, desc: 'Estimasi ~67.5 kWh' },
  { id: 'pln_200k', provider: 'PLN', name: 'Token Listrik PLN 200.000', amount: 200000, desc: 'Estimasi ~135 kWh' },
  { id: 'pln_500k', provider: 'PLN', name: 'Token Listrik PLN 500.000', amount: 500000, desc: 'Estimasi ~338 kWh' },
]

const WALLET_CATALOG: DenomItem[] = [
  { id: 'gopay_10k', provider: 'GoPay', name: 'Top Up GoPay 10.000', amount: 10000, desc: 'Saldo GoPay Customer' },
  { id: 'gopay_20k', provider: 'GoPay', name: 'Top Up GoPay 20.000', amount: 20000, desc: 'Saldo GoPay Customer' },
  { id: 'gopay_50k', provider: 'GoPay', name: 'Top Up GoPay 50.000', amount: 50000, desc: 'Saldo GoPay Customer' },
  { id: 'gopay_100k', provider: 'GoPay', name: 'Top Up GoPay 100.000', amount: 100000, desc: 'Saldo GoPay Customer' },
  { id: 'ovo_20k', provider: 'OVO', name: 'Top Up OVO 20.000', amount: 20000, desc: 'Saldo OVO Cash' },
  { id: 'ovo_50k', provider: 'OVO', name: 'Top Up OVO 50.000', amount: 50000, desc: 'Saldo OVO Cash' },
  { id: 'dana_20k', provider: 'DANA', name: 'Top Up DANA 20.000', amount: 20000, desc: 'Saldo Dompet DANA' },
  { id: 'dana_50k', provider: 'DANA', name: 'Top Up DANA 50.000', amount: 50000, desc: 'Saldo Dompet DANA' },
  { id: 'spay_20k', provider: 'ShopeePay', name: 'Top Up ShopeePay 20.000', amount: 20000, desc: 'Saldo ShopeePay' },
  { id: 'spay_50k', provider: 'ShopeePay', name: 'Top Up ShopeePay 50.000', amount: 50000, desc: 'Saldo ShopeePay' },
]

export const ETransModal: React.FC<ETransModalProps> = ({ isOpen, onClose, onAddETrans }) => {
  const [activeTab, setActiveTab] = useState<ETransTab>('pulsa')
  const [targetNumber, setTargetNumber] = useState('')
  const [selectedDenom, setSelectedDenom] = useState<DenomItem | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const adminFee = 2500

  const handleTabChange = (tab: ETransTab) => {
    setActiveTab(tab)
    setSelectedDenom(null)
    setErrorMsg('')
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDenom) {
      setErrorMsg('Pilih nominal produk digital terlebih dahulu.')
      return
    }
    const cleanNum = targetNumber.trim()
    if (!cleanNum) {
      setErrorMsg(
        activeTab === 'pln'
          ? 'Nomor Meter / ID Pelanggan PLN wajib diisi!'
          : 'Nomor HP tujuan wajib diisi!'
      )
      return
    }

    if (activeTab === 'pln' && cleanNum.length < 10) {
      setErrorMsg('Nomor Meteran PLN minimal 10-12 digit!')
      return
    }

    const total = selectedDenom.amount + adminFee
    const fullItemName = `E-Trans ${selectedDenom.name} (${cleanNum})`

    onAddETrans({
      name: fullItemName,
      nominal: selectedDenom.amount,
      adminFee,
      total,
      category: activeTab.toUpperCase(),
      targetNumber: cleanNum,
    })

    setTargetNumber('')
    setSelectedDenom(null)
    onClose()
  }

  const catalog =
    activeTab === 'pulsa' ? PULSA_CATALOG : activeTab === 'pln' ? PLN_CATALOG : WALLET_CATALOG

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-extrabold text-sm">Layanan E-Trans & PPOB Kasir</h3>
              <p className="text-[11px] text-white/80">Pulsa, Paket Data, Token Listrik & Top-Up E-Wallet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('pulsa')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              activeTab === 'pulsa'
                ? 'border-[#8b1538] text-[#8b1538] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Pulsa & Data</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pln')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              activeTab === 'pln'
                ? 'border-[#8b1538] text-[#8b1538] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Token Listrik PLN</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('wallet')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              activeTab === 'wallet'
                ? 'border-[#8b1538] text-[#8b1538] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Top-Up E-Wallet</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAdd} className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Target Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {activeTab === 'pln'
                ? 'Nomor Meter / ID Pelanggan PLN (11-12 Digit) *'
                : 'Nomor HP Pelanggan / WhatsApp *'}
            </label>
            <input
              type="text"
              value={targetNumber}
              onChange={(e) => {
                setTargetNumber(e.target.value)
                setErrorMsg('')
              }}
              placeholder={
                activeTab === 'pln'
                  ? 'Contoh: 14022839182 / 32018829102'
                  : 'Contoh: 081288991122'
              }
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#8b1538] focus:border-[#8b1538]"
              autoFocus
              required
            />
          </div>

          {/* Denomination Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Nominal {activeTab === 'pln' ? 'Token' : activeTab === 'pulsa' ? 'Pulsa' : 'Top-Up'} *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {catalog.map((item) => {
                const isSelected = selectedDenom?.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDenom(item)
                      setErrorMsg('')
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#8b1538] bg-rose-50/50 ring-2 ring-[#8b1538]/30 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.provider}
                      </span>
                    </div>
                    <p className="font-extrabold text-xs text-slate-900 mt-1">{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    <div className="mt-2 pt-1 border-t border-slate-100 font-bold text-xs text-[#8b1538]">
                      {formatRupiah(item.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pricing Summary */}
          {selectedDenom && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Harga Produk:</span>
                <span className="font-bold">{formatRupiah(selectedDenom.amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Admin Fee Toko:</span>
                <span className="font-bold text-emerald-700">+{formatRupiah(adminFee)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                <span>Total Ditagihkan ke Pelanggan:</span>
                <span className="text-[#8b1538]">{formatRupiah(selectedDenom.amount + adminFee)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!selectedDenom}
              className="px-5 py-2.5 bg-[#8b1538] hover:bg-[#6b0f2a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Masukkan ke Keranjang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

