export function formatRupiah(value: number | string | undefined | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : value || 0
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function parseRupiah(str: string): number {
  const clean = str.replace(/[^0-9]/g, '')
  return parseInt(clean, 10) || 0
}

