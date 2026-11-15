import React, { useState, useEffect, useRef, useMemo } from 'react'

interface CustomerItem {
  name: string
  price: number
  qty: number
  subtotal?: number
}

interface QRISData {
  total: number
  qr_url: string
  store_name: string
}

interface PaymentSummary {
  grand_total: number
  payment: string
  amount_paid?: number
  change?: number
}

interface PromoCard {
  emoji?: string
  name: string
  price: number
  old_price?: number | null
}

export const CustomerScreen: React.FC = () => {
  const [items, setItems] = useState<CustomerItem[]>([])
  const [grandTotal, setGrandTotal] = useState<number>(0)
  const [cashierName, setCashierName] = useState<string>('KASIR STANDBY')
  const [memberName, setMemberName] = useState<string>('-')
  const [qrisData, setQrisData] = useState<QRISData | null>(null)
  const [paymentDone, setPaymentDone] = useState<PaymentSummary | null>(null)
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour12: false })
  )

  // Store & Ads Settings from Backend
  const [storeName, setStoreName] = useState<string>('Baiturrahman Mart')
  const [adTitle, setAdTitle] = useState<string>('Belanja Berkah & Hemat Setiap Hari')
  const [adDesc, setAdDesc] = useState<string>(
    'Dapatkan aneka produk kebutuhan harian dengan harga terjangkau dan kualitas terjamin di Masjid Jami\' Baiturrahman.'
  )
  const [adMarquee, setAdMarquee] = useState<string>(
    '🎉 Selamat datang di Baiturrahman Mart! Belanja berkah & nyaman setiap hari 🎉'
  )
  const [adImages, setAdImages] = useState<string[]>([])
  const [adCards, setAdCards] = useState<PromoCard[]>([])
  const [activeSlide, setActiveSlide] = useState<number>(0)

  const itemsListEndRef = useRef<HTMLDivElement>(null)

  // 1. Live 24H Clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour12: false }))
    }, 1000)
    return () => clearInterval(clockTimer)
  }, [])

  // 2. Auto-scroll receipt table on items change
  useEffect(() => {
    itemsListEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  // 3. Initial Data Fetch (Settings + Active Cashier)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings?include_ads=1')
        if (!res.ok) return
        const s = await res.json()
        if (s.store_name) setStoreName(s.store_name)
        if (s.ad_title) setAdTitle(s.ad_title)
        if (s.ad_desc) setAdDesc(s.ad_desc)
        if (s.ad_marquee) setAdMarquee(s.ad_marquee)
        if (s.ad_images) {
          try {
            const parsedImgs = JSON.parse(s.ad_images)
            if (Array.isArray(parsedImgs)) setAdImages(parsedImgs)
          } catch {}
        }
        if (s.ad_cards) {
          try {
            const parsedCards = JSON.parse(s.ad_cards)
            if (Array.isArray(parsedCards)) setAdCards(parsedCards)
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to load customer settings:', e)
      }
    }

    const loadActiveCashier = async () => {
      try {
        const res = await fetch('/api/shifts/active')
        if (!res.ok) return
        const shifts = await res.json()
        if (shifts && shifts.length > 0) {
          const s = shifts[0]
          const name = s.cashier_name || s.cashier || ''
          if (name) setCashierName(name.toUpperCase())
        }
      } catch (e) {
        console.warn('Failed to load active cashier:', e)
      }
    }

    loadSettings()
    loadActiveCashier()
  }, [])

  // 4. Build Carousel Slides List
  const slides = useMemo(() => {
    const list: Array<{ type: 'fallback' | 'image' | 'card'; data?: any }> = []

    // Always include the main branded banner
    list.push({ type: 'fallback' })

    // Include custom uploaded promo images
    adImages.forEach((img) => {
      list.push({ type: 'image', data: img })
    })

    // Include promo product cards
    adCards.forEach((card) => {
      list.push({ type: 'card', data: card })
    })

    return list
  }, [adImages, adCards])

  // Carousel Auto-rotation timer (4.5s)
  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [slides.length])

  // 5. Dual Communication: BroadcastChannel + WebSocket
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('ymb_pos_channel')
      channel.onmessage = (event) => {
        handleIncomingMessage(event.data)
      }
    }

    let ws: WebSocket | null = null
    let reconnectTimeout: any = null

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host || 'localhost:8070'
      const wsUrl = `${protocol}//${host}/ws`

      try {
        ws = new WebSocket(wsUrl)
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            handleIncomingMessage(data)
          } catch {}
        }
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 3000)
        }
        ws.onerror = () => {}
      } catch {
        reconnectTimeout = setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    return () => {
      if (channel) channel.close()
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [grandTotal])

  const handleIncomingMessage = (msg: { type: string; data?: any }) => {
    if (!msg) return
    const { type, data } = msg

    switch (type) {
      case 'cart_update':
        setPaymentDone(null)
        setQrisData(null)
        if (data.items) {
          setItems(data.items)
        }
        if (data.total !== undefined) {
          setGrandTotal(data.total)
        }
        if (data.cashier) {
          setCashierName(data.cashier.toUpperCase())
        }
        if (data.member) {
          setMemberName(data.member)
        }
        break

      case 'show_qris':
        setQrisData({
          total: data.total || grandTotal,
          qr_url: data.qr_url || '/logo.png',
          store_name: data.store_name || storeName,
        })
        break

      case 'hide_qris':
        setQrisData(null)
        break

      case 'new_transaction':
        setQrisData(null)
        setPaymentDone({
          grand_total: data.grand_total || grandTotal,
          payment: data.payment || 'CASH',
          amount_paid: data.amount_paid,
          change: data.change,
        })
        if (data.items) {
          setItems(data.items)
        }
        if (data.cashier) {
          setCashierName(data.cashier.toUpperCase())
        }
        if (data.member) {
          setMemberName(data.member)
        }
        break

      case 'reset_display':
        setItems([])
        setGrandTotal(0)
        setPaymentDone(null)
        setQrisData(null)
        setMemberName('-')
        if (data && data.cashier) {
          setCashierName(data.cashier.toUpperCase())
        }
        break

      case 'shift_open':
        if (data && data.cashier) {
          setCashierName(data.cashier.toUpperCase())
        }
        break

      case 'shift_close':
        setCashierName('KASIR STANDBY')
        break

      default:
        break
    }
  }

  // Format Store Brand Name Header
  const renderedStoreName = useMemo(() => {
    const parts = (storeName || 'Baiturrahman Mart').split(' ')
    if (parts.length > 1) {
      const last = parts.pop()
      return (
        <>
          {parts.join(' ')} <span style={{ color: '#d32f2f' }}>{last}</span>
        </>
      )
    }
    return <span>{storeName}</span>
  }, [storeName])

  return (
    <div className="customer-root flex w-full h-screen overflow-hidden bg-[#f1f5f9] text-[#0f172a] select-none font-sans">
      <style>{`
        :root {
          --primary-red: #d32f2f;
          --primary-red-dark: #b71c1c;
          --alfa-yellow: #facc15;
          --alfa-yellow-dark: #eab308;
          --border-light: #e2e8f0;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 16px rgba(212, 175, 55, 0.25); }
          50% { box-shadow: 0 0 32px rgba(212, 175, 55, 0.5); }
        }

        @keyframes marqueeAnim {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .slide-in { animation: slideIn 0.2s ease-out; }
        .pulse-glow { animation: pulseGlow 2.5s infinite; }
        .marquee-text {
          display: inline-block;
          white-space: nowrap;
          animation: marqueeAnim 22s linear infinite;
        }
        .marquee-text:hover {
          animation-play-state: paused;
        }

        .customer-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .customer-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        @media (max-width: 1100px) {
          .left { width: 52% !important; }
          .right { width: 48% !important; }
        }

        @media (max-width: 800px) {
          .customer-root { flex-direction: column !important; height: auto !important; overflow-y: auto !important; }
          .left { width: 100% !important; min-height: 440px !important; }
          .right { width: 100% !important; min-height: 520px !important; border-left: none !important; }
        }
      `}</style>

      {/* ========================================================
          LEFT COLUMN: IKLAN & PROMOSI (58%)
          ======================================================== */}
      <div className="left w-[58%] flex flex-col bg-[#f8fafc] border-r-[1.5px] border-[#e2e8f0] relative overflow-hidden">
        {/* Carousel Container */}
        <div className="flex-1 flex flex-col p-[20px_24px_0] relative z-[1]">
          <div className="flex-1 border-[1.5px] border-[#e2e8f0] rounded-[18px] overflow-hidden bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] relative flex items-center justify-center">
            {slides.length > 0 && slides[activeSlide]?.type === 'image' && (
              <img
                src={slides[activeSlide].data}
                alt="Promo Banner"
                className="w-full h-full object-contain animate-[fadeIn_0.4s_ease-out]"
              />
            )}

            {slides.length > 0 && slides[activeSlide]?.type === 'card' && (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-10 bg-gradient-to-b from-white to-[#f8fafc] animate-[fadeIn_0.4s_ease-out]">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fef2f2] border border-[#fecaca] text-[11.5px] font-extrabold tracking-[0.8px] uppercase text-[#d32f2f] mb-4">
                  <span>⚡ PRODUK PROMO HARI INI</span>
                </div>
                <div className="text-7xl mb-3 drop-shadow-sm">
                  {slides[activeSlide].data.emoji || '🎁'}
                </div>
                <h2 className="text-3xl font-black text-[#0f172a] tracking-tight mb-2 max-w-[540px]">
                  {slides[activeSlide].data.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-black text-[#d32f2f]">
                    Rp {Number(slides[activeSlide].data.price).toLocaleString('id-ID')}
                  </span>
                  {slides[activeSlide].data.old_price && (
                    <span className="text-lg font-bold text-slate-400 line-through">
                      Rp {Number(slides[activeSlide].data.old_price).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-4 max-w-md font-medium">
                  Stok tersedia di Baiturrahman Mart. Belanja berkah harga ramah!
                </p>
              </div>
            )}

            {slides.length > 0 && slides[activeSlide]?.type === 'fallback' && (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-10 bg-gradient-to-b from-white to-[#f8fafc] animate-[fadeIn_0.4s_ease-out]">
                <div className="mb-4">
                  <img
                    src="/logo.png"
                    alt="Logo YMB"
                    className="w-24 h-24 object-contain bg-white rounded-full p-1 shadow-[0_6px_18px_rgba(0,0,0,0.08)] border-2 border-[#d4af37]"
                  />
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fef2f2] border border-[#fecaca] text-[11.5px] font-extrabold tracking-[0.8px] uppercase text-[#d32f2f] mb-4">
                  <span>✨ Promo Pilihan Baiturrahman Mart</span>
                </div>
                <h2 className="text-[28px] font-black text-[#0f172a] tracking-tight mb-2.5 max-w-[580px] leading-[1.25]">
                  {adTitle}
                </h2>
                <p className="text-[14.5px] text-[#64748b] max-w-[500px] leading-relaxed">
                  {adDesc}
                </p>

                {/* Mosque Trust Badges */}
                <div className="flex items-center gap-3 mt-6">
                  <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    🕌 Infaq & Amal Jamaah
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    ✨ 100% Berkah & Halal
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                    🏷️ Harga Terjangkau
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Carousel Dot Indicators */}
          {slides.length > 1 && (
            <div className="flex justify-center items-center gap-2 py-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    i === activeSlide ? 'w-6 bg-[#d32f2f]' : 'w-2 bg-[#cbd5e1] hover:bg-slate-400'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Marquee Running Ticker */}
        <div className="flex items-center gap-3 border border-[#e2e8f0] rounded-xl p-[9px_16px] m-[12px_24px_14px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden relative z-[1]">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#d32f2f] text-white text-[11px] font-black uppercase tracking-[0.8px] whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span>INFO PROMO</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <p className="text-[#1e293b] text-[13.5px] font-bold tracking-[0.2px] marquee-text">
              {adMarquee}
            </p>
          </div>
        </div>

        {/* Left Footer */}
        <div className="relative z-[1] flex items-center justify-between p-[10px_24px] border-t border-[#e2e8f0] text-[11.5px] text-[#64748b] bg-[#f8fafc]">
          <span>Masjid Jami' Baiturrahman &bull; Baiturrahman Mart</span>
          <span>Customer Display v2.3</span>
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: LIVE RECEIPT ALA ALFAMART (42%)
          ======================================================== */}
      <div className="right w-[42%] flex flex-col bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.04)] relative">
        {/* Top Header */}
        <div className="p-[14px_20px] flex items-center justify-between border-b-2 border-[#e2e8f0] gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Logo YMB"
              className="w-[52px] h-[52px] object-contain bg-white rounded-full p-0.5 border-2 border-[#d4af37] shrink-0"
            />
            <div>
              <h1 className="text-[20px] font-black text-[#0f172a] tracking-tight leading-tight">
                {renderedStoreName}
              </h1>
              <div className="text-[11.5px] text-[#64748b] font-semibold mt-0.5 whitespace-nowrap">
                Masjid Jami' Baiturrahman
              </div>
            </div>
          </div>

          {/* Alfamart Red Cashier Box */}
          <div className="bg-gradient-to-br from-[#d32f2f] to-[#b71c1c] text-white rounded-[10px] p-[8px_16px] text-right shadow-[0_4px_12px_rgba(211,47,47,0.25)] shrink-0 min-w-[170px]">
            <div className="text-[13.5px] font-black tracking-[0.2px] uppercase text-white truncate max-w-[200px]">
              {cashierName}
            </div>
            <div className="text-[10.5px] font-semibold text-[#fef08a] mt-0.5">
              Senang melayani anda
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="bg-[#f8fafc] grid grid-cols-[36px_1fr_65px_120px] p-[10px_16px] text-[12px] font-extrabold text-[#475569] uppercase tracking-[0.6px] border-b-2 border-[#cbd5e1]">
          <div>NO</div>
          <div>DESCRIPTION</div>
          <div className="text-center">QTY</div>
          <div className="text-right">PRICE</div>
        </div>

        {/* Items List (Scrollable & Enlarged) */}
        <div className="flex-1 overflow-y-auto p-[8px_12px] bg-white customer-scroll">
          {items.length === 0 ? (
            <div className="text-center p-[70px_20px] text-[#94a3b8]">
              <p className="text-[42px] mb-2.5 opacity-60">🛒</p>
              <p className="text-[15px] font-bold text-[#64748b]">
                Menunggu scan barang kasir...
              </p>
              <p className="text-[12.5px] text-[#94a3b8] mt-1">
                Daftar belanjaan Anda akan tampil otomatis di sini
              </p>
            </div>
          ) : (
            items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[36px_1fr_65px_120px] items-center p-[12px_6px] border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors slide-in"
              >
                <div className="text-[13px] font-extrabold text-[#94a3b8] text-center">
                  {i + 1}
                </div>
                <div className="pr-2">
                  <div className="text-[#0f172a] font-bold text-[16px] leading-snug">
                    {item.name}
                  </div>
                  <div className="text-[#64748b] text-[12px] mt-0.5 tabular-nums">
                    @ Rp {Number(item.price).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-[#1e293b] text-[16px] font-extrabold text-center tabular-nums">
                  {item.qty}
                </div>
                <div className="text-[#0f172a] font-black tabular-nums text-[17px] text-right">
                  Rp {(item.price * item.qty).toLocaleString('id-ID')}
                </div>
              </div>
            ))
          )}
          <div ref={itemsListEndRef} />
        </div>

        {/* Bottom Panel */}
        <div className="bg-white border-t-2 border-[#e2e8f0] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          {/* Big Yellow Alfamart Total Box */}
          <div className="bg-[#facc15] p-[14px_22px] flex justify-between items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <div className="text-[24px] font-black text-[#0f172a] uppercase tracking-tight">
              Total
            </div>
            <div className="text-[46px] font-black text-[#0f172a] tabular-nums tracking-tight">
              {grandTotal > 0 ? grandTotal.toLocaleString('id-ID') : '0'}
            </div>
          </div>

          {/* Member Row */}
          <div className="p-[8px_22px] bg-[#fefce8] border-b border-[#fef08a] text-[13px] font-bold text-[#854d0e] flex justify-between items-center">
            <span>Member:</span>
            <b className="font-extrabold">{memberName}</b>
          </div>

          {/* Payment Details (Cash Paid & Change) */}
          {paymentDone && paymentDone.payment === 'CASH' && paymentDone.amount_paid !== undefined && (
            <div className="p-[12px_22px] bg-[#f8fafc] border-b border-[#e2e8f0] slide-in">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[14px] font-bold text-[#475569]">Tunai Diterima:</span>
                <span className="text-[18px] font-extrabold text-[#0f172a] tabular-nums">
                  Rp {Number(paymentDone.amount_paid).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[17px] font-black text-[#15803d] uppercase">Kembalian:</span>
                <span className="text-[34px] font-black text-[#16a34a] tabular-nums">
                  Rp {Number(paymentDone.change || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {/* Alfamart Customer Info Footer */}
          <div className="p-[12px_22px] bg-[#f1f5f9] text-[#475569] text-[12px] leading-snug flex justify-between items-center">
            <div className="text-[11.5px] pr-3">
              <div>
                <b className="text-[#0f172a]">Informasi Customer:</b>
              </div>
              <div>Minta dan periksa kembali struk belanja Anda. Terima kasih telah berbelanja di Baiturrahman Mart.</div>
            </div>
            <div className="text-[13px] font-extrabold text-[#0f172a] tabular-nums bg-white p-[4px_10px] rounded-lg border border-[#cbd5e1] shrink-0 font-mono">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          FULLSCREEN CUSTOMER QRIS SCAN OVERLAY
          ======================================================== */}
      {qrisData && (
        <div className="fixed inset-0 bg-[#0f172a]/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[24px] p-[32px_36px] max-w-[460px] w-[92%] shadow-[0_25px_60px_rgba(0,0,0,0.3)] border-2 border-[#d4af37] slide-in">
            <div className="text-center mb-3">
              <img
                src="/logo.png"
                alt="Logo YMB"
                className="w-16 h-16 object-contain bg-white rounded-full p-1 mx-auto shadow-[0_4px_14px_rgba(0,0,0,0.1)] border-2 border-[#d4af37]"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[#fef2f2] p-[5px_14px] rounded-full border border-[#fecaca] mb-2.5">
              <span className="text-[15px]">⚡</span>
              <span className="text-[12.5px] font-extrabold text-[#d32f2f] uppercase tracking-[0.5px]">
                Pembayaran QRIS
              </span>
            </div>
            <h2 className="text-[18px] font-extrabold text-[#0f172a] mb-1">
              {qrisData.store_name}
            </h2>
            <p className="text-[12px] text-[#64748b] mb-4">
              Scan kode QR di bawah ini dengan aplikasi mobile banking atau e-wallet Anda
            </p>

            {/* Nominal Tagihan */}
            <div className="bg-[#f8fafc] border-2 border-dashed border-[#cbd5e1] rounded-[14px] p-[10px_14px] mb-4">
              <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-[1px]">
                Total Tagihan Belanja
              </div>
              <div className="text-[36px] font-black text-[#d32f2f] tabular-nums mt-0.5">
                Rp {Number(qrisData.total).toLocaleString('id-ID')}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-2.5 border-2 border-[#e2e8f0] rounded-[16px] inline-block shadow-[0_4px_14px_rgba(0,0,0,0.06)] mb-4">
              <img
                src={qrisData.qr_url}
                alt="Scan QRIS"
                className="w-[240px] h-[240px] object-contain block rounded-lg"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-[#16a34a] font-bold text-[13px]">
              <span className="w-2.5 h-2.5 bg-[#22c55e] rounded-full inline-block pulse-glow" />
              <span>Menunggu konfirmasi pembayaran kasir...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
