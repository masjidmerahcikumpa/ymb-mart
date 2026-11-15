import React, { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  User,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Zap,
  LogOut,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { Product } from '@/types/product'
import type { Shift } from '@/types/shift'
import type { POSCartItem } from '@/types/transaction'
import { usePOSStore } from '@/stores/usePOSStore'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  fetchProducts,
  fetchCategories,
  fetchCurrentShift,
  submitCheckout,
  logoutUser,
} from '@/services/api'
import { showConfirmAlert } from '@/utils/alert'
import { playBeep } from '@/utils/audio'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { usePOSShortcuts } from '@/hooks/usePOSShortcuts'

import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartTable } from '@/components/pos/CartTable'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { ReceiptPrint } from '@/components/pos/ReceiptPrint'
import { HoldCartModal } from '@/components/pos/HoldCartModal'
import { MemberModal } from '@/components/pos/MemberModal'
import { ShiftModal } from '@/components/pos/ShiftModal'
import { ETransModal } from '@/components/pos/ETransModal'

export const POSScreen: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auth & Shift State
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [shiftModalMode, setShiftModalMode] = useState<'open' | 'close' | 'cash_in' | 'cash_drop' | null>(null)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isETransOpen, setIsETransOpen] = useState(false)

  const handleLogout = async () => {
    if (currentShift) {
      const wantClose = await showConfirmAlert({
        title: 'Shift Kasir Masih Aktif!',
        text: 'Apakah Anda ingin merekap & menutup shift kasir terlebih dahulu?',
        confirmButtonText: 'Tutup Shift Sekarang',
        cancelButtonText: 'Abaikan',
        icon: 'warning',
      })
      if (wantClose) {
        setShiftModalMode('close')
        return
      }
    }
    const confirmed = await showConfirmAlert({
      title: 'Konfirmasi Logout',
      text: 'Keluar dari sesi terminal kasir Baiturrahman Mart?',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      icon: 'question',
    })
    if (confirmed) {
      await logoutUser()
      logout()
      navigate('/login', { replace: true })
    }
  }

  const handleShiftCloseLogout = async () => {
    await logoutUser()
    logout()
    navigate('/login', { replace: true })
  }

  // POS Store
  const {
    items: cartItems,
    selectedMember,
    infaqAmount,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    loadCart,
    setMember,
    setInfaq,
    getSubtotal,
    getTotalDiscount,
    getGrandTotal,
  } = usePOSStore()

  // Local Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isHoldOpen, setIsHoldOpen] = useState(false)
  const [isMemberOpen, setIsMemberOpen] = useState(false)

  // Completed Transaction State for Receipt Printing
  const [lastTxReceipt, setLastTxReceipt] = useState<{
    txId: string;
    items: POSCartItem[];
    subtotal: number;
    discount: number;
    infaq: number;
    grandTotal: number;
    amountPaid: number;
    changeAmount: number;
    paymentMethod: string;
    customerName?: string;
  } | null>(null)

  // Queries
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['pos-products'],
    queryFn: () => fetchProducts(false),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: fetchCategories,
  })

  const { data: currentShift, isLoading: isLoadingShift, refetch: refetchShift } = useQuery<Shift | null>({
    queryKey: ['pos-shift-current'],
    queryFn: fetchCurrentShift,
  })

  // Auto-prompt cashier to open shift if no shift is currently active
  const [hasAutoPromptedShift, setHasAutoPromptedShift] = useState(false)
  React.useEffect(() => {
    if (!isLoadingShift && currentShift === null && !hasAutoPromptedShift) {
      setHasAutoPromptedShift(true)
      setShiftModalMode('open')
    }
  }, [isLoadingShift, currentShift, hasAutoPromptedShift])

  // Toast Helper
  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur))
    }, 2500)
  }, [])

  // Barcode Scanner Handler
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      if (!currentShift) {
        playBeep(false)
        showToast('Shift kasir belum dibuka! Silakan buka shift kerja kasir terlebih dahulu.', 'error')
        setShiftModalMode('open')
        return
      }

      const match = products.find(
        (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
      )

      if (match) {
        if (match.stock <= 0) {
          playBeep(false)
          showToast(`Stok ${match.name} habis!`, 'error')
          return
        }
        playBeep(true)
        addItem(match, 1)
        showToast(`+1 ${match.name}`)
      } else {
        playBeep(false)
        showToast(`Barcode ${barcode} tidak terdaftar!`, 'error')
      }
    },
    [products, addItem, showToast, currentShift]
  )

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    maxIntervalMs: 50,
  })

  // Guarded Payment Modal opener
  const handleOpenPaymentModal = useCallback(() => {
    if (!currentShift) {
      playBeep(false)
      showToast('Shift kasir belum dibuka! Silakan buka shift kasir terlebih dahulu.', 'error')
      setShiftModalMode('open')
      return
    }
    if (cartItems.length > 0) {
      setIsPaymentOpen(true)
    }
  }, [currentShift, cartItems.length, showToast])

  // Keyboard Shortcuts Handler
  usePOSShortcuts({
    onSearchFocus: () => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    },
    onETransModal: () => setIsETransOpen(true),
    onMemberModal: () => setIsMemberOpen(true),
    onHoldModal: () => setIsHoldOpen(true),
    onPaymentModal: handleOpenPaymentModal,
    onEscape: () => {
      setIsPaymentOpen(false)
      setIsHoldOpen(false)
      setIsMemberOpen(false)
      setIsETransOpen(false)
      setShiftModalMode(null)
      setSearchQuery('')
    },
  })

  // E-Trans addition handler
  const handleAddETransToCart = (item: {
    name: string
    nominal: number
    adminFee: number
    total: number
    category: string
    targetNumber: string
  }) => {
    if (!currentShift) {
      playBeep(false)
      showToast('Shift kasir belum dibuka! Silakan buka shift kasir terlebih dahulu.', 'error')
      setShiftModalMode('open')
      return
    }

    const virtualProduct: Product = {
      id: 990000 + Math.floor(Math.random() * 9999),
      name: item.name,
      barcode: 'ETRANS',
      sku: `ET-${item.category}`,
      price: item.total,
      cost: item.nominal,
      stock: 999,
      unit: 'trx',
      category: 'ETRANS',
    }

    playBeep(true)
    addItem(virtualProduct, 1)
    showToast(`⚡ ${item.name} berhasil ditambahkan!`)
  }

  // Toggle Fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Handle Checkout submission
  const handleSubmitCheckout = async (params: {
    paymentMethod: string;
    amountPaid: number;
    changeAmount: number;
    customerName: string;
  }) => {
    if (!currentShift) {
      playBeep(false)
      showToast('Shift kasir belum dibuka! Silakan buka shift terlebih dahulu.', 'error')
      setShiftModalMode('open')
      return
    }

    const subtotal = getSubtotal()
    const totalDiscount = getTotalDiscount()
    const grandTotal = getGrandTotal()

    const payload = {
      items: cartItems.map((it) => ({
        product_id: it.product.id,
        name: it.product.name,
        qty: it.qty,
        price: it.price,
        discount: it.discount,
        subtotal: it.subtotal,
      })),
      total: subtotal,
      discount: totalDiscount,
      tax: 0,
      grand_total: grandTotal,
      payment: params.paymentMethod,
      amount_paid: params.amountPaid,
      change_amount: params.changeAmount,
      customer_name: params.customerName || selectedMember?.name || '',
      member_id: selectedMember?.member_id || undefined,
      cashier: authUser?.displayName || authUser?.username || 'Kasir Toko',
      shift_id: currentShift.id,
      notes: 'Transaksi Kasir POS React',
    }

    const res = await submitCheckout(payload)

    // Save for receipt
    setLastTxReceipt({
      txId: res.tx_id,
      items: [...cartItems],
      subtotal,
      discount: totalDiscount,
      infaq: infaqAmount,
      grandTotal,
      amountPaid: params.amountPaid,
      changeAmount: params.changeAmount,
      paymentMethod: params.paymentMethod,
      customerName: params.customerName || selectedMember?.name,
    })

    // Invalidate queries so stock updates immediately in grid
    queryClient.invalidateQueries({ queryKey: ['pos-products'] })
    refetchShift()

    setIsPaymentOpen(false)
    clearCart()
    playBeep(true)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans select-none overflow-hidden">
      {/* 1. Header Bar */}
      <header className="h-14 bg-[#8b1538] text-white px-4 flex items-center justify-between shadow-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-lg">
            🕌
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base leading-tight tracking-wide">
              Baiturrahman Mart
            </h1>
            <p className="text-[10px] text-rose-200">Terminal Kasir Toko & Masjid</p>
          </div>
        </div>

        {/* Shift & Cash Controls */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {currentShift ? (
            <div className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                 onClick={() => setShiftModalMode('close')}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">{currentShift.shift_name}</span>
              <span className="text-[10px] text-rose-200 ml-1">Tutup</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShiftModalMode('open')}
              className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-1.5 rounded-full font-bold shadow-xs transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Buka Shift Baru</span>
            </button>
          )}

          {currentShift && (
            <div className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShiftModalMode('cash_in')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors"
                title="Input Kas Masuk"
              >
                <ArrowDownCircle className="w-3 h-3 text-emerald-300" />
                <span>Kas Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => setShiftModalMode('cash_drop')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors"
                title="Tarik Kas ke Brankas"
              >
                <ArrowUpCircle className="w-3 h-3 text-amber-300" />
                <span>Kas Drop</span>
              </button>
            </div>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-rose-800/80">
            <User className="w-3.5 h-3.5 text-rose-200" />
            <span className="font-semibold hidden sm:inline">
              {authUser?.displayName || authUser?.username || 'Kasir'}
            </span>
          </div>

          {/* E-Trans PPOB Button */}
          <button
            type="button"
            onClick={() => setIsETransOpen(true)}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-md text-xs font-extrabold transition-colors shadow-xs"
            title="Layanan Transaksi Digital / PPOB (F3)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>E-Trans (F3)</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-rose-100 transition-colors"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Link to Admin */}
          <Link
            to="/admin"
            className="flex items-center gap-1 bg-white text-[#8b1538] hover:bg-rose-50 px-2.5 py-1 rounded-md text-xs font-bold transition-colors shadow-xs"
          >
            <span>Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 bg-rose-950/40 hover:bg-rose-950 text-rose-100 hover:text-white px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border border-rose-800/60"
            title="Keluar / Tutup Sesi Kasir"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Shift Inactive Warning Banner */}
      {!currentShift && !isLoadingShift && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 flex items-center justify-between shadow-xs z-10 shrink-0 border-b border-amber-600">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0 animate-bounce" />
            <span>Shift kasir belum aktif! Anda wajib membuka shift kerja kasir terlebih dahulu sebelum melayani transaksi customer.</span>
          </div>
          <button
            type="button"
            onClick={() => setShiftModalMode('open')}
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-black text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Buka Shift Sekarang</span>
          </button>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden p-2.5 gap-2.5">
        {/* Left Column: Product Search & Grid */}
        <section className="flex-1 flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Top Search Bar */}
          <div className="p-2.5 border-b border-slate-200 bg-slate-50/70 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode (Arahkan Scanner) atau Ketik Nama / SKU (F2)..."
                className="w-full pl-9 pr-8 py-2 bg-white rounded-lg border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8b1538] focus:border-transparent placeholder:text-slate-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200 font-mono">
              <span>Shortcuts: F2 (Cari) • F3 (E-Trans) • F4 (Member) • F8 (Parkir) • F9 (Bayar)</span>
            </div>
          </div>

          {/* Product Grid */}
          <ProductGrid
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onAddProduct={(p) => {
              if (!currentShift) {
                playBeep(false)
                showToast('Shift kasir belum dibuka! Silakan buka shift terlebih dahulu.', 'error')
                setShiftModalMode('open')
                return
              }
              playBeep(true)
              addItem(p, 1)
              showToast(`+1 ${p.name}`)
            }}
            isLoading={isLoadingProducts}
          />
        </section>

        {/* Right Column: Active Cart & Totalizer */}
        <section className="w-80 sm:w-96 flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden shrink-0">
          <CartTable
            items={cartItems}
            selectedMember={selectedMember}
            infaqAmount={infaqAmount}
            subtotal={getSubtotal()}
            totalDiscount={getTotalDiscount()}
            grandTotal={getGrandTotal()}
            onUpdateQty={updateQty}
            onRemoveItem={removeItem}
            onClearCart={clearCart}
            onOpenPayment={handleOpenPaymentModal}
            isShiftOpen={Boolean(currentShift)}
            onOpenHoldModal={() => setIsHoldOpen(true)}
            onOpenMemberModal={() => setIsMemberOpen(true)}
            onToggleInfaq={setInfaq}
            onRemoveMember={() => setMember(null)}
          />
        </section>
      </main>

      {/* 3. Floating Notification Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-4 left-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-150 ${
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

      {/* 4. Payment Tender Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        grandTotal={getGrandTotal()}
        onClose={() => setIsPaymentOpen(false)}
        onSubmitPayment={handleSubmitCheckout}
      />

      {/* 5. Printable Receipt Modal */}
      {lastTxReceipt && (
        <ReceiptPrint
          isOpen={Boolean(lastTxReceipt)}
          txId={lastTxReceipt.txId}
          items={lastTxReceipt.items}
          subtotal={lastTxReceipt.subtotal}
          discount={lastTxReceipt.discount}
          infaq={lastTxReceipt.infaq}
          grandTotal={lastTxReceipt.grandTotal}
          amountPaid={lastTxReceipt.amountPaid}
          changeAmount={lastTxReceipt.changeAmount}
          paymentMethod={lastTxReceipt.paymentMethod}
          cashierName={authUser?.displayName || 'Kasir'}
          customerName={lastTxReceipt.customerName}
          member={selectedMember}
          onNewTransaction={() => setLastTxReceipt(null)}
        />
      )}

      {/* 6. Hold / Parked Cart Modal */}
      <HoldCartModal
        isOpen={isHoldOpen}
        currentCartItems={cartItems}
        onClose={() => setIsHoldOpen(false)}
        onRecallCart={(recalledItems) => {
          loadCart(recalledItems)
          showToast('Keranjang tertunda dipulihkan!')
        }}
        onHoldSuccess={() => {
          clearCart()
          showToast('Keranjang berhasil diparkir!')
        }}
      />

      {/* 7. Member Modal */}
      <MemberModal
        isOpen={isMemberOpen}
        onClose={() => setIsMemberOpen(false)}
        onSelectMember={(m) => {
          setMember(m)
          showToast(`Member: ${m.name} diterapkan`)
        }}
      />

      {/* E-Trans PPOB Digital Modal */}
      <ETransModal
        isOpen={isETransOpen}
        onClose={() => setIsETransOpen(false)}
        onAddETrans={handleAddETransToCart}
      />

      {/* 8. Shift Management Modal */}
      {shiftModalMode && (
        <ShiftModal
          isOpen={Boolean(shiftModalMode)}
          mode={shiftModalMode}
          currentShift={currentShift || null}
          onClose={() => setShiftModalMode(null)}
          onShiftUpdated={() => {
            refetchShift()
            showToast('Data shift kasir berhasil diperbarui')
          }}
          onLogout={handleShiftCloseLogout}
        />
      )}
    </div>
  )
}
