import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSettings, updateSettings, fetchProducts } from '@/services/api'
import { formatRupiah } from '@/utils/currency'
import { showConfirmAlert } from '@/utils/alert'
import {
  Tv,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
  Smile,
  X,
  Link as LinkIcon,
} from 'lucide-react'

export interface PromoCardItem {
  emoji?: string
  name: string
  price: number
  original_price?: number
  promo_tag?: string
}

export const CustomerAdManager: React.FC = () => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Query Settings with Ads
  const { data: settings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings-ads'],
    queryFn: () => fetchSettings(true),
  })

  // Query Products for Auto-complete
  const { data: products = [] } = useQuery({
    queryKey: ['pos-products-mini'],
    queryFn: () => fetchProducts(false),
  })

  // Form States
  const [adTitle, setAdTitle] = useState('✨ Promo Pilihan Baiturrahman Mart')
  const [adDesc, setAdDesc] = useState('Belanja berkah & hemat setiap hari di Toko Masjid Baiturrahman')
  const [adMarquee, setAdMarquee] = useState('🎉 Promo Spesial! Diskon menarik untuk semua produk berkah di Baiturrahman Mart! 🎉')
  const [adImages, setAdImages] = useState<string[]>([])
  const [adCards, setAdCards] = useState<PromoCardItem[]>([])

  // Carousel Preview State
  const [activeSlide, setActiveSlide] = useState(0)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [cardEmoji, setCardEmoji] = useState('🎁')
  const [cardName, setCardName] = useState('')
  const [cardPrice, setCardPrice] = useState('')
  const [cardOriginalPrice, setCardOriginalPrice] = useState('')
  const [cardTag, setCardTag] = useState('PROMO SPESIAL')

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur))
    }, 3000)
  }

  // Populate from settings
  useEffect(() => {
    if (settings) {
      if (settings.ad_title) setAdTitle(settings.ad_title)
      if (settings.ad_desc) setAdDesc(settings.ad_desc)
      if (settings.ad_marquee) setAdMarquee(settings.ad_marquee)
      if (settings.ad_images) {
        try {
          const parsed = JSON.parse(settings.ad_images)
          if (Array.isArray(parsed)) setAdImages(parsed)
        } catch {}
      }
      if (settings.ad_cards) {
        try {
          const parsed = JSON.parse(settings.ad_cards)
          if (Array.isArray(parsed)) setAdCards(parsed)
        } catch {}
      }
    }
  }, [settings])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings-ads'] })
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      showToast('Pengaturan iklan monitor berhasil disimpan!')
    },
    onError: (err: Error) => {
      showToast(`Gagal menyimpan: ${err.message}`, 'error')
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      ad_title: adTitle,
      ad_desc: adDesc,
      ad_marquee: adMarquee,
      ad_images: JSON.stringify(adImages),
      ad_cards: JSON.stringify(adCards),
    })
  }

  // Image Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImgs: string[] = []
    let loadedCount = 0

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`File ${file.name} melebihi batas 2MB. Diabaikan.`, 'error')
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = ev.target?.result as string
        if (result) newImgs.push(result)
        loadedCount++
        if (loadedCount === files.length) {
          setAdImages((prev) => [...prev, ...newImgs])
          showToast(`${newImgs.length} gambar berhasil ditambahkan ke carousel`)
        }
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return
    setAdImages((prev) => [...prev, imageUrlInput.trim()])
    setImageUrlInput('')
    setShowUrlInput(false)
    showToast('URL gambar berhasil ditambahkan ke carousel')
  }

  const handleRemoveImage = (index: number) => {
    setAdImages((prev) => prev.filter((_, i) => i !== index))
    if (activeSlide >= adImages.length - 1) {
      setActiveSlide(Math.max(0, adImages.length - 2))
    }
  }

  const handleClearAllImages = async () => {
    const confirmed = await showConfirmAlert({
      title: 'Hapus Semua Banner?',
      text: 'Hapus semua banner gambar promosi dari carousel monitor customer display?',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal',
      icon: 'warning',
    })
    if (confirmed) {
      setAdImages([])
      setActiveSlide(0)
    }
  }

  // Card Handlers
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardName.trim()) return

    const item: PromoCardItem = {
      emoji: cardEmoji || '🎁',
      name: cardName.trim(),
      price: parseInt(cardPrice, 10) || 0,
      original_price: parseInt(cardOriginalPrice, 10) || undefined,
      promo_tag: cardTag.trim() || undefined,
    }

    setAdCards((prev) => [...prev, item])
    setIsCardModalOpen(false)
    setCardName('')
    setCardPrice('')
    setCardOriginalPrice('')
    setCardTag('PROMO SPESIAL')
    showToast(`Produk promo ${item.name} berhasil ditambahkan!`)
  }

  const handleRemoveCard = (index: number) => {
    setAdCards((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSelectProductForCard = (productId: string) => {
    const p = products.find((x) => x.id === parseInt(productId, 10))
    if (p) {
      setCardName(p.name)
      setCardPrice(String(p.price))
      setCardOriginalPrice(String(Math.round(p.price * 1.15)))
    }
  }

  // Combined Slide Count for Preview
  const totalSlides = adImages.length + adCards.length + 1 // +1 for default banner

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Tv className="w-5 h-5 text-[#8b1538]" />
            <span>Layar Iklan & Promosi Monitor Customer (Dual Display)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Kelola banner gambar carousel, teks berjalan (marquee), dan kartu promo produk untuk monitor pelanggan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/customer"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka Layar Monitor</span>
          </a>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || settingsLoading}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#8b1538] hover:bg-[#6b0f2a] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Banner Carousel & Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Banner Images Carousel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Banner Gambar Carousel Monitor ({adImages.length} Aktif)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Banner grafis yang berotasi otomatis setiap 4.5 detik di monitor customer
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[11px] font-semibold flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Input URL</span>
                </button>
                {adImages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllImages}
                    className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-md text-[11px] font-semibold"
                  >
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>

            {/* Optional URL input */}
            {showUrlInput && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-2 items-center">
                <input
                  type="url"
                  placeholder="https://example.com/promo-banner.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#8b1538]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-[#8b1538] text-white text-xs font-bold rounded-lg"
                >
                  Tambah
                </button>
              </div>
            )}

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#8b1538] hover:bg-rose-50/20 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-slate-200/80 text-slate-600 mx-auto flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-xs font-bold text-slate-700">Pilih berkas banner gambar</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Format PNG, JPG, WebP (Rekomendasi rasio 16:9 atau landscape) • Bisa pilih beberapa berkas sekaligus
              </p>
            </div>

            {/* Carousel Interactive Preview Frame */}
            <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-200 flex items-center justify-center group shadow-inner">
              {adImages.length === 0 ? (
                <div className="text-center p-6 text-slate-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
                  <p className="text-xs font-semibold text-slate-300">Belum Ada Banner Gambar yang Diunggah</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                    Sistem akan otomatis menampilkan Banner Default Promo & Kartu Produk Pilihan jika tidak ada banner gambar.
                  </p>
                </div>
              ) : (
                <>
                  <img
                    src={adImages[activeSlide]}
                    alt={`Banner ${activeSlide + 1}`}
                    className="w-full h-full object-contain"
                  />

                  {/* Navigation Arrows */}
                  {adImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlide((cur) => (cur === 0 ? adImages.length - 1 : cur - 1))
                        }
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlide((cur) => (cur === adImages.length - 1 ? 0 : cur + 1))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 right-3 bg-black/70 text-white px-2.5 py-1 rounded-md text-[10px] font-bold">
                    Slide {activeSlide + 1} / {adImages.length}
                  </div>

                  {/* Dots */}
                  {adImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full">
                      {adImages.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveSlide(i)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === activeSlide ? 'bg-white w-4' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {adImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                {adImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer group ${
                      idx === activeSlide ? 'border-[#8b1538] ring-2 ring-rose-200' : 'border-slate-200'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(idx)
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus gambar ini"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Promo Product Cards Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Kartu Produk Promo Spesial ({adCards.length} Kartu)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Kartu interaktif berdesain modern yang tampil di rotasi carousel monitor
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCardModalOpen(true)}
                className="px-3 py-1.5 bg-[#8b1538] hover:bg-[#6b0f2a] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kartu Promo</span>
              </button>
            </div>

            {/* Cards Grid */}
            {adCards.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">Belum ada kartu produk promo</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tambahkan produk pilihan dengan emoji & diskon khusus untuk menarik perhatian pelanggan di kasir.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {adCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 flex items-start justify-between relative group hover:border-slate-300 transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl shrink-0">
                        {card.emoji || '🎁'}
                      </div>
                      <div>
                        {card.promo_tag && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 mb-1">
                            {card.promo_tag}
                          </span>
                        )}
                        <h5 className="font-bold text-xs text-slate-800 line-clamp-1">{card.name}</h5>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="font-extrabold text-sm text-[#8b1538]">
                            {formatRupiah(card.price)}
                          </span>
                          {card.original_price && card.original_price > card.price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatRupiah(card.original_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCard(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus kartu promo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 Cols): Text, Marquee & Live Simulation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Marquee Settings */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Teks Promosi Berjalan (Running Marquee)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Pita teks berjalan di bagian bawah monitor customer untuk menyapa jemaah atau mengumumkan promo
              </p>
            </div>

            {/* Live Ticker Preview */}
            <div className="overflow-hidden bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase text-amber-800">Preview Ticker:</span>
              </div>
              <div className="overflow-hidden whitespace-nowrap bg-white border border-amber-100 rounded px-3 py-1.5">
                <span className="inline-block animate-[marquee_12s_linear_infinite] text-xs font-bold text-amber-900">
                  {adMarquee || 'Tulis pesan promo berjalan...'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Isi Pesan Running Text</label>
              <textarea
                rows={3}
                value={adMarquee}
                onChange={(e) => setAdMarquee(e.target.value)}
                placeholder="🎉 Promo Spesial! Diskon menarik untuk jemaah Baiturrahman..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Gunakan emoji (🎉, ⚡, 🕌, 🏷️) untuk membuat tampilan lebih menarik bagi pelanggan.
              </p>
            </div>
          </div>

          {/* Title & Description Settings */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-blue-500" />
                <span>Teks Banner Utama Display</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Judul dan pesan sambutan yang tampil pada slide utama layar customer
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Banner Promosi</label>
                <input
                  type="text"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="✨ Promo Pilihan Baiturrahman Mart"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Slogan</label>
                <textarea
                  rows={2}
                  value={adDesc}
                  onChange={(e) => setAdDesc(e.target.value)}
                  placeholder="Belanja berkah & nyaman setiap hari di Toko Masjid..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                />
              </div>
            </div>
          </div>

          {/* Mini Simulated Monitor Box */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold flex items-center gap-1.5 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulasi Layar Dual-Display</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
                {totalSlides} Total Slide
              </span>
            </div>

            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-slate-700/60 pb-2">
                <span className="font-bold text-slate-200">Kiri (58%):</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {adImages.length > 0 ? `${adImages.length} Banner` : 'Default'} + {adCards.length} Kartu Promo
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">Kanan (42%):</span>
                <span className="text-[10px] text-blue-400 font-mono">Keranjang Kasir & QRIS Real-time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modal Tambah Kartu Promo */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Tambah Kartu Produk Promo</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCard} className="p-5 space-y-4">
              {/* Optional Auto-fill from Product Catalog */}
              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Cepat dari Master Produk (Opsional)
                  </label>
                  <select
                    onChange={(e) => handleSelectProductForCard(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      -- Pilih produk untuk isi otomatis --
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatRupiah(p.price)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={cardEmoji}
                    onChange={(e) => setCardEmoji(e.target.value)}
                    placeholder="🎁"
                    className="w-full p-2 text-center text-lg bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#8b1538]"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk Promo</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Contoh: Beras Super 5kg"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Harga Promo (Rp)</label>
                  <input
                    type="number"
                    value={cardPrice}
                    onChange={(e) => setCardPrice(e.target.value)}
                    placeholder="Contoh: 67000"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#8b1538] focus:outline-none focus:border-[#8b1538]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Harga Asli/Coret (Rp)</label>
                  <input
                    type="number"
                    value={cardOriginalPrice}
                    onChange={(e) => setCardOriginalPrice(e.target.value)}
                    placeholder="Contoh: 75000"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 focus:outline-none focus:border-[#8b1538]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tag / Label Badge Promo</label>
                <input
                  type="text"
                  value={cardTag}
                  onChange={(e) => setCardTag(e.target.value)}
                  placeholder="⚡ FLASH SALE / JUMAT BERKAH"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8b1538] hover:bg-[#6b0f2a] text-white rounded-lg text-xs font-bold"
                >
                  Simpan Kartu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Notification Toast */}
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

