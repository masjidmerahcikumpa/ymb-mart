import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDailyReport, type DailyReportData } from '@/services/api'
import { formatRupiah } from '@/utils/currency'
import {
  Calendar,
  TrendingUp,
  CreditCard,
  CircleDollarSign,
  HeartHandshake,
  Printer,
  Download,
  AlertTriangle,
  Clock,
  Award,
  RefreshCw,
} from 'lucide-react'

export const DailyReportView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useRange, setUseRange] = useState(false)

  // Query Daily Report
  const { data: report, isLoading, refetch } = useQuery<DailyReportData>({
    queryKey: ['daily-report', useRange ? `${startDate}_${endDate}` : selectedDate],
    queryFn: () => {
      if (useRange && startDate && endDate) {
        return fetchDailyReport({ start_date: startDate, end_date: endDate })
      }
      return fetchDailyReport({ date: selectedDate })
    },
    refetchInterval: 60000,
  })

  // Export CSV
  const handleExportCSV = () => {
    if (!report) return
    const rows = [
      ['LAPORAN REKAP PENJUALAN - BAITURRAHMAN MART'],
      ['Periode', report.date],
      [''],
      ['RINGKASAN EKSEKUTIF'],
      ['Total Penjualan (Bruto)', report.total_sales],
      ['Total Transaksi', report.total_tx],
      ['Estimasi Laba Kotor', report.total_profit],
      ['Penjualan Tunai (CASH)', report.cash_sales],
      ['Penjualan QRIS', report.qris_sales],
      ['Penjualan Transfer', report.tf_sales],
      ['Total Diskon', report.total_discount],
      ['Total Infaq Masjid', report.total_tax],
      [''],
      ['TOP 10 PRODUK TERLARIS'],
      ['Nama Produk', 'Jumlah Terjual (Qty)', 'Total Pendapatan (Rp)'],
      ...(report.top_items || []).map((it) => [it.name, it.qty, it.revenue]),
    ]

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `rekap_penjualan_${report.date.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-daily-report, #print-daily-report * {
            visibility: visible;
          }
          #print-daily-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Filter & Action Controls */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setUseRange(false)}
              className={`px-3 py-1.5 rounded-md transition ${
                !useRange ? 'bg-white shadow-2xs text-[#8b1538]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Harian (Tunggal)
            </button>
            <button
              onClick={() => setUseRange(true)}
              className={`px-3 py-1.5 rounded-md transition ${
                useRange ? 'bg-white shadow-2xs text-[#8b1538]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Rentang Tanggal
            </button>
          </div>

          {!useRange ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-slate-400">DARI:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                />
              </div>
              <span className="text-slate-400 text-xs">s/d</span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-slate-400">SAMPAI:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
            title="Perbarui data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!report || report.total_tx === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap / Tutup Buku</span>
          </button>
        </div>
      </div>

      {/* Printable Report Wrapper */}
      <div id="print-daily-report" className="space-y-6">
        {/* Printable Letterhead Header */}
        <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#8b1538] rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-xs">
              🕌
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                BAITURRAHMAN MART
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Yayasan Masjid Jami' Baiturrahman • Sukmajaya, Depok
              </p>
              <p className="text-xs font-bold text-[#8b1538] mt-0.5">
                LAPORAN REKAPITULASI PENJUALAN & TUTUP BUKU
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Periode Laporan:</span>
            <span className="text-base font-black text-slate-900 font-mono">
              {report?.date || selectedDate}
            </span>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Omzet */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Omzet Bruto</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-emerald-700 font-mono">
              {formatRupiah(report?.total_sales || 0)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Dari <span className="font-bold text-slate-700">{report?.total_tx || 0}</span> transaksi
            </p>
          </div>

          {/* Laba Kotor */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Estimasi Laba Kotor</span>
              <CircleDollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-blue-700 font-mono">
              {formatRupiah(report?.total_profit || 0)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Selisih harga jual vs modal pokok</p>
          </div>

          {/* Metode Pembayaran */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Metode Pembayaran</span>
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <div className="space-y-0.5 text-xs font-mono font-bold mt-2">
              <div className="flex justify-between text-emerald-700">
                <span>Tunai:</span>
                <span>{formatRupiah(report?.cash_sales || 0)}</span>
              </div>
              <div className="flex justify-between text-purple-700">
                <span>QRIS:</span>
                <span>{formatRupiah(report?.qris_sales || 0)}</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>Transfer:</span>
                <span>{formatRupiah(report?.tf_sales || 0)}</span>
              </div>
            </div>
          </div>

          {/* Infaq & Diskon */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Infaq & Diskon</span>
              <HeartHandshake className="w-4 h-4 text-rose-600" />
            </div>
            <div className="space-y-1 text-xs font-mono font-bold mt-2">
              <div className="flex justify-between text-emerald-700">
                <span>Donasi Infaq:</span>
                <span>+{formatRupiah(report?.total_tax || 0)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Potongan Diskon:</span>
                <span>-{formatRupiah(report?.total_discount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 10 Selling Products & Hourly Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                10 Produk Paling Laris
              </h4>
            </div>
            <div className="p-4">
              {(!report?.top_items || report.top_items.length === 0) ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  Belum ada produk terjual pada periode ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {report.top_items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{it.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Terjual: <span className="font-bold text-slate-700">{it.qty} unit</span>
                          </p>
                        </div>
                      </div>
                      <span className="font-bold font-mono text-slate-900">
                        {formatRupiah(it.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hourly Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Distribusi Penjualan per Jam / Periode
              </h4>
            </div>
            <div className="p-4 overflow-y-auto max-h-[360px]">
              {(!report?.hourly || report.hourly.length === 0) ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  Belum ada aktivitas transaksi pada jam ini.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="pb-2">Waktu / Jam</th>
                      <th className="pb-2 text-center">Jumlah Transaksi</th>
                      <th className="pb-2 text-right">Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {report.hourly.map((hr, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-700">{hr.hour}</td>
                        <td className="py-2 text-center text-slate-600">{hr.tx_count} struk</td>
                        <td className="py-2 text-right font-bold text-slate-900">
                          {formatRupiah(hr.sales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Warning Alert */}
        {report?.low_stock && report.low_stock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="font-bold text-xs text-amber-900">
                Perhatian: {report.low_stock.length} Produk Mencapai Batas Stok Kritis (&lt; 10 unit)
              </h5>
              <div className="flex flex-wrap gap-2 mt-2">
                {report.low_stock.slice(0, 8).map((ls, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-amber-800"
                  >
                    {ls.name}: <b className="text-rose-600">{ls.stock}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Verification Signature Sign-off (for Print) */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-12">Kasir Bertugas,</p>
            <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[140px]">
              ( .................................... )
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-12">Supervisor Toko,</p>
            <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[140px]">
              ( .................................... )
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-12">Pengurus DKM / Yayasan,</p>
            <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[140px]">
              ( .................................... )
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
