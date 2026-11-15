import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#8b1538',
    confirmButtonText: 'OK',
    customClass: {
      popup: 'rounded-2xl shadow-2xl font-sans text-slate-800',
      confirmButton: 'rounded-xl px-5 py-2.5 font-bold',
    },
  })
}

export const showErrorAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#8b1538',
    confirmButtonText: 'Tutup',
    customClass: {
      popup: 'rounded-2xl shadow-2xl font-sans text-slate-800',
      confirmButton: 'rounded-xl px-5 py-2.5 font-bold',
    },
  })
}

export const showWarningAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonColor: '#8b1538',
    confirmButtonText: 'Mengerti',
    customClass: {
      popup: 'rounded-2xl shadow-2xl font-sans text-slate-800',
      confirmButton: 'rounded-xl px-5 py-2.5 font-bold',
    },
  })
}

export const showConfirmAlert = async (options: {
  title: string;
  text: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: 'warning' | 'question' | 'info';
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || 'warning',
    showCancelButton: true,
    confirmButtonColor: '#8b1538',
    cancelButtonColor: '#64748b',
    confirmButtonText: options.confirmButtonText || 'Ya, Lanjutkan',
    cancelButtonText: options.cancelButtonText || 'Batal',
    reverseButtons: true,
    customClass: {
      popup: 'rounded-2xl shadow-2xl font-sans text-slate-800',
      confirmButton: 'rounded-xl px-5 py-2.5 font-bold shadow-xs',
      cancelButton: 'rounded-xl px-5 py-2.5 font-semibold shadow-xs',
    },
  })
  return result.isConfirmed
}

export const showShiftCloseAlert = async (data: {
  shiftId: number | string;
  opening: number;
  cashSales: number;
  qrisSales: number;
  expected: number;
  closing: number;
  discrepancy: number;
}) => {
  const disc = data.discrepancy || 0
  const discText =
    disc > 0
      ? `Lebih Rp ${disc.toLocaleString('id-ID')}`
      : disc < 0
      ? `Kurang Rp ${Math.abs(disc).toLocaleString('id-ID')}`
      : 'Pas (Rp 0)'

  const discColor = disc === 0 ? '#059669' : disc > 0 ? '#2563eb' : '#dc2626'

  return Swal.fire({
    icon: 'success',
    title: `Shift #${data.shiftId} Berhasil Ditutup!`,
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.8; font-family: monospace; padding: 12px 14px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748b;">• Modal Awal:</span>
          <b>Rp ${(data.opening || 0).toLocaleString('id-ID')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748b;">• Penjualan Tunai:</span>
          <b style="color: #059669;">+Rp ${(data.cashSales || 0).toLocaleString('id-ID')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748b;">• Penjualan QRIS:</span>
          <b style="color: #2563eb;">+Rp ${(data.qrisSales || 0).toLocaleString('id-ID')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
          <span style="color: #334155;">• Uang Seharusnya:</span>
          <b>Rp ${(data.expected || 0).toLocaleString('id-ID')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #334155;">• Uang Fisik Diinput:</span>
          <b>Rp ${(data.closing || 0).toLocaleString('id-ID')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-weight: bold;">
          <span>• Selisih Kas:</span>
          <span style="color: ${discColor};">${discText}</span>
        </div>
      </div>
    `,
    confirmButtonColor: '#8b1538',
    confirmButtonText: 'Selesai & OK',
    customClass: {
      popup: 'rounded-2xl shadow-2xl font-sans text-slate-800',
      confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
    },
  })
}

// Global window.alert override fallback
export const initGlobalSweetAlert = () => {
  if (typeof window !== 'undefined') {
    window.alert = (message: any) => {
      Swal.fire({
        title: 'Pemberitahuan',
        text: String(message),
        icon: 'info',
        confirmButtonColor: '#8b1538',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl shadow-2xl font-sans text-slate-800',
          confirmButton: 'rounded-xl px-5 py-2.5 font-bold',
        },
      })
    }
  }
}

export default Swal

