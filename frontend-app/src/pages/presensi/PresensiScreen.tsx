import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  QrCode,
  ArrowLeft,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  User,
  KeyRound,
  Users,
  Check,
  Sparkles,
  Smartphone,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react'
import {
  fetchPresensiQRToken,
  fetchPresensiToday,
  recordPresensi,
  type PresensiQRTokenData,
  type PresensiTodaySummary,
} from '@/services/api'
import { playAttendanceSuccess, playBeep } from '@/utils/audio'

export const PresensiScreen: React.FC = () => {
  const [searchParams] = useSearchParams()
  const isDirectScanMode = searchParams.get('mode') === 'scan' || Boolean(searchParams.get('token'))

  // Main UI Mode
  const [activeTab, setActiveTab] = useState<'qr' | 'manual' | 'today'>(isDirectScanMode ? 'manual' : 'qr')
  const [presensiType, setPresensiType] = useState<'masuk' | 'pulang'>(
    (searchParams.get('type') as 'masuk' | 'pulang') || 'masuk'
  )

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')

  // QR Token & Rotation
  const [qrTokenData, setQrTokenData] = useState<PresensiQRTokenData | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [qrLoading, setQrLoading] = useState<boolean>(true)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  // Real-time Celebratory Notification
  const [recentAttendee, setRecentAttendee] = useState<{
    name: string
    username: string
    type: 'masuk' | 'pulang'
    time: string
  } | null>(null)

  // Today's summary & list
  const [todaySummary, setTodaySummary] = useState<PresensiTodaySummary | null>(null)

  // Manual Form State
  const [usernameInput, setUsernameInput] = useState<string>('')
  const [pinInput, setPinInput] = useState<string>('')
  const [showPin, setShowPin] = useState<boolean>(false)
  const [notesInput, setNotesInput] = useState<string>('')
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string>('')
  const [formSuccessData, setFormSuccessData] = useState<{
    cashierName: string
    username: string
    type: string
    date: string
    time: string
  } | null>(null)

  const pinInputRef = useRef<HTMLInputElement>(null)

  // 1. Clock timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).replace(/\./g, ':') + ' WIB'
      )
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // 2. Fetch initial today summary
  const refreshTodaySummary = async () => {
    try {
      const summary = await fetchPresensiToday()
      setTodaySummary(summary)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    refreshTodaySummary()
  }, [])

  // 3. Dynamic QR Token Loader & Rotation Timer
  const loadNewQRToken = async () => {
    try {
      setQrLoading(true)
      const data = await fetchPresensiQRToken()
      setQrTokenData(data)
      setSecondsRemaining(data.expires_in || 30)
    } catch {
      // Offline fallback
      const fallbackWindow = Math.floor(Date.now() / 30000)
      const token = `QR-${fallbackWindow}-${Math.random().toString(36).substring(2, 10)}`
      setQrTokenData({
        status: 'ok',
        token,
        expires_in: 30 - (Math.floor(Date.now() / 1000) % 30),
        rotation_sec: 30,
        server_time: new Date().toLocaleTimeString('id-ID'),
        public_url: window.location.origin,
      })
      setSecondsRemaining(30)
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    loadNewQRToken()
  }, [])

  // 4. Countdown tick & auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          loadNewQRToken()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 5. Generate Target URL & QR Image
  const computedTargetUrl = React.useMemo(() => {
    const baseUrl = qrTokenData?.public_url || window.location.origin
    const token = qrTokenData?.token || 'DEMO'
    const cleanBase = baseUrl.replace(/\/$/, '')
    return `${cleanBase}/presensi?mode=scan&type=${presensiType}&token=${encodeURIComponent(token)}&t=${Date.now()}`
  }, [qrTokenData, presensiType])

  useEffect(() => {
    let isCancelled = false
    const generateQR = async () => {
      try {
        const darkColor = presensiType === 'masuk' ? '#064e3b' : '#78350f'
        const dataUrl = await QRCode.toDataURL(computedTargetUrl, {
          width: 320,
          margin: 1.5,
          color: {
            dark: darkColor,
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        })
        if (!isCancelled) {
          setQrDataUrl(dataUrl)
        }
      } catch {
        if (!isCancelled) {
          setQrDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=4&data=${encodeURIComponent(
              computedTargetUrl
            )}`
          )
        }
      }
    }
    generateQR()
    return () => {
      isCancelled = true
    }
  }, [computedTargetUrl, presensiType])

  // 6. Realtime Listener: WebSocket & BroadcastChannel for Attendance
  useEffect(() => {
    let ws: WebSocket | null = null
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    const handleAttendanceMessage = (data: {
      cashier_name?: string
      username?: string
      type?: 'masuk' | 'pulang'
      time?: string
    }) => {
      if (data && (data.cashier_name || data.username)) {
        playAttendanceSuccess()
        setRecentAttendee({
          name: data.cashier_name || data.username || 'Kasir',
          username: data.username || '',
          type: data.type || 'masuk',
          time: data.time || new Date().toLocaleTimeString('id-ID'),
        })
        refreshTodaySummary()
        // Auto-dismiss alert after 8 seconds
        setTimeout(() => {
          setRecentAttendee(null)
        }, 8000)
      }
    }

    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'attendance_recorded' && msg.data) {
            handleAttendanceMessage(msg.data)
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // BroadcastChannel support
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('ymb_attendance_channel')
      channel.onmessage = (e) => {
        if (e.data && e.data.type === 'attendance_recorded') {
          handleAttendanceMessage(e.data.data)
        }
      }
    }

    return () => {
      if (ws) ws.close()
      if (channel) channel.close()
    }
  }, [])

  // Copy Link Handler
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(computedTargetUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  // Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!usernameInput.trim()) {
      setFormError('Username / ID Kasir wajib diisi')
      return
    }
    if (!pinInput.trim() || pinInput.length !== 6 || !/^\d{6}$/.test(pinInput)) {
      setFormError('PIN kasir harus berupa 6 angka numerik')
      return
    }

    setFormSubmitting(true)
    try {
      const deviceInfo = `ManualScreen | ${window.navigator.userAgent.substring(0, 40)}`
      const res = await recordPresensi({
        username: usernameInput.trim(),
        pin: pinInput.trim(),
        type: presensiType,
        notes: notesInput.trim() || undefined,
        device_info: deviceInfo,
        token: searchParams.get('token') || qrTokenData?.token,
      })

      playAttendanceSuccess()
      setFormSuccessData({
        cashierName: res.cashier_name || res.username,
        username: res.username,
        type: res.type,
        date: res.date,
        time: res.time,
      })

      // Broadcast to other tabs/kiosks
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ymb_attendance_channel')
        bc.postMessage({
          type: 'attendance_recorded',
          data: {
            cashier_name: res.cashier_name || res.username,
            username: res.username,
            type: res.type,
            time: res.time,
          },
        })
        bc.close()
      }

      refreshTodaySummary()
    } catch (err: unknown) {
      playBeep(false)
      const msg = err instanceof Error ? err.message : 'Gagal mencatat presensi'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  const resetManualForm = () => {
    setPinInput('')
    setNotesInput('')
    setFormSuccessData(null)
    setFormError('')
  }

  // Progress percentage for rotation
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Bar: Masjid Branding & Live Clock */}
      <header className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-0.5 shadow-lg shadow-emerald-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide text-white flex items-center gap-2">
              <span>BAITURRAHMAN MART</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Presensi Digital
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Masjid Jami' Baiturrahman</span>
              <span>&bull;</span>
              <span>Sistem Absensi Otomatis Kasir</span>
            </p>
          </div>
        </div>

        {/* Live WIB Clock */}
        <div className="text-right flex items-center gap-3 bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60">
          <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <div className="text-lg font-black tracking-wider text-emerald-300 font-mono">
              {currentTime || '00:00:00 WIB'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">{currentDate || 'Memuat hari...'}</div>
          </div>
        </div>
      </header>

      {/* Real-time Celebratory Notification (Flashes when attendance arrives) */}
      {recentAttendee && (
        <div className="max-w-xl w-full mx-auto my-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-900/50 border border-emerald-400/40 animate-bounce flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Alhamdulillah! Presensi Berhasil
              </p>
              <h4 className="text-base font-extrabold text-white">
                {recentAttendee.name}{' '}
                <span className="text-xs font-semibold text-emerald-100">(@{recentAttendee.username})</span>
              </h4>
              <p className="text-xs text-emerald-100">
                Tercatat presensi <strong className="uppercase font-bold">{recentAttendee.type}</strong> pada{' '}
                {recentAttendee.time} WIB
              </p>
            </div>
          </div>
          <button
            onClick={() => setRecentAttendee(null)}
            className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/30 flex items-center justify-center text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto my-6 flex-1 flex flex-col justify-center">
        {/* Navigation Tabs & Mode Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="inline-flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'qr'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code Dinamis</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Input Mandiri / Barcode</span>
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'today'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Rekap Hari Ini ({todaySummary?.total || 0})</span>
            </button>
          </div>

          {/* Type Toggle: Masuk vs Pulang */}
          <div className="inline-flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setPresensiType('masuk')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                presensiType === 'masuk'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-yellow-300" />
              <span>☀️ Masuk Shift</span>
            </button>
            <button
              type="button"
              onClick={() => setPresensiType('pulang')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                presensiType === 'pulang'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-amber-200" />
              <span>🌙 Pulang Shift</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Dynamic QR Code Kiosk Display */}
        {activeTab === 'qr' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Col: QR Code Box */}
            <div className="md:col-span-6 flex flex-col items-center">
              <div className="relative group">
                {/* Glow ring */}
                <div
                  className={`absolute -inset-2 rounded-3xl opacity-75 blur-xl transition duration-1000 group-hover:opacity-100 ${
                    presensiType === 'masuk'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                      : 'bg-gradient-to-r from-amber-600 to-orange-500'
                  }`}
                />

                {/* QR Canvas Box */}
                <div className="relative bg-white p-5 rounded-2xl shadow-2xl border-4 border-slate-800 flex flex-col items-center">
                  {qrLoading ? (
                    <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                      <p className="text-xs font-semibold">Menyiapkan QR Dinamis...</p>
                    </div>
                  ) : (
                    <img
                      src={qrDataUrl}
                      alt="QR Dinamis Presensi"
                      className="w-64 h-64 object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                    />
                  )}

                  {/* Anti-fraud Token Badge */}
                  <div className="mt-3 w-full flex items-center justify-between text-[11px] font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                    <span>TOKEN: {qrTokenData?.token?.substring(0, 14)}...</span>
                    <span className="font-bold text-emerald-600">AKTIF</span>
                  </div>
                </div>
              </div>

              {/* Progress Countdown Bar */}
              <div className="w-full max-w-xs mt-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className={`w-3 h-3 text-emerald-400 ${secondsRemaining <= 5 ? 'animate-spin' : ''}`} />
                    <span>Rotasi Token Otomatis</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{secondsRemaining} detik</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                      secondsRemaining <= 5
                        ? 'bg-rose-500'
                        : presensiType === 'masuk'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Col: Instructions & Live Verification Guide */}
            <div className="md:col-span-6 space-y-4">
              <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/70 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h3 className="font-bold text-base text-white">Presensi Aman & Anti-Kecurangan</h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Kode QR ini <strong>berubah secara dinamis setiap 30 detik</strong> untuk mencegah manipulasi absensi
                  seperti titip absen atau screenshot foto dari luar toko.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-white">Buka Kamera Smartphone</p>
                      <p className="text-slate-400 mt-0.5">
                        Arahkan kamera HP kasir atau aplikasi scanner ke QR Code di samping.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-white">Masukkan ID & PIN Kasir</p>
                      <p className="text-slate-400 mt-0.5">
                        Ketik 6 digit PIN kasir pada halaman yang terbuka untuk konfirmasi.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-white">Verifikasi Otomatis Seketika</p>
                      <p className="text-slate-400 mt-0.5">
                        Layar ini akan otomatis berbunyi dan menampilkan notifikasi kehadiran Anda.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Link & Copy Helper */}
                <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-600/60"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Tautan Tersalin!' : 'Salin Tautan Presensi'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('manual')}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Form di Sini</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Direct Attendance Form (Untuk kasir tanpa smartphone / scanner badge fisik) */}
        {activeTab === 'manual' && (
          <div className="max-w-md w-full mx-auto">
            <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-700/70 shadow-2xl space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-white">Form Kehadiran Kasir</h3>
                <p className="text-xs text-slate-400">
                  Konfirmasi presensi kasir langsung melalui layar ini atau scanner barcode
                </p>
              </div>

              {/* Success Result View */}
              {formSuccessData ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Presensi Berhasil Dicatat!</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Data kehadiran shift kerja Anda telah tersimpan rapi di sistem database.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 rounded-xl p-4 text-left border border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Nama Kasir</span>
                      <span className="font-bold text-white">{formSuccessData.cashierName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Username</span>
                      <span className="font-mono text-slate-300">{formSuccessData.username}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Jenis Shift</span>
                      <span
                        className={`font-bold uppercase ${
                          formSuccessData.type === 'masuk' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {formSuccessData.type}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Tanggal</span>
                      <span className="text-slate-200">{formSuccessData.date}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Waktu Tercatat</span>
                      <span className="font-bold text-emerald-300 font-mono">{formSuccessData.time} WIB</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetManualForm}
                    className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Presensi Lagi
                  </button>
                </div>
              ) : (
                /* Form Inputs */
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* ID Kasir */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Username / ID Kasir</span>
                    </label>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Contoh: kasir1 / scan barcode badge"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* PIN Kasir */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>PIN Kasir (6 Digit Angka)</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={pinInputRef}
                        type={showPin ? 'text' : 'password'}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        placeholder="••••••"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 tracking-widest font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Catatan Shift (Opsional) */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Catatan Shift (Opsional)</label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Contoh: Shift 1 Pagi / Tukar Jam"
                      className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className={`w-full py-3 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                      presensiType === 'masuk'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-950/50'
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-950/50'
                    }`}
                  >
                    {formSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      {formSubmitting
                        ? 'Memproses...'
                        : presensiType === 'masuk'
                        ? 'Konfirmasi Presensi Masuk'
                        : 'Konfirmasi Presensi Pulang'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Today's Attendance Roll */}
        {activeTab === 'today' && (
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/70 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Rekap Presensi Kasir Hari Ini</h3>
              </div>
              <button
                onClick={refreshTodaySummary}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                title="Segarkan data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Total Presensi</p>
                <h4 className="text-xl font-bold text-white mt-0.5">{todaySummary?.total || 0}</h4>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                  <Sun className="w-3 h-3" />
                  <span>Kasir Masuk</span>
                </p>
                <h4 className="text-xl font-bold text-emerald-300 mt-0.5">{todaySummary?.masuk || 0}</h4>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                <p className="text-[11px] text-amber-400 font-medium flex items-center justify-center gap-1">
                  <Moon className="w-3 h-3" />
                  <span>Kasir Pulang</span>
                </p>
                <h4 className="text-xl font-bold text-amber-300 mt-0.5">{todaySummary?.pulang || 0}</h4>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700/80 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Kasir</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {todaySummary?.list && todaySummary.list.length > 0 ? (
                    todaySummary.list.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-700/30">
                        <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">{rec.time}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white">{rec.cashier_name}</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">(@{rec.username})</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rec.type === 'masuk'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {rec.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{rec.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                        Belum ada data presensi kasir hari ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="max-w-4xl w-full mx-auto pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <Link
          to="/kasir"
          className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Layar Kasir (POS)</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/admin" className="hover:text-slate-200 transition-colors">
            Panel Admin
          </Link>
          <span>&bull;</span>
          <span className="text-slate-500">YMB Mart POS v2.2</span>
        </div>
      </footer>
    </div>
  )
}
