import type { POSCartItem } from '@/types/transaction'

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('ymb_pos_channel')
  : null

export function broadcastCustomerDisplay(type: string, data: any) {
  const payload = { type, data }

  // 1. Local BroadcastChannel (instant dual-monitor on same machine)
  if (channel) {
    try {
      channel.postMessage(payload)
    } catch (e) {
      console.warn('[CustomerDisplay] BroadcastChannel error:', e)
    }
  }

  // 2. Server WebSocket Broadcast (networked dual-screen / external tablet)
  fetch('/api/ws-broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Ignore network failure for background broadcast
  })
}

export function broadcastCartUpdate(
  items: POSCartItem[],
  total: number,
  cashier = 'Kasir',
  member = '-'
) {
  const simplifiedItems = items.map((it) => ({
    name: it.product.name,
    qty: it.qty,
    price: it.price,
    subtotal: it.subtotal,
  }))

  broadcastCustomerDisplay('cart_update', {
    items: simplifiedItems,
    total,
    cashier,
    member,
  })
}

export function broadcastShowQRIS(total: number, qrUrl: string, storeName = 'Baiturrahman Mart') {
  broadcastCustomerDisplay('show_qris', {
    total,
    qr_url: qrUrl,
    store_name: storeName,
  })
}

export function broadcastHideQRIS() {
  broadcastCustomerDisplay('hide_qris', {})
}

export function broadcastNewTransaction(tx: {
  grand_total: number
  payment: string
  amount_paid?: number
  change?: number
  cashier?: string
  member?: string
  items?: { name: string; qty: number; price: number }[]
}) {
  broadcastCustomerDisplay('new_transaction', tx)
}

export function broadcastResetDisplay(cashier = 'Kasir') {
  broadcastCustomerDisplay('reset_display', { cashier })
}

